const Response = require("../classes/Response");
const db = require("../config/db.config");

// Get user's Twitter connection status
const getTwitterStatus = async (req, res) => {
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(401).json(Response.sendResponse(false, null, "Unauthorized", 401));
        }

        const twitterConnection = await db.twitterConnection.findOne({
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

        if (twitterConnection) {
            res.status(200).json(Response.sendResponse(true, {
                connected: true,
                username: twitterConnection.username,
                display_name: twitterConnection.display_name,
                profile_image_url: twitterConnection.profile_image_url,
                followers_count: twitterConnection.followers_count,
                following_count: twitterConnection.following_count,
                tweets_count: twitterConnection.tweets_count,
                last_sync: twitterConnection.last_sync
            }, "Twitter connection found", 200));
        } else {
            res.status(200).json(Response.sendResponse(true, {
                connected: false
            }, "No Twitter connection found", 200));
        }
    } catch (error) {
        console.error('Get Twitter status error:', error);
        res.status(500).json(Response.sendResponse(false, null, error.message, 500));
    }
};

// Disconnect Twitter account
const disconnectTwitter = async (req, res) => {
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(401).json(Response.sendResponse(false, null, "Unauthorized", 401));
        }

        const twitterConnection = await db.twitterConnection.findOne({
            where: { 
                user_id: userId,
                is_active: true 
            }
        });

        if (twitterConnection) {
            await twitterConnection.update({ is_active: false });
            res.status(200).json(Response.sendResponse(true, null, "Twitter account disconnected successfully", 200));
        } else {
            res.status(404).json(Response.sendResponse(false, null, "No active Twitter connection found", 404));
        }
    } catch (error) {
        console.error('Disconnect Twitter error:', error);
        res.status(500).json(Response.sendResponse(false, null, error.message, 500));
    }
};

// Get all Twitter connections (admin function)
const getAllTwitterConnections = async (req, res) => {
    try {
        const connections = await db.twitterConnection.findAll({
            where: { is_active: true },
            include: [{
                model: db.user,
                as: 'user',
                attributes: ['id', 'full_name', 'email']
            }],
            order: [['created_at', 'DESC']]
        });

        res.status(200).json(Response.sendResponse(true, connections, "Twitter connections retrieved successfully", 200));
    } catch (error) {
        console.error('Get all Twitter connections error:', error);
        res.status(500).json(Response.sendResponse(false, null, error.message, 500));
    }
};

module.exports = {
    getTwitterStatus,
    disconnectTwitter,
    getAllTwitterConnections
};
