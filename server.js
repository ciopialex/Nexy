require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // In production, restrict this to your frontend's domain
  }
});

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files from 'public' directory

// --- MySQL Connection Pool ---
const dbPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const onlineUsers = {}; // Object to track online users

module.exports = {
    app,
    io,
    onlineUsers
};

// --- API Routes ---
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/uploads');
const requestRoutes = require('./routes/requests');
const chatRoutes = require('./routes/chats');
const userRoute = require('./routes/user');
app.use('/api', authRoutes(dbPool));
app.use('/api', userRoutes(dbPool));
app.use('/api', uploadRoutes(dbPool, io));
app.use('/api', requestRoutes(dbPool));
app.use('/api', chatRoutes(dbPool));
app.use('/api/user', userRoute(dbPool));

// --- Socket.IO Connection Handling ---
io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);

  socket.on('setOnline', (userId) => {
    onlineUsers[userId] = socket.id;
    io.emit('onlineStatusUpdate', onlineUsers);
  });

  socket.on('sendMessage', async (data) => {
    const { chatId, senderId, content } = data;
    try {
      const [result] = await dbPool.execute(
        'INSERT INTO Messages (chatId, senderId, content) VALUES (?, ?, ?)',
        [chatId, senderId, content]
      );
      // Also update the chat's last message
      await dbPool.execute(
        'UPDATE Chats SET lastMessage = ? WHERE chatId = ?',
        [content, chatId]
      );

      const newMessage = { 
          messageId: result.insertId, 
          chatId, 
          senderId, 
          content, 
          createdAt: new Date().toISOString() 
      };
      io.to(chatId).emit('newMessage', newMessage);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  socket.on('markAsSeen', async (data) => {
    const { messageId, userId } = data;
    try {
      await dbPool.execute(
        'INSERT INTO MessageReceipts (messageId, userId) VALUES (?, ?)',
        [messageId, userId]
      );
    } catch (error) {
      // Ignore duplicate entry errors, which are expected
      if (error.code !== 'ER_DUP_ENTRY') {
          console.error('Error marking message as seen:', error);
      }
    }
  });

  socket.on('markMessagesAsRead', async (data) => {
    const { chatId, userId } = data;
    try {
      // Update the database
      await dbPool.execute(
        "UPDATE Messages SET status = 'seen' WHERE chatId = ? AND senderId != ? AND status != 'seen'",
        [chatId, userId]
      );

      // Notify the other user
      const [participants] = await dbPool.execute('SELECT userId FROM ChatParticipants WHERE chatId = ? AND userId != ?', [chatId, userId]);
      if (participants.length > 0) {
        const otherUserId = participants[0].userId;
        const otherUserSocketId = onlineUsers[otherUserId];
        if (otherUserSocketId) {
          io.to(otherUserSocketId).emit('messagesWereRead', { chatId });
        }
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });

  socket.on('deleteMessage', async (data) => {
    const { messageId, chatId, userId } = data;
    try {
      // First, verify the user is the sender
      const [rows] = await dbPool.execute('SELECT senderId FROM Messages WHERE messageId = ?', [messageId]);
      if (rows.length === 0 || rows[0].senderId !== userId) {
        return; // Silently fail if user is not the sender
      }

      await dbPool.execute(
        "UPDATE Messages SET content = 'This message was deleted.', imageUrl = NULL, isEdited = TRUE WHERE messageId = ?",
        [messageId]
      );

      const updatedMessage = { messageId, chatId, content: 'This message was deleted.', isEdited: true };
      io.to(chatId).emit('messageUpdated', updatedMessage);

    } catch (error) {
      console.error('Error deleting message:', error);
    }
  });

  socket.on('editMessage', async (data) => {
    const { messageId, chatId, userId, newContent } = data;
    try {
      const [rows] = await dbPool.execute('SELECT senderId FROM Messages WHERE messageId = ?', [messageId]);
      if (rows.length === 0 || rows[0].senderId !== userId) {
        return; // Silently fail if user is not the sender
      }

      await dbPool.execute(
        "UPDATE Messages SET content = ?, isEdited = TRUE WHERE messageId = ?",
        [newContent, messageId]
      );

      const updatedMessage = { messageId, chatId, content: newContent, isEdited: true };
      io.to(chatId).emit('messageUpdated', updatedMessage);

    } catch (error) {
      console.error('Error editing message:', error);
    }
  });

  socket.on('joinChat', (chatId) => {
    socket.join(chatId);
    console.log(`Socket ${socket.id} joined chat ${chatId}`);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
    // Remove user from onlineUsers and broadcast change
    for (const userId in onlineUsers) {
      if (onlineUsers[userId] === socket.id) {
        delete onlineUsers[userId];
        break;
      }
    }
    io.emit('onlineStatusUpdate', onlineUsers);
  });
});

// --- Server Startup ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
