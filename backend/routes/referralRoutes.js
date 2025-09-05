const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const referralController = require('../controllers/referralController');

// Get user's referral code
router.get('/code', authenticateToken, referralController.getReferralCode);

// Get user's referral statistics
router.get('/stats', authenticateToken, referralController.getReferralStats);

// Validate referral code
router.post('/validate', referralController.validateReferralCode);

module.exports = router;
