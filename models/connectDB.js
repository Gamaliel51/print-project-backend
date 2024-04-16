const { Sequelize } = require('sequelize')
require('dotenv').config()



const sequelize = new Sequelize(process.env.DATABASE, process.env.DATABASE_USER, process.env.DATABASE_PASSWORD, {
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    dialect: 'postgres',
    dialectOptions: {
        ssl: false
    }
})

sequelize.authenticate().then(() => {
    console.log('Connected Successfully')
})

module.exports = sequelize