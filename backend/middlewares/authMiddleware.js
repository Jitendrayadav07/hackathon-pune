const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwtTokenKey');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            isSuccess: false,
            message: 'Access token required',
            statusCode: 401
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                isSuccess: false,
                message: 'Invalid or expired token',
                statusCode: 403
            });
        }
        req.user = user;
        next();
    });
};

module.exports = { authenticateToken };
