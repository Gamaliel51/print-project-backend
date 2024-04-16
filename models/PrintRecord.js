const { DataTypes } = require('sequelize')
const sequelize = require('./connectDB')

const PrintRecord = sequelize.define('PrintRecord', {
    matric: {
        type: DataTypes.STRING
    },
    documentpath: {
        type: DataTypes.STRING
    },
    doctype: {
        type: DataTypes.STRING
    },
    printed: {
        type: DataTypes.STRING
    },
})

PrintRecord.sync()

module.exports = PrintRecord