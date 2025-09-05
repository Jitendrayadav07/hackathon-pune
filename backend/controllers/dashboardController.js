const db = require('../config/db.config');
const Response = require('../classes/Response');

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    // Get total users count
    const totalUsers = await db.user.count({
      where: { is_active: 1 }
    });

    // Get total referrals count
    const totalReferrals = await db.referral.count({
      where: { status: 'completed' }
    });

    // Get total wallet connections
    const totalWallets = await db.walletConnection.count({
      where: { is_active: 1 }
    });

    // Get total twitter connections
    const totalTwitterConnections = await db.twitterConnection.count({
      where: { is_active: 1 }
    });

    // Get total points earned across all users
    const totalPointsResult = await db.userPoints.findOne({
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('total_points')), 'totalPoints']
      ],
      raw: true
    });

    const totalPoints = totalPointsResult?.totalPoints || 0;

    // Get users registered in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentUsers = await db.user.count({
      where: {
        is_active: 1,
        created_at: {
          [db.Sequelize.Op.gte]: thirtyDaysAgo
        }
      }
    });

    // Calculate growth rate (simplified)
    const growthRate = totalUsers > 0 ? ((recentUsers / totalUsers) * 100).toFixed(1) : 0;

    return res.status(200).json(Response.sendResponse(
      true,
      {
        totalUsers,
        totalReferrals,
        totalWallets,
        totalTwitterConnections,
        totalPoints,
        recentUsers,
        growthRate: `${growthRate}%`
      },
      'Dashboard statistics retrieved successfully',
      200
    ));

  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return res.status(500).json(Response.sendResponse(
      false,
      null,
      'Internal server error',
      500
    ));
  }
};

// Get recent activity
const getRecentActivity = async (req, res) => {
  try {
    // Get recent user registrations
    const recentUsers = await db.user.findAll({
      attributes: ['id', 'full_name', 'email', 'created_at'],
      where: { is_active: 1 },
      order: [['created_at', 'DESC']],
      limit: 5
    });

    // Get recent referrals
    const recentReferrals = await db.referral.findAll({
      include: [{
        model: db.user,
        as: 'referred',
        attributes: ['full_name', 'email']
      }],
      where: { status: 'completed' },
      order: [['created_at', 'DESC']],
      limit: 5
    });

    // Combine and format activities
    const activities = [];

    // Add user registrations
    recentUsers.forEach(user => {
      activities.push({
        type: 'user_registration',
        user: user.full_name,
        action: 'Joined the platform',
        time: user.created_at,
        email: user.email
      });
    });

    // Add referrals
    recentReferrals.forEach(referral => {
      activities.push({
        type: 'referral',
        user: referral.referred.full_name,
        action: 'Completed referral',
        time: referral.created_at,
        email: referral.referred.email
      });
    });

    // Sort by time and limit to 10
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    const recentActivities = activities.slice(0, 10);

    return res.status(200).json(Response.sendResponse(
      true,
      {
        activities: recentActivities
      },
      'Recent activity retrieved successfully',
      200
    ));

  } catch (error) {
    console.error('Error getting recent activity:', error);
    return res.status(500).json(Response.sendResponse(
      false,
      null,
      'Internal server error',
      500
    ));
  }
};

module.exports = {
  getDashboardStats,
  getRecentActivity
};
