require('dotenv').config();
const jwt = require('jsonwebtoken');

console.log('--- DEBUG AUTH ---');

const secret = process.env.JWT_SECRET;
if (!secret) {
    console.error('ERROR: JWT_SECRET is NOT defined in environment variables.');
} else {
    console.log('SUCCESS: JWT_SECRET is defined.');
    console.log('Secret length:', secret.length);
}

// Test Token Generation and Verification
try {
    const payload = { userId: 1, username: 'test' };
    const token = jwt.sign(payload, secret || 'temp_secret', { expiresIn: '1h' });
    console.log('Generated Token:', token);

    const decoded = jwt.verify(token, secret || 'temp_secret');
    console.log('Verified Payload:', decoded);
    console.log('Auth check passed.');
} catch (error) {
    console.error('Auth check failed:', error.message);
}
