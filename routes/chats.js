const express = require('express');
const jwt = require('jsonwebtoken');

// A helper function to get the userId from the token
const getUserIdFromToken = (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            return decoded.userId;
        } catch (err) {
            return null;
        }
    }
    return null;
};

module.exports = (dbPool) => {
  const router = express.Router();

  // GET /api/chats - Get all chats for the current user
  router.get('/chats', async (req, res) => {
    const userId = getUserIdFromToken(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
      const [rows] = await dbPool.execute(
        `SELECT c.chatId, c.lastMessage, c.lastUpdated, 
         u.userId as otherUserId, u.username as otherUsername, u.profilePictureUrl as otherProfilePic
         FROM Chats c
         JOIN ChatParticipants cp ON c.chatId = cp.chatId
         JOIN Users u ON cp.userId = u.userId
         WHERE c.chatId IN (SELECT chatId FROM ChatParticipants WHERE userId = ?) AND cp.userId != ?
         ORDER BY c.lastUpdated DESC`,
        [userId, userId]
      );
      res.json(rows);
    } catch (error) {
      console.error('Error fetching chats:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // GET /api/chats/:chatId/messages - Get messages for a specific chat
  router.get('/chats/:chatId/messages', async (req, res) => {
    const userId = getUserIdFromToken(req);
    const { chatId } = req.params;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
      // First, verify the user is a participant of the chat
      const [participation] = await dbPool.execute(
          'SELECT * FROM ChatParticipants WHERE chatId = ? AND userId = ?',
          [chatId, userId]
      );
      if (participation.length === 0) {
          return res.status(403).json({ message: 'You are not a member of this chat.' });
      }

      // If they are, fetch the messages
      const [messages] = await dbPool.execute(
        'SELECT * FROM Messages WHERE chatId = ? ORDER BY createdAt ASC',
        [chatId]
      );
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  return router;
};
