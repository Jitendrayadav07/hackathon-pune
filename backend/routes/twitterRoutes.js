const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares/authMiddleware");

// Twitter OAuth routes
router.get("/auth-url", authenticateToken, async (req, res) => {
    try {
        console.log('Twitter OAuth request received for user:', req.user.userId);
        console.log('Environment variables check:');
        console.log('TWITTER_CLIENT_ID:', process.env.TWITTER_CLIENT_ID ? 'Set' : 'Not set');
        console.log('TWITTER_CLIENT_SECRET:', process.env.TWITTER_CLIENT_SECRET ? 'Set' : 'Not set');
        console.log('TWITTER_CALLBACK_URL:', process.env.TWITTER_CALLBACK_URL);
        console.log('Expected callback URL should be: http://localhost:8000/auth/twitter/callback (matching Twitter Developer Portal)');
        
        // Check if environment variables are set
        if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET || !process.env.TWITTER_CALLBACK_URL) {
            return res.status(500).json({
                isSuccess: false,
                message: 'Twitter OAuth configuration missing. Please check environment variables.',
                statusCode: 500
            });
        }
        
        // Store user ID for callback (will be stored with OAuth token)
        const userId = req.user.userId;
        
        // Use OAuth 1.0a for Twitter authentication
        const OAuth = require('oauth');
        
        const oauth = new OAuth.OAuth(
            'https://api.twitter.com/oauth/request_token',
            'https://api.twitter.com/oauth/access_token',
            process.env.TWITTER_CLIENT_ID, // consumer key
            process.env.TWITTER_CLIENT_SECRET, // consumer secret
            '1.0A',
            process.env.TWITTER_CALLBACK_URL,
            'HMAC-SHA1'
        );

        const authLink = await new Promise((resolve, reject) => {
            oauth.getOAuthRequestToken((error, oauthToken, oauthTokenSecret, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({
                        oauth_token: oauthToken,
                        oauth_token_secret: oauthTokenSecret,
                        url: `https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}`
                    });
                }
            });
        });
        
        // Store tokens in oauthStore (accessible from main app)
        const oauthStore = require('../index').oauthStore;
        oauthStore.set(authLink.oauth_token, {
            oauthTokenSecret: authLink.oauth_token_secret,
            userId: userId
        });

        console.log('Generated OAuth URL for user:', req.user.userId);
        console.log('OAuth token:', authLink.oauth_token);

        res.json({
            isSuccess: true,
            authUrl: authLink.url,
            statusCode: 200
        });

    } catch (error) {
        console.error('Auth URL generation error:', error);
        res.status(500).json({
            isSuccess: false,
            message: 'Internal server error: ' + error.message,
            statusCode: 500
        });
    }
});

// Twitter OAuth callback route
router.get("/auth/twitter/callback", async (req, res) => {
    try {
        const oauthToken = req.query.oauth_token;
        const oauthVerifier = req.query.oauth_verifier;
        const oauthTokenSecret = req.session.oauthTokenSecret;
        const userId = req.session.userId;

        console.log('Twitter callback received:', { oauthToken, oauthVerifier: !!oauthVerifier, userId });

        if (!oauthToken || !oauthVerifier || !oauthTokenSecret || !userId) {
            console.error('Missing OAuth parameters');
            return res.redirect(`${process.env.FRONTEND_URL}/dashboard/social?error=twitter_auth_failed`);
        }

        // Use OAuth 1.0a for Twitter authentication
        const OAuth = require('oauth');
        
        const oauth = new OAuth.OAuth(
            'https://api.twitter.com/oauth/request_token',
            'https://api.twitter.com/oauth/access_token',
            process.env.TWITTER_CLIENT_ID, // consumer key
            process.env.TWITTER_CLIENT_SECRET, // consumer secret
            '1.0A',
            process.env.TWITTER_CALLBACK_URL,
            'HMAC-SHA1'
        );

        // Get access token
        const { accessToken, accessTokenSecret } = await new Promise((resolve, reject) => {
            oauth.getOAuthAccessToken(oauthToken, oauthTokenSecret, oauthVerifier, (error, accessToken, accessTokenSecret, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({ accessToken, accessTokenSecret });
                }
            });
        });

        // Get user info
        const userData = await new Promise((resolve, reject) => {
            oauth.get('https://api.twitter.com/1.1/account/verify_credentials.json', accessToken, accessTokenSecret, (error, data) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(JSON.parse(data));
                }
            });
        });

        console.log('Twitter user data:', userData);

        const db = require('../config/db.config');

        // Check if Twitter connection already exists
        let twitterConnection = await db.twitterConnection.findOne({
            where: { twitter_id: userData.id_str }
        });

        if (twitterConnection) {
            // Update existing connection
            await twitterConnection.update({
                username: userData.screen_name,
                display_name: userData.name,
                profile_image_url: userData.profile_image_url,
                access_token: accessToken,
                access_token_secret: accessTokenSecret,
                followers_count: userData.followers_count || 0,
                following_count: userData.friends_count || 0,
                tweets_count: userData.statuses_count || 0,
                is_active: true,
                last_sync: new Date()
            });
        } else {
            // Create new connection
            await db.twitterConnection.create({
                user_id: userId,
                twitter_id: userData.id_str,
                username: userData.screen_name,
                display_name: userData.name,
                profile_image_url: userData.profile_image_url,
                access_token: accessToken,
                access_token_secret: accessTokenSecret,
                followers_count: userData.followers_count || 0,
                following_count: userData.friends_count || 0,
                tweets_count: userData.statuses_count || 0,
                is_active: true,
                last_sync: new Date()
            });
        }

        // Clear session data
        req.session.oauthToken = null;
        req.session.oauthTokenSecret = null;

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/dashboard/social?success=twitter_connected`);

    } catch (error) {
        console.error('Twitter callback error:', error);
        res.redirect(`${process.env.FRONTEND_URL}/dashboard/social?error=twitter_auth_failed`);
    }
});

// Get Twitter connection status
router.get("/status", authenticateToken, async (req, res) => {
    try {
        const db = require('../config/db.config');
        
        const twitterConnection = await db.twitterConnection.findOne({
            where: { 
                user_id: req.user.userId,
                is_active: true 
            }
        });

        if (twitterConnection) {
            res.json({
                isSuccess: true,
                data: {
                    connected: true,
                    username: twitterConnection.username,
                    display_name: twitterConnection.display_name,
                    profile_image_url: twitterConnection.profile_image_url,
                    followers_count: twitterConnection.followers_count,
                    following_count: twitterConnection.following_count,
                    tweets_count: twitterConnection.tweets_count,
                    last_sync: twitterConnection.last_sync
                },
                statusCode: 200
            });
        } else {
            res.json({
                isSuccess: true,
                data: {
                    connected: false
                },
                statusCode: 200
            });
        }
    } catch (error) {
        console.error('Get Twitter status error:', error);
        res.status(500).json({
            isSuccess: false,
            message: 'Internal server error: ' + error.message,
            statusCode: 500
        });
    }
});

// Disconnect Twitter
router.delete("/disconnect", authenticateToken, async (req, res) => {
    try {
        const db = require('../config/db.config');
        
        await db.twitterConnection.update(
            { is_active: false },
            { where: { user_id: req.user.userId } }
        );

        res.json({
            isSuccess: true,
            message: 'Twitter account disconnected successfully',
            statusCode: 200
        });
    } catch (error) {
        console.error('Disconnect Twitter error:', error);
        res.status(500).json({
            isSuccess: false,
            message: 'Internal server error: ' + error.message,
            statusCode: 500
        });
    }
});

// Get all Twitter connections (admin)
router.get("/all", authenticateToken, async (req, res) => {
    try {
        const db = require('../config/db.config');
        
        const twitterConnections = await db.twitterConnection.findAll({
            where: { is_active: true },
            include: [{
                model: db.user,
                as: 'user',
                attributes: ['id', 'full_name', 'email']
            }]
        });

        res.json({
            isSuccess: true,
            data: twitterConnections,
            statusCode: 200
        });
    } catch (error) {
        console.error('Get all Twitter connections error:', error);
        res.status(500).json({
            isSuccess: false,
            message: 'Internal server error: ' + error.message,
            statusCode: 500
        });
    }
});

// Test endpoint
router.get("/test", authenticateToken, (req, res) => {
    res.json({
        isSuccess: true,
        message: "Twitter routes are working!",
        user: req.user,
        statusCode: 200
    });
});

// Get recent Twitter posts
router.get("/posts", authenticateToken, async (req, res) => {
    try {
        const db = require('../config/db.config');
        
        // Get user's Twitter connection
        const twitterConnection = await db.twitterConnection.findOne({
            where: { 
                user_id: req.user.userId,
                is_active: true 
            }
        });

        if (!twitterConnection) {
            return res.status(404).json({
                isSuccess: false,
                message: 'Twitter account not connected',
                statusCode: 404
            });
        }

        // Use OAuth 1.0a to get user's recent tweets
        const OAuth = require('oauth');
        
        const oauth = new OAuth.OAuth(
            'https://api.twitter.com/oauth/request_token',
            'https://api.twitter.com/oauth/access_token',
            process.env.TWITTER_CLIENT_ID,
            process.env.TWITTER_CLIENT_SECRET,
            '1.0A',
            null,
            'HMAC-SHA1'
        );

        // Try multiple Twitter API endpoints to get real posts
        console.log('Fetching tweets for user:', twitterConnection.twitter_id);
        
        let tweets = null;
        let apiEndpoint = '';
        
        // Try different endpoints in order of preference
        const endpoints = [
            `https://api.twitter.com/1.1/statuses/user_timeline.json?user_id=${twitterConnection.twitter_id}&count=10&tweet_mode=extended`,
            `https://api.twitter.com/1.1/statuses/home_timeline.json?count=10&tweet_mode=extended`,
            `https://api.twitter.com/1.1/statuses/mentions_timeline.json?count=10&tweet_mode=extended`,
            `https://api.twitter.com/2/users/${twitterConnection.twitter_id}/tweets?max_results=10&tweet.fields=created_at,public_metrics`
        ];
        
        for (const endpoint of endpoints) {
            try {
                console.log('Trying endpoint:', endpoint);
                tweets = await new Promise((resolve, reject) => {
                    oauth.get(
                        endpoint,
                        twitterConnection.access_token,
                        twitterConnection.access_token_secret,
                        (error, data) => {
                            if (error) {
                                console.error('Endpoint failed:', endpoint, error.statusCode);
                                reject(error);
                            } else {
                                console.log('Success with endpoint:', endpoint);
                                resolve(JSON.parse(data));
                            }
                        }
                    );
                });
                apiEndpoint = endpoint;
                break; // If successful, break out of loop
            } catch (error) {
                console.log('Endpoint failed, trying next one...');
                continue;
            }
        }

        // Format tweets for frontend (handle different response structures)
        let formattedTweets = [];
        
        if (tweets) {
            if (Array.isArray(tweets)) {
                // API v1.1 response
                formattedTweets = tweets
                    .filter(tweet => tweet.user && tweet.user.id_str === twitterConnection.twitter_id) // Only show user's own tweets
                    .map(tweet => ({
                        id: tweet.id_str,
                        content: tweet.full_text || tweet.text,
                        created_at: tweet.created_at,
                        likes: tweet.favorite_count || 0,
                        retweets: tweet.retweet_count || 0,
                        replies: tweet.reply_count || 0,
                        user: {
                            username: tweet.user.screen_name,
                            display_name: tweet.user.name,
                            profile_image_url: tweet.user.profile_image_url_https
                        }
                    }));
            } else if (tweets.data && Array.isArray(tweets.data)) {
                // API v2 response
                formattedTweets = tweets.data.map(tweet => ({
                    id: tweet.id,
                    content: tweet.text,
                    created_at: tweet.created_at,
                    likes: tweet.public_metrics?.like_count || 0,
                    retweets: tweet.public_metrics?.retweet_count || 0,
                    replies: tweet.public_metrics?.reply_count || 0,
                    user: {
                        username: twitterConnection.username,
                        display_name: twitterConnection.display_name,
                        profile_image_url: twitterConnection.profile_image_url
                    }
                }));
            }
        }
        
        console.log('Formatted tweets count:', formattedTweets.length);
        console.log('Used endpoint:', apiEndpoint);

        if (formattedTweets.length > 0) {
            console.log('Successfully fetched real tweets:', formattedTweets.length);
            res.json({
                isSuccess: true,
                data: formattedTweets,
                statusCode: 200,
                message: 'Real tweets fetched successfully'
            });
        } else {
            console.log('No real tweets found, falling back to mock data');
            throw new Error('No tweets found from any endpoint');
        }

    } catch (error) {
        console.error('Get Twitter posts error:', error);
        
        // If Twitter API fails, return mock data for demonstration
        console.log('Twitter API failed, returning mock data for demonstration');
        
        // Get user's Twitter connection for mock data
        const db = require('../config/db.config');
        const twitterConnection = await db.twitterConnection.findOne({
            where: { 
                user_id: req.user.userId,
                is_active: true 
            }
        });
        
        const mockTweets = [
            {
                id: 'mock_1',
                content: 'Hello Twitter! This is my first tweet from the eERC platform! 🚀',
                created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
                likes: 5,
                retweets: 2,
                replies: 1,
                user: {
                    username: twitterConnection?.username || 'jitu40375',
                    display_name: twitterConnection?.display_name || 'Jitu Yadav',
                    profile_image_url: twitterConnection?.profile_image_url || ''
                }
            },
            {
                id: 'mock_2',
                content: 'Just connected my Twitter account to eERC! Excited to manage all my social media from one place! 📱',
                created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
                likes: 8,
                retweets: 3,
                replies: 2,
                user: {
                    username: twitterConnection?.username || 'jitu40375',
                    display_name: twitterConnection?.display_name || 'Jitu Yadav',
                    profile_image_url: twitterConnection?.profile_image_url || ''
                }
            }
        ];
        
        res.json({
            isSuccess: true,
            data: mockTweets,
            statusCode: 200,
            message: 'Mock data returned due to API limitations'
        });
    }
});

// Test Twitter credentials
router.get("/test-credentials", authenticateToken, async (req, res) => {
    try {
        const OAuth = require('oauth');
        
        const oauth = new OAuth.OAuth(
            'https://api.twitter.com/oauth/request_token',
            'https://api.twitter.com/oauth/access_token',
            process.env.TWITTER_CLIENT_ID,
            process.env.TWITTER_CLIENT_SECRET,
            '1.0A',
            null,
            'HMAC-SHA1'
        );

        // Test with a simple request
        const testResult = await new Promise((resolve, reject) => {
            oauth.get('https://api.twitter.com/1.1/help/configuration.json', null, null, (error, data) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(JSON.parse(data));
                }
            });
        });

        res.json({
            isSuccess: true,
            message: "Twitter credentials are valid!",
            data: testResult,
            statusCode: 200
        });
    } catch (error) {
        console.error('Twitter credentials test error:', error);
        res.status(500).json({
            isSuccess: false,
            message: 'Twitter credentials test failed: ' + error.message,
            statusCode: 500
        });
    }
});

module.exports = router;