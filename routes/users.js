const express = require('express');
const auth = require('../middleware/auth');

/**
 * USER ROUTES
 * 
 * This file handles all user-related API endpoints:
 * 1. GET /api/users/search - Search for users by handle/username
 * 2. GET /api/user - Get the currently logged-in user's profile
 */
module.exports = (dbPool) => {
    const router = express.Router();

    // ============================================
    // SEARCH USERS
    // Used when you want to find someone to chat with
    // ============================================
    router.get('/users/search', async (req, res) => {
        const { handle } = req.query;

        if (!handle) {
            return res.status(400).json({ message: 'Search handle is required.' });
        }

        // Remove '@' if user included it (e.g., "@john" becomes "john")
        const searchTerm = handle.startsWith('@') ? handle.substring(1) : handle;

        try {
            // Search both username and handle columns with a LIKE query
            const [rows] = await dbPool.execute(
                'SELECT userId, username, handle, profilePictureUrl FROM Users WHERE username LIKE ? OR handle LIKE ? LIMIT 10',
                [`%${searchTerm}%`, `%${searchTerm}%`]
            );
            res.json(rows);
        } catch (error) {
            console.error('User search error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    });

    // ============================================
    // GET CURRENT USER PROFILE
    // Protected route - requires valid JWT token
    // ============================================
    router.get('/user', auth, async (req, res) => {
        try {
            // req.user.userId comes from the auth middleware (decoded from JWT)
            const [rows] = await dbPool.execute(
                'SELECT userId, username, email, profilePictureUrl FROM Users WHERE userId = ?',
                [req.user.userId]
            );
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
