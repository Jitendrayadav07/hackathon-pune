// config/db.config.js
const { Sequelize } = require("sequelize");
require("dotenv").config();

//Localhost Databse Connection
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST,
      dialect: "mysql",
      port: 3306,
      dialectOptions: {
        connectTimeout: 20000 // Connection timeout in milliseconds (20 seconds)
      },
      pool: {
        max: 10, // Maximum number of connections in the pool
        min: 0, // Minimum number of connections in the pool
        acquire: 30000, // Maximum time in milliseconds that a connection can be acquired
        idle: 10000 // Maximum time in milliseconds that a connection can be idle before being released
      }
    }
  );
  
  
  // Test the database connection
  sequelize
    .authenticate()
    .then(() => {
      console.log("Database connection has been established successfully.");
    })
  .catch((err) => {
      console.error("Unable to connect to the database:", err);
  });
  
  
  const db = {};
  
  db.Sequelize = Sequelize;
  db.sequelize = sequelize;

  db.user = require("../models/user")(sequelize,Sequelize);
  db.twitterConnection = require("../models/twitterConnection")(sequelize,Sequelize);
  db.walletConnection = require("../models/walletConnection")(sequelize,Sequelize);
  db.referral = require("../models/referral")(sequelize,Sequelize);
  db.userPoints = require("../models/userPoints")(sequelize,Sequelize);

  // Define associations
  db.user.hasMany(db.twitterConnection, { foreignKey: 'user_id', as: 'twitterConnections' });
  db.twitterConnection.belongsTo(db.user, { foreignKey: 'user_id', as: 'user' });
  
  db.user.hasMany(db.walletConnection, { foreignKey: 'user_id', as: 'walletConnections' });
  db.walletConnection.belongsTo(db.user, { foreignKey: 'user_id', as: 'user' });

  db.user.hasMany(db.referral, { foreignKey: 'referrer_id', as: 'referralsMade' });
  db.user.hasMany(db.referral, { foreignKey: 'referred_id', as: 'referralsReceived' });
  db.referral.belongsTo(db.user, { foreignKey: 'referrer_id', as: 'referrer' });
  db.referral.belongsTo(db.user, { foreignKey: 'referred_id', as: 'referred' });

  db.user.hasOne(db.userPoints, { foreignKey: 'user_id', as: 'points' });
  db.userPoints.belongsTo(db.user, { foreignKey: 'user_id', as: 'user' });

  module.exports = db;