const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generateDefaultPfp } = require('../utils/default-pfp');

/**
 * AUTHENTICATION ROUTES
 * 
 * This file handles user registration and login.
 * 
 * HOW IT WORKS:
 * 1. User sends username/email/password
 * 2. For registration: password is "hashed" (scrambled) before saving
 * 3. For login: we compare the hashed password
 * 4. If successful, we give the user a JWT "token" (like an ID card)
 */
module.exports = (dbPool) => {
  const router = express.Router();
  const SALT_ROUNDS = 10; // How many times to scramble the password

  // ============================================
  // REGISTER NEW USER
  // POST /api/register
  // ============================================
  router.post('/register', async (req, res) => {
    const { username, email, password, handle } = req.body;

    // Check that all required fields are provided
    if (!username || !email || !password || !handle) {
      return res.status(400).json({ message: 'Username, email, handle, and password are required.' });
    }

    try {
      // Hash the password (never store plain text passwords!)
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      // Insert the new user into the database
      const [result] = await dbPool.execute(
        'INSERT INTO Users (username, email, passwordHash, handle) VALUES (?, ?, ?, ?)',
        [username, email, hashedPassword, handle]
      );

      // Generate a colorful default profile picture
      const userId = result.insertId;
      const profilePictureUrl = generateDefaultPfp(userId);
      await dbPool.execute('UPDATE Users SET profilePictureUrl = ? WHERE userId = ?', [profilePictureUrl, userId]);

      res.status(201).json({ message: 'User registered successfully', userId });
    } catch (error) {
      // Handle duplicate username/email error
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Username or email already exists.' });
      }
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // POST /api/login
  router.post('/login', async (req, res) => {
    console.log('Login request received:', req.body);
    const { loginIdentifier, password } = req.body;

    if (!loginIdentifier || !password) {
      return res.status(400).json({ message: 'Email/Handle and password are required.' });
    }

    // Remove '@' if the user included it in their handle
    const cleanIdentifier = loginIdentifier.startsWith('@') ? loginIdentifier.slice(1) : loginIdentifier;

    try {
      const [rows] = await dbPool.execute('SELECT * FROM Users WHERE email = ? OR handle = ? OR username = ?', [cleanIdentifier, cleanIdentifier, cleanIdentifier]);
      const user = rows[0];
      console.log('User from DB:', user);

      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      console.log('Password match:', isMatch);

      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      const token = jwt.sign({ userId: user.userId, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.json({
        message: 'Login successful',
        token,
        user: {
          userId: user.userId,
          username: user.username,
          email: user.email,
          profilePictureUrl: user.profilePictureUrl
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  return router;
};
