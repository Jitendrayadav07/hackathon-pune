const db = require('../config/db.config');
const Response = require('../classes/Response');

// Get wallet connection status for a user
const getWalletStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const walletConnection = await db.walletConnection.findOne({
      where: { 
        user_id: userId, 
        is_active: true 
      },
      include: [{
        model: db.user,
        as: 'user',
        attributes: ['id', 'full_name', 'email']
      }]
    });

    if (!walletConnection) {
      return res.status(200).json(Response.sendResponse(
        false,
        { isConnected: false, wallet: null },
        'No wallet connected',
        200
      ));
    }

    return res.status(200).json(Response.sendResponse(
      true,
      {
        isConnected: true,
        wallet: {
          id: walletConnection.id,
          walletType: walletConnection.wallet_type,
          walletAddress: walletConnection.wallet_address,
          balance: walletConnection.balance,
          balanceUSD: walletConnection.balance_usd,
          network: walletConnection.network,
          connectedAt: walletConnection.connected_at,
          lastUpdated: walletConnection.last_updated
        }
      },
      'Wallet connection found',
      200
    ));

  } catch (error) {
    console.error('Error getting wallet status:', error);
    return res.status(500).json(Response.sendResponse(
      false,
      null,
      'Internal server error',
      500
    ));
  }
};

// Connect wallet (save wallet data)
const connectWallet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { walletAddress, balance, balanceUSD, network = 'Ethereum' } = req.body;

    // Validate required fields
    if (!walletAddress) {
      return res.status(400).json(Response.sendResponse(
        false,
        null,
        'Wallet address is required',
        400
      ));
    }

    // Check if wallet is already connected to another user
    const existingConnection = await db.walletConnection.findOne({
      where: { 
        wallet_address: walletAddress,
        is_active: true
      }
    });

    if (existingConnection && existingConnection.user_id !== userId) {
      return res.status(400).json(Response.sendResponse(
        false,
        null,
        'This wallet is already connected to another account',
        400
      ));
    }

    // Check if user already has a wallet connected
    const userWallet = await db.walletConnection.findOne({
      where: { 
        user_id: userId,
        is_active: true
      }
    });

    let walletConnection;

    if (userWallet) {
      // Update existing connection
      await userWallet.update({
        wallet_address: walletAddress,
        balance: balance || userWallet.balance,
        balance_usd: balanceUSD || userWallet.balance_usd,
        network: network,
        last_updated: new Date()
      });
      walletConnection = userWallet;
    } else {
      // Create new connection
      walletConnection = await db.walletConnection.create({
        user_id: userId,
        wallet_type: 'MetaMask',
        wallet_address: walletAddress,
        balance: balance,
        balance_usd: balanceUSD,
        network: network,
        is_active: true,
        connected_at: new Date(),
        last_updated: new Date()
      });
    }

    return res.status(200).json(Response.sendResponse(
      true,
      {
        id: walletConnection.id,
        walletType: walletConnection.wallet_type,
        walletAddress: walletConnection.wallet_address,
        balance: walletConnection.balance,
        balanceUSD: walletConnection.balance_usd,
        network: walletConnection.network,
        connectedAt: walletConnection.connected_at,
        lastUpdated: walletConnection.last_updated
      },
      'Wallet connected successfully',
      200
    ));

  } catch (error) {
    console.error('Error connecting wallet:', error);
    return res.status(500).json(Response.sendResponse(
      false,
      null,
      'Internal server error',
      500
    ));
  }
};

// Disconnect wallet
const disconnectWallet = async (req, res) => {
  try {
    const userId = req.user.userId;

    const walletConnection = await db.walletConnection.findOne({
      where: { 
        user_id: userId,
        is_active: true
      }
    });

    if (!walletConnection) {
      return res.status(404).json(Response.sendResponse(
        false,
        null,
        'No wallet connection found',
        404
      ));
    }

    await walletConnection.update({
      is_active: false,
      last_updated: new Date()
    });

    return res.status(200).json(Response.sendResponse(
      true,
      null,
      'Wallet disconnected successfully',
      200
    ));

  } catch (error) {
    console.error('Error disconnecting wallet:', error);
    return res.status(500).json(Response.sendResponse(
      false,
      null,
      'Internal server error',
      500
    ));
  }
};

// Update wallet balance
const updateWalletBalance = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { balance, balanceUSD } = req.body;

    const walletConnection = await db.walletConnection.findOne({
      where: { 
        user_id: userId,
        is_active: true
      }
    });

    if (!walletConnection) {
      return res.status(404).json(Response.sendResponse(
        false,
        null,
        'No wallet connection found',
        404
      ));
    }

    await walletConnection.update({
      balance: balance || walletConnection.balance,
      balance_usd: balanceUSD || walletConnection.balance_usd,
      last_updated: new Date()
    });

    return res.status(200).json(Response.sendResponse(
      true,
      {
        id: walletConnection.id,
        balance: walletConnection.balance,
        balanceUSD: walletConnection.balance_usd,
        lastUpdated: walletConnection.last_updated
      },
      'Wallet balance updated successfully',
      200
    ));

  } catch (error) {
    console.error('Error updating wallet balance:', error);
    return res.status(500).json(Response.sendResponse(
      false,
      null,
      'Internal server error',
      500
    ));
  }
};

module.exports = {
  getWalletStatus,
  connectWallet,
  disconnectWallet,
  updateWalletBalance
};
