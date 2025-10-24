
const express = require('express');

module.exports = (dbPool) => {
  const router = express.Router();

  // GET /api/users/search?handle=@alex
  router.get('/users/search', async (req, res) => {
      const { handle } = req.query;

      if (!handle) {
          return res.status(400).json({ message: 'Search handle is required.' });
      }

      const searchTerm = handle.startsWith('@') ? handle.substring(1) : handle;

      try {
          const [rows] = await dbPool.execute(
              'SELECT userId, username, profilePictureUrl FROM Users WHERE username LIKE ? LIMIT 10',
              [`%${searchTerm}%`]
          );
          res.json(rows);
      } catch (error) {
          console.error('User search error:', error);
          res.status(500).json({ message: 'Internal server error' });
      }
  });

  return router;
};
