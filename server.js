// Nexy Server - Simple Chat Backend
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql2/promise');
const cors = require('cors');

// ===== SETUP =====
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database connection
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Track who's online
const onlineUsers = {};

// ===== ROUTES =====
// Load route files and pass them what they need
app.use('/api', require('./routes/auth')(db));
app.use('/api', require('./routes/users')(db));
app.use('/api', require('./routes/uploads')(db, io));
app.use('/api', require('./routes/requests')(db, io, onlineUsers));
app.use('/api', require('./routes/chats')(db));

// ===== REAL-TIME CHAT (Socket.IO) =====
io.on('connection', socket => {
  console.log('User connected:', socket.id);

  // When user logs in, track them and join their chat rooms
  socket.on('setOnline', async userId => {
    onlineUsers[userId] = socket.id;
    io.emit('onlineStatusUpdate', onlineUsers);

    // Auto-join all their existing chats (convert chatId to string for room name)
    const [chats] = await db.execute('SELECT chatId FROM ChatParticipants WHERE userId = ?', [userId]);
    chats.forEach(c => {
      socket.join(String(c.chatId));
      console.log(`User ${userId} auto-joined room ${c.chatId}`);
    });
  });

  // Join a specific chat room (convert to string)
  socket.on('joinChat', chatId => {
    socket.join(String(chatId));
    console.log(`Socket ${socket.id} joined chat ${chatId}`);
  });
  socket.on('joinNewChat', chatId => {
    socket.join(String(chatId));
    console.log(`Socket ${socket.id} joined NEW chat ${chatId}`);
  });

  // Send a message
  socket.on('sendMessage', async ({ chatId, senderId, content }) => {
    console.log(`Message from user ${senderId} to chat ${chatId}: ${content}`);

    // Save to database
    const [result] = await db.execute(
      'INSERT INTO Messages (chatId, senderId, content) VALUES (?, ?, ?)',
      [chatId, senderId, content]
    );
    await db.execute('UPDATE Chats SET lastMessage = ? WHERE chatId = ?', [content, chatId]);

    // Get sender info
    const [users] = await db.execute('SELECT username FROM Users WHERE userId = ?', [senderId]);

    // Broadcast to everyone in the chat (use String for room name)
    const roomName = String(chatId);
    console.log(`Broadcasting to room ${roomName}`);
    io.to(roomName).emit('newMessage', {
      messageId: result.insertId,
      chatId,
      senderId,
      content,
      createdAt: new Date().toISOString(),
      sender: users[0]
    });
  });

  // Edit a message
  socket.on('editMessage', async ({ messageId, chatId, userId, newContent }) => {
    // Verify sender owns the message
    const [rows] = await db.execute('SELECT senderId FROM Messages WHERE messageId = ?', [messageId]);
    if (rows[0]?.senderId !== userId) return;

    await db.execute('UPDATE Messages SET content = ?, isEdited = TRUE WHERE messageId = ?', [newContent, messageId]);
    io.to(String(chatId)).emit('messageUpdated', { messageId, chatId, content: newContent, isEdited: true });
  });

  // Delete a message
  socket.on('deleteMessage', async ({ messageId, chatId, userId }) => {
    const [rows] = await db.execute('SELECT senderId FROM Messages WHERE messageId = ?', [messageId]);
    if (rows[0]?.senderId !== userId) return;

    await db.execute("UPDATE Messages SET content = 'This message was deleted.', imageUrl = NULL, isEdited = TRUE WHERE messageId = ?", [messageId]);
    // Broadcast update - clear content and setting deleted text
    io.to(String(chatId)).emit('messageUpdated', { messageId, chatId, content: 'This message was deleted.', isEdited: true, imageUrl: null });
  });

  // Mark messages as read
  socket.on('markMessagesAsRead', async ({ chatId, userId }) => {
    await db.execute("UPDATE Messages SET status = 'seen' WHERE chatId = ? AND senderId != ? AND status != 'seen'", [chatId, userId]);

    // Notify the other person
    const [participants] = await db.execute('SELECT userId FROM ChatParticipants WHERE chatId = ? AND userId != ?', [chatId, userId]);
    if (participants[0] && onlineUsers[participants[0].userId]) {
      io.to(onlineUsers[participants[0].userId]).emit('messagesWereRead', { chatId });
    }
  });

  // User disconnects
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const id in onlineUsers) {
      if (onlineUsers[id] === socket.id) {
        delete onlineUsers[id];
        break;
      }
    }
    io.emit('onlineStatusUpdate', onlineUsers);
  });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
