//models/walletConnection.js
module.exports = (sequelize, DataTypes) => {
    const WalletConnection = sequelize.define("wallet_connections", {
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
        wallet_type: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'MetaMask'
        },
        wallet_address: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true
        },
        balance: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Wallet balance in native token (e.g., ETH)'
        },
        balance_usd: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            comment: 'Balance value in USD'
        },
        network: {
            type: DataTypes.STRING(50),
            allowNull: true,
            defaultValue: 'Ethereum',
            comment: 'Blockchain network (Ethereum, Polygon, etc.)'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        connected_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
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
                fields: ['user_id', 'wallet_address']
            },
            {
                fields: ['user_id']
            },
            {
                fields: ['wallet_address']
            }
        ]
    });

    // Define association with User model
    WalletConnection.associate = (models) => {
        WalletConnection.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user'
        });
    };

    return WalletConnection;
};
