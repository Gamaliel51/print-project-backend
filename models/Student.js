const { DataTypes } = require('sequelize')
const sequelize = require('./connectDB')

const Student = sequelize.define('Student', {
    matric: {
        type: DataTypes.STRING
    },
    password: {
        type: DataTypes.STRING
    },
    email: {
        type: DataTypes.STRING
    },
    credits: {
        type: DataTypes.INTEGER
    },
    account: {
        type: DataTypes.STRING
    },
    history: {
        type: DataTypes.ARRAY(DataTypes.TEXT)
    }
})

Student.sync()

module.exports = Student