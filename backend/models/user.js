//models/user.js
module.exports = (sequelize,DataTypes) => {
    const User = sequelize.define("users", {
        id: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        full_name: {
            type: DataTypes.STRING
        },
        email: {
            type: DataTypes.STRING
        },
        password: {
            type: DataTypes.STRING
        },
        is_active: {
            type: DataTypes.INTEGER(11),
            defaultValue: 1
        },
        referral_code: {
            type: DataTypes.STRING(20),
            allowNull: true,
            unique: true,
            comment: 'Unique referral code for this user'
        },
    }, {
        timestamps: true,
        underscored: true
    });
      
    return User;
}