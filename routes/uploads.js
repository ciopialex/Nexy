
const express = require('express');
const multer = require('multer');
const path = require('path');

module.exports = (dbPool, io) => {
  const router = express.Router();

  // --- Multer Storage Configuration ---
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
  });

  const upload = multer({ storage: storage });

  // POST /api/upload
  router.post('/upload', upload.single('image'), async (req, res) => {
      const { type, userId, chatId } = req.body; // type can be 'profile' or 'chat'
      const imageUrl = `/uploads/${req.file.filename}`;

      if (!type || !req.file) {
          return res.status(400).json({ message: 'Upload type and file are required.' });
      }

      try {
          if (type === 'profile') {
              if (!userId) return res.status(400).json({ message: 'User ID is required for profile picture updates.' });
              await dbPool.execute('UPDATE Users SET profilePictureUrl = ? WHERE userId = ?', [imageUrl, userId]);
              res.json({ message: 'Profile picture updated successfully.', imageUrl });

          } else if (type === 'chat') {
              if (!chatId || !userId) return res.status(400).json({ message: 'Chat ID and Sender ID are required for chat images.' });
              const [result] = await dbPool.execute(
                  'INSERT INTO Messages (chatId, senderId, imageUrl) VALUES (?, ?, ?)',
                  [chatId, userId, imageUrl]
              );
              // Also update the chat's last message
              await dbPool.execute(
                'UPDATE Chats SET lastMessage = ? WHERE chatId = ?',
                ['📷 Image', chatId]
              );

              const newMessage = {
                  messageId: result.insertId,
                  chatId,
                  senderId: userId,
                  imageUrl,
                  createdAt: new Date().toISOString()
              };
              io.to(chatId).emit('newMessage', newMessage);

              res.status(201).json({ message: 'Image sent successfully', ...newMessage });
          } else {
              res.status(400).json({ message: 'Invalid upload type.' });
          }
      } catch (error) {
          console.error('File upload error:', error);
          res.status(500).json({ message: 'Internal server error' });
      }
  });

  return router;
};
