//models/userPoints.js
module.exports = (sequelize, DataTypes) => {
    const UserPoints = sequelize.define("user_points", {
        id: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        total_points: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            defaultValue: 0,
            comment: 'Total points earned by user'
        },
        referral_points: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            defaultValue: 0,
            comment: 'Points earned from referrals'
        },
        activity_points: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            defaultValue: 0,
            comment: 'Points earned from activities'
        },
        last_updated: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    }, {
        timestamps: false,
        underscored: true,
        indexes: [
            {
                unique: true,
                fields: ['user_id']
            },
            {
                fields: ['total_points']
            }
        ]
    });

    // Define associations
    UserPoints.associate = (models) => {
        UserPoints.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user'
        });
    };

    return UserPoints;
};
