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

  // POST /api/requests - Send a chat request
  router.post('/requests', async (req, res) => {
    const senderId = getUserIdFromToken(req);
    const { receiverId } = req.body;

    if (!senderId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    if (!receiverId) {
        return res.status(400).json({ message: 'Receiver ID is required.' });
    }
    if (senderId === receiverId) {
        return res.status(400).json({ message: 'You cannot send a request to yourself.' });
    }

    try {
      await dbPool.execute(
        'INSERT INTO ChatRequests (senderId, receiverId) VALUES (?, ?)',
        [senderId, receiverId]
      );
      res.status(201).json({ message: 'Chat request sent successfully.' });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Request already sent.' });
      }
      console.error('Error sending chat request:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // GET /api/requests - Get pending requests for the logged-in user
  router.get('/requests', async (req, res) => {
    const userId = getUserIdFromToken(req);
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const [rows] = await dbPool.execute(
        `SELECT cr.id, u.userId, u.username, u.profilePictureUrl 
         FROM ChatRequests cr 
         JOIN Users u ON cr.senderId = u.userId 
         WHERE cr.receiverId = ? AND cr.status = 'pending'`,
        [userId]
      );
      res.json(rows);
    } catch (error) {
      console.error('Error fetching chat requests:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // PUT /api/requests/:id - Accept or decline a request
  router.put('/requests/:id', async (req, res) => {
    const userId = getUserIdFromToken(req);
    const { id } = req.params;
    const { status } = req.body; // 'accepted' or 'declined'

    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    if (!status || !['accepted', 'declined'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status.' });
    }

    let connection;
    try {
        connection = await dbPool.getConnection();
        await connection.beginTransaction();

        // 1. Check if the user is the receiver of the request
        const [requestRows] = await connection.execute('SELECT * FROM ChatRequests WHERE id = ? AND receiverId = ?', [id, userId]);
        const request = requestRows[0];

        if (!request) {
            await connection.rollback();
            return res.status(404).json({ message: 'Request not found or you are not authorized to modify it.' });
        }

        // 2. Update the request status
        await connection.execute('UPDATE ChatRequests SET status = ? WHERE id = ?', [status, id]);

        // 3. If accepted, create a new chat
        if (status === 'accepted') {
            const [chatResult] = await connection.execute('INSERT INTO Chats (isGroupChat) VALUES (?)', [false]);
            const chatId = chatResult.insertId;

            await connection.execute(
                'INSERT INTO ChatParticipants (chatId, userId) VALUES (?, ?), (?, ?)',
                [chatId, request.senderId, chatId, request.receiverId]
            );
        }

        await connection.commit();
        res.json({ message: `Request ${status}.` });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error updating chat request:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        if (connection) connection.release();
    }
  });

  return router;
};

