// index.js
const express = require("express");
const router = express.Router();


const userRoutes = require("./userRoutes");
const twitterRoutes = require("./twitterRoutes");
const walletRoutes = require("./walletRoutes");
const referralRoutes = require("./referralRoutes");
const dashboardRoutes = require("./dashboardRoutes");

router.use("/user", userRoutes);
router.use("/twitter", twitterRoutes);
router.use("/wallet", walletRoutes);
router.use("/referral", referralRoutes);
router.use("/dashboard", dashboardRoutes);




module.exports = router;