
const Response = require("../classes/Response");
const db = require("../config/db.config");
const { Op, QueryTypes, Sequelize } = require("sequelize");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/jwtTokenKey");


const registerUser = async (req, res) => {
    try {
        const { full_name, email, password, referralCode } = req.body;
        
        // Check if user already exists
        const existingUser = await db.user.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json(Response.sendResponse(false, null, "User already exists with this email", 400));
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await db.user.create({ 
            full_name, 
            email, 
            password: hashedPassword 
        });

        // Process referral if referral code is provided
        if (referralCode) {
            try {
                const referrer = await db.user.findOne({
                    where: { 
                        referral_code: referralCode,
                        is_active: 1
                    }
                });

                if (referrer && referrer.id !== user.id) {
                    // Import referral controller
                    const { processReferral } = require('./referralController');
                    await processReferral(referrer.id, user.id, referralCode);
                }
            } catch (referralError) {
                console.error('Referral processing error:', referralError);
                // Don't fail registration if referral processing fails
            }
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Remove password from response
        const userResponse = {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            is_active: user.is_active
        };
        
        res.status(201).json(Response.sendResponse(true, { user: userResponse, token }, "User registered successfully", 201));
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json(Response.sendResponse(false, null, error.message, 500));
    }
}

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await db.user.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json(Response.sendResponse(false, null, "Invalid credentials", 401));
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json(Response.sendResponse(false, null, "Invalid credentials", 401));
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Remove password from response
        const userResponse = {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            is_active: user.is_active
        };

        res.status(200).json(Response.sendResponse(true, { user: userResponse, token }, "Login successful", 200));
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json(Response.sendResponse(false, null, error.message, 500));
    }
}

const getAllUsers = async (req, res) => {
    try {
        const users = await db.user.findAll({
            attributes: { exclude: ['password'] },
            order: [['created_at', 'DESC']]
        });

        res.status(200).json(Response.sendResponse(true, users, "Users retrieved successfully", 200));
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json(Response.sendResponse(false, null, error.message, 500));
    }
}

module.exports = { registerUser, loginUser, getAllUsers };
