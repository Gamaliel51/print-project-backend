const { DataTypes } = require('sequelize')
const sequelize = require('./connectDB')

const Printer = sequelize.define('Printer', {
    username: {
        type: DataTypes.STRING
    },
    password: {
        type: DataTypes.STRING
    }
})

Printer.sync()

module.exports = Printer