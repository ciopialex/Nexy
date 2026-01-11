const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const JWT_SECRET = process.env.JWT_SECRET;
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        console.error('[AUTH ERROR] Token verification failed:', e.message);
        console.error('[AUTH DEBUG] Secret length:', JWT_SECRET ? JWT_SECRET.length : 'undefined');
        console.error('[AUTH DEBUG] Token received:', token.substring(0, 20) + '...');
        res.status(400).json({ message: 'Token is not valid' });
    }
};