const passport = require('passport');
const TwitterStrategy = require('passport-twitter').Strategy;
const db = require('./db.config');

// Twitter OAuth Strategy
passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_CLIENT_ID,
    consumerSecret: process.env.TWITTER_CLIENT_SECRET,
    callbackURL: process.env.TWITTER_CALLBACK_URL,
    passReqToCallback: true
}, async (req, token, tokenSecret, profile, done) => {
    try {
        // Get user ID from session
        const userId = req.session.userId;
        
        if (!userId) {
            return done(new Error('User ID not found in session'), null);
        }

        // Check if Twitter connection already exists
        let twitterConnection = await db.twitterConnection.findOne({
            where: { twitter_id: profile.id }
        });

        if (twitterConnection) {
            // Update existing connection
            await twitterConnection.update({
                username: profile.username,
                display_name: profile.displayName,
                profile_image_url: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                access_token: token,
                access_token_secret: tokenSecret,
                is_active: true,
                last_sync: new Date()
            });
        } else {
            // Create new connection
            twitterConnection = await db.twitterConnection.create({
                user_id: userId,
                twitter_id: profile.id,
                username: profile.username,
                display_name: profile.displayName,
                profile_image_url: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                access_token: token,
                access_token_secret: tokenSecret,
                is_active: true,
                last_sync: new Date()
            });
        }

        return done(null, { twitterConnection, user: { id: userId } });
    } catch (error) {
        console.error('Twitter OAuth error:', error);
        return done(error, null);
    }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
    done(null, user);
});

module.exports = passport;
