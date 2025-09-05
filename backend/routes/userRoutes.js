const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const JoiMiddleWare = require("../middlewares/joi/joiMiddleware");
const userSchema = require("../validations/userValidation");
const { authenticateToken } = require("../middlewares/authMiddleware");

router.post("/register", JoiMiddleWare(userSchema.registerUser, "body"), userController.registerUser);
router.post("/login", JoiMiddleWare(userSchema.loginUser, "body"), userController.loginUser);
router.get("/", authenticateToken, userController.getAllUsers);

module.exports = router;