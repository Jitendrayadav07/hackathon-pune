const db = require('../config/db.config');
const Response = require('../classes/Response');

// Generate unique referral code
const generateReferralCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Get user's referral code
const getReferralCode = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await db.user.findByPk(userId);
    if (!user) {
      return res.status(404).json(Response.sendResponse(
        false,
        null,
        'User not found',
        404
      ));
    }

    // Generate referral code if user doesn't have one
    if (!user.referral_code) {
      let referralCode;
      let isUnique = false;
      
      // Ensure referral code is unique
      while (!isUnique) {
        referralCode = generateReferralCode();
        const existingUser = await db.user.findOne({
          where: { referral_code: referralCode }
        });
        if (!existingUser) {
          isUnique = true;
        }
      }
      
      // Update user with referral code
      await user.update({ referral_code: referralCode });
    }

    return res.status(200).json(Response.sendResponse(
      true,
      {
        referralCode: user.referral_code || user.referral_code,
        referralLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?ref=${user.referral_code}`
      },
      'Referral code retrieved successfully',
      200
    ));

  } catch (error) {
    console.error('Error getting referral code:', error);
    return res.status(500).json(Response.sendResponse(
      false,
      null,
      'Internal server error',
      500
    ));
  }
};

// Get user's referral statistics
const getReferralStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get referrals made by this user
    const referralsMade = await db.referral.findAll({
      where: { referrer_id: userId },
      include: [{
        model: db.user,
        as: 'referred',
        attributes: ['id', 'full_name', 'email', 'created_at']
      }],
      order: [['created_at', 'DESC']]
    });

    // Get user's points
    let userPoints = await db.userPoints.findOne({
      where: { user_id: userId }
    });

    // Create user points record if it doesn't exist
    if (!userPoints) {
      userPoints = await db.userPoints.create({
        user_id: userId,
        total_points: 0,
        referral_points: 0,
        activity_points: 0
      });
    }

    // Calculate statistics
    const totalReferrals = referralsMade.length;
    const completedReferrals = referralsMade.filter(r => r.status === 'completed').length;
    const pendingReferrals = referralsMade.filter(r => r.status === 'pending').length;
    const totalPointsEarned = referralsMade
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + r.points_earned, 0);

    return res.status(200).json(Response.sendResponse(
      true,
      {
        totalReferrals,
        completedReferrals,
        pendingReferrals,
        totalPointsEarned,
        currentPoints: userPoints.total_points,
        referralPoints: userPoints.referral_points,
        activityPoints: userPoints.activity_points,
        referrals: referralsMade.map(ref => ({
          id: ref.id,
          referredUser: {
            id: ref.referred.id,
            name: ref.referred.full_name,
            email: ref.referred.email,
            joinedAt: ref.referred.created_at
          },
          pointsEarned: ref.points_earned,
          status: ref.status,
          createdAt: ref.created_at,
          completedAt: ref.completed_at
        }))
      },
      'Referral statistics retrieved successfully',
      200
    ));

  } catch (error) {
    console.error('Error getting referral stats:', error);
    return res.status(500).json(Response.sendResponse(
      false,
      null,
      'Internal server error',
      500
    ));
  }
};

// Validate referral code
const validateReferralCode = async (req, res) => {
  try {
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json(Response.sendResponse(
        false,
        null,
        'Referral code is required',
        400
      ));
    }

    const referrer = await db.user.findOne({
      where: { 
        referral_code: referralCode,
        is_active: 1
      },
      attributes: ['id', 'full_name', 'email']
    });

    if (!referrer) {
      return res.status(404).json(Response.sendResponse(
        false,
        null,
        'Invalid referral code',
        404
      ));
    }

    return res.status(200).json(Response.sendResponse(
      true,
      {
        referrer: {
          id: referrer.id,
          name: referrer.full_name,
          email: referrer.email
        },
        pointsEarned: 100 // Points that will be earned
      },
      'Referral code is valid',
      200
    ));

  } catch (error) {
    console.error('Error validating referral code:', error);
    return res.status(500).json(Response.sendResponse(
      false,
      null,
      'Internal server error',
      500
    ));
  }
};

// Process referral when user registers
const processReferral = async (referrerId, referredUserId, referralCode) => {
  try {
    // Create referral record
    const referral = await db.referral.create({
      referrer_id: referrerId,
      referred_id: referredUserId,
      referral_code: referralCode,
      points_earned: 100,
      status: 'completed',
      completed_at: new Date()
    });

    // Update referrer's points
    let userPoints = await db.userPoints.findOne({
      where: { user_id: referrerId }
    });

    if (!userPoints) {
      userPoints = await db.userPoints.create({
        user_id: referrerId,
        total_points: 100,
        referral_points: 100,
        activity_points: 0
      });
    } else {
      await userPoints.update({
        total_points: userPoints.total_points + 100,
        referral_points: userPoints.referral_points + 100,
        last_updated: new Date()
      });
    }

    return referral;
  } catch (error) {
    console.error('Error processing referral:', error);
    throw error;
  }
};

module.exports = {
  getReferralCode,
  getReferralStats,
  validateReferralCode,
  processReferral
};
