const express = require('express');
const auth = require('../middleware/auth');

module.exports = (dbPool) => {
    const router = express.Router();

    router.get('/', auth, async (req, res) => {
        try {
            const [rows] = await dbPool.execute('SELECT userId, username, email, profilePictureUrl FROM Users WHERE userId = ?', [req.user.userId]);
            const user = rows[0];
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json(user);
        } catch (error) {
            console.error('Get user error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    });

    return router;
};