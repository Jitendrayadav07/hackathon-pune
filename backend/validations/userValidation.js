const Joi = require("joi");

const userSchema = {
  registerUser: Joi.object().keys({
    full_name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    referralCode: Joi.string().optional(),
  }),
  loginUser: Joi.object().keys({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};
module.exports = userSchema;
