//models/referral.js
module.exports = (sequelize, DataTypes) => {
    const Referral = sequelize.define("referrals", {
        id: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        referrer_id: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            comment: 'User who made the referral'
        },
        referred_id: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            comment: 'User who was referred'
        },
        referral_code: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'The referral code used'
        },
        points_earned: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            defaultValue: 100,
            comment: 'Points earned by referrer'
        },
        status: {
            type: DataTypes.ENUM('pending', 'completed', 'cancelled'),
            allowNull: false,
            defaultValue: 'pending',
            comment: 'Status of the referral'
        },
        completed_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'When the referral was completed'
        },
        created_at: {
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
                fields: ['referred_id']
            },
            {
                fields: ['referrer_id']
            },
            {
                fields: ['referral_code']
            },
            {
                fields: ['status']
            }
        ]
    });

    // Define associations
    Referral.associate = (models) => {
        Referral.belongsTo(models.User, {
            foreignKey: 'referrer_id',
            as: 'referrer'
        });
        Referral.belongsTo(models.User, {
            foreignKey: 'referred_id',
            as: 'referred'
        });
    };

    return Referral;
};
