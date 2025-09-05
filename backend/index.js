const formData = require("express-form-data");
const express = require("express");
const os = require("os");
var bodyParser = require('body-parser');
var cors = require('cors');
const session = require('express-session');
const passport = require('./config/passport');
const app = express();
const routes = require("./routes");
const path = require('path')

// Temporary store for OAuth tokens (in production, use Redis or database)
const oauthStore = new Map();

// Import routes

const corsOptions = {
  origin: 'http://localhost:3000', // Update to match the frontend origin
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));
// // app.use(cors());


// Session configuration
app.use(session({
  secret: process.env.JWT_SECRET || 'your-session-secret',
  resave: true, // Changed to true to ensure session is saved
  saveUninitialized: true, // Changed to true to save new sessions
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true, // Added for security
    sameSite: 'lax' // Added for CORS compatibility
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.use(express.urlencoded({ extended: true }));
// to accept json body
app.use(express.json({
  limit: "50mb",
}))

app.set("view engine", "ejs"); // Set EJS as the view engine
app.set("views", path.join(__dirname, "templates")); // Ensure views directory is set
app.use(express.static("public")); // Serve static files
// app.use(express.urlencoded())

// for parsing application/xwww-
app.use(bodyParser.urlencoded({ extended: true }));

// to accept form data
// app.use(upload.array());    
app.use(express.static('public'));

const options = {
  uploadDir: os.tmpdir(),
  autoClean: true
};

// parse data with connect-multiparty. 
app.use(formData.parse(options));
// delete from the request all empty files (size == 0)
app.use(formData.format());
// change the file objects to fs.ReadStream 
// app.use(formData.stream());
//  union the body and the files
app.use(formData.union());

// Sync models with the database
const sequelizeDB = require("./config/db.config");
sequelizeDB.sequelize.sync(sequelizeDB);



// Use routes
app.use("/api", routes);

// Add Twitter callback route at root level (not under /api)
app.get("/auth/twitter/callback", async (req, res) => {
    try {
        const oauthToken = req.query.oauth_token;
        const oauthVerifier = req.query.oauth_verifier;
        
        // Get OAuth data from store instead of session
        const oauthData = oauthStore.get(oauthToken);
        if (!oauthData) {
            console.error('OAuth token not found in store:', oauthToken);
            return res.redirect(`${process.env.FRONTEND_URL}/dashboard/social?error=twitter_auth_failed`);
        }
        
        const { oauthTokenSecret, userId } = oauthData;

        console.log('Twitter callback received:', { oauthToken, oauthVerifier: !!oauthVerifier, userId });
        console.log('Session data:', req.session);
        console.log('Session ID:', req.sessionID);

        if (!oauthToken || !oauthVerifier || !oauthTokenSecret || !userId) {
            console.error('Missing OAuth parameters:', {
                oauthToken: !!oauthToken,
                oauthVerifier: !!oauthVerifier,
                oauthTokenSecret: !!oauthTokenSecret,
                userId: !!userId
            });
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

        const db = require('./config/db.config');

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

        // Clear OAuth data from store
        oauthStore.delete(oauthToken);

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/dashboard/social?success=twitter_connected`);

    } catch (error) {
        console.error('Twitter callback error:', error);
        res.redirect(`${process.env.FRONTEND_URL}/dashboard/social?error=twitter_auth_failed`);
    }
});
// set port, listen for requests
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

// Export oauthStore for use in routes
module.exports = { oauthStore };