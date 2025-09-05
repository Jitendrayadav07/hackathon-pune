const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const walletController = require('../controllers/walletController');

// Get wallet connection status
router.get('/status', authenticateToken, walletController.getWalletStatus);

// Connect wallet
router.post('/connect', authenticateToken, walletController.connectWallet);

// Disconnect wallet
router.post('/disconnect', authenticateToken, walletController.disconnectWallet);

// Update wallet balance
router.put('/balance', authenticateToken, walletController.updateWalletBalance);

module.exports = router;
