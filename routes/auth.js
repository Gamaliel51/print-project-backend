const express = require('express')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const router = express.Router()
require('dotenv').config()

const {checkAuth} = require('../controller/authMiddleware')
const Student = require('../models/Student')


router.post('/login', checkAuth, async (req, res) => {
    const { username, password } = req.body

    if(req.user){
        return res.json({status: 'success', message: 'loggedin'})
    }

    const user = await Student.findOne({where: {matric: username.toLowerCase()}})

    if(user){
        const passcheck  = await bcrypt.compare(password, user.password)
        console.log('pascheck: ', passcheck)
        if(passcheck){
            const token = jwt.sign({username: user.matric}, process.env.ACCESS_KEY, {expiresIn: '1d'})
            return res.json({status: 'success', accessToken: token})
        }
        return res.json({status: 'fail', error: 'wrong username or password'})
    }
    else{
        console.log("I AM HERE")
        res.json({status: 'fail', error: 'wrong username or password'})
    }
})
.post('/signup', async (req, res) => {
    const  { username, password, email } = req.body

    const in_use = await Student.findOne({where: {matric: username.toLowerCase()}})
    if(in_use){
        return res.json({status: 'fail', error: 'username already in use'})
    }

    const hashedPass = await bcrypt.hash(password, 10)

    const user = await Student.create({matric: username.toLowerCase(), password: hashedPass, email: email, credits: 0, history: []})
    await user.save()

    res.json({status: 'success'})
})
.post('/update', checkAuth, async (req, res) => {
    const  { username, password, email } = req.body

    if(username.toLowerCase() !== req.user.username){
        return res.json({status: 'fail', error: 'you cannot change your matric number'})
    }

    const user = await Student.findOne({where: {matric: req.user.username}})

    let hashedPass = ""

    if(password === ""){
        hashedPass = user.password
    }
    else{
        hashedPass = await bcrypt.hash(password, 10)
    }

    await user.update({matric: req.user.username, password: hashedPass, email: email, credits: user.credits, history: user.history})

    res.json({status: 'success'})
})

module.exports = router