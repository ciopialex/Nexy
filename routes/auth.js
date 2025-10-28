const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generateDefaultPfp } = require('../utils/default-pfp');

module.exports = (dbPool) => {
  const router = express.Router();
  const SALT_ROUNDS = 10;

  // POST /api/register
  router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required.' });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const [result] = await dbPool.execute(
        'INSERT INTO Users (username, email, passwordHash) VALUES (?, ?, ?)',
        [username, email, hashedPassword]
      );

      const userId = result.insertId;
      const profilePictureUrl = generateDefaultPfp(userId);

      await dbPool.execute('UPDATE Users SET profilePictureUrl = ? WHERE userId = ?', [profilePictureUrl, userId]);

      res.status(201).json({ message: 'User registered successfully', userId });
    } catch (error) {
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

    try {
      const [rows] = await dbPool.execute('SELECT * FROM Users WHERE email = ? OR handle = ?', [loginIdentifier, loginIdentifier]);
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
