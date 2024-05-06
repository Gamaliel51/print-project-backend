const express = require('express')
const  multer = require('multer')
const cors = require('cors')
const Flutterwave = require('flutterwave-node-v3')
const path = require('path')
const { Blob, Buffer } = require('buffer')
const {DocxCounter, PdfCounter} = require('page-count')
require('dotenv').config()

const authRoute = require('./routes/auth')
const { checkAuth } = require('./controller/authMiddleware')
const Student = require('./models/Student')
const PrintRecord = require('./models/PrintRecord')

const flw = new Flutterwave(process.env.FLW_PUBLIC_KEY, process.env.FLW_SECRET_KEY  );

const app = express()

app.use(express.static(path.join(__dirname + "/dist")))
app.use(cors())
app.use(express.urlencoded({extended: true}))
app.use(express.json())

app.use('/auth', authRoute)

const storage = multer.memoryStorage()
const upload = multer({storage: storage})

const folderName = '/PrintFiles'


app.get('/studentinfo', cors(), checkAuth, async (req, res) => {
    const user = await Student.findOne({where: {matric: req.user.username}})
    if(user){
        return res.json({status: 'success', matric: user.matric, email: user.email, credits: user.credits, account: user.account, bank: user.bank, history: user.history})
    }
    res.json({status: "fail", error: "No Such User"})
})


app.post('/getpagenum', upload.array('files', 1), async (req, res) => {
    const file = req.files[0]
    const pages = await DocxCounter.count(file.buffer)
    res.json({num: pages})
})


app.post('/withdraw', cors(), checkAuth, async (req, res) => {
    const {amount} = req.body
    console.log("AMOUNT: ", amount, Number(amount))
    const user = await Student.findOne({where: {matric: req.user.username}})
    if(user){
        if(amount > user.credits){
            return res.json({status: 'fail', error: 'insufficient funds'})
        }

        try {
            const payload = {
            "account_bank": user.bank,
            "account_number": user.account,
            "amount": Number(amount),
            "narration": "CU Print withdrawal",
            "currency": "NGN",
            "reference": `${user.matric}-${Date.now()}`,
        }
    
            const response = await flw.Transfer.initiate(payload)
            console.log(response);
            if(response.message === 'This request cannot be processed. pls contact your account administrator'){
                const credits = user.credits - amount
                user.credits = credits
                await user.save()

                return res.json({status: 'success'})
            }
            if(response.status === 'success'){
                const credits = user.credits - amount
                user.credits = credits
                await user.save()

                return res.json({status: 'success'})
            }
        } catch (error) {
            console.log(error)
        }
    }
    res.json({status: "fail", error: "No Such User"})
})


app.post('/addpayment', async (req, res) => {
    try{
        const payload = req.body
        console.log("PAYLOAD: ", payload)

        if(payload.status === "successful"){
            const id = payload.customer.fullName
            const user = await Student.findOne({where: {matric: id.replace('Customer', '').replace(' ', '')}})
            if(user){
                let credit = user.credits
                const pay = Number(payload.amount)
                credit = credit + pay
                user.credits = credit
                await user.save()
            }
        }
    }
    catch(error){
        console.error(error)
    }
    finally{
        res.status(200).end()
    }
})


app.post('/printdoc', upload.array('files', 1), checkAuth, async (req, res) => {
    const file = req.files[0]
    const matric = req.user.username
    let doctype = ''
    let count = 0
    if(file.originalname.includes('pdf')){
        count = await PdfCounter.count(file.buffer)
        doctype = 'pdf'
    }
    if(file.originalname.includes('docx') || file.originalname.includes('doc')){
        count = await DocxCounter.count(file.buffer)
        doctype = 'docx'
    }
    const cost = count * 50

    const user = await Student.findOne({where: {matric: matric}})

    let credits = user.credits

    if(cost > credits){
        return res.json({status: 'fail', error: 'insufficient funds'})
    }

    credits = credits - cost
    user.credits = credits

    let temp = Object.assign([], user.history)
    temp.push(`${matric}-${file.originalname}`)
    user.history = temp
    await user.update({history: user.history})

    await user.save()

    // if (!fs.existsSync(folderName)) {
    //     fs.mkdirSync(folderName);
    // }

    // fs.createWriteStream(`${folderName}/${matric}-${file.originalname}`).write(file.buffer)

    const fileBlob = new Blob([file.buffer])

    const record = await PrintRecord.create({matric: matric, documentpath: file.buffer, doctype: doctype, docname: `${matric}-${file.originalname}`, printed: 'false'})
    await record.save()
    
    res.json({status: "success"})
})

app.post('/getdocbuffer', async (req, res) => {
    const body = req.body
    const docname = body.docname

    const record = await PrintRecord.findOne({where: {docname: docname}})
    if(!record){
        return res.status(400)
    }
    const blob = record.documentpath
    console.log('BLOB: ', blob, " TYPE: ", typeof(blob))
    const buffer = Buffer.from(blob)
    console.log('BUFFER: ', buffer, " TYPE: ", typeof(buffer))
    res.end(buffer)

})

app.get('/getdocs', async (req, res) => {
    const records = await PrintRecord.findAll()
    console.log("RECORDS: ", records)
    const new_records = records.map((record) => {
        return {matric: record.matric, doctype: record.doctype, docname: record.docname, printed: record.printed}
    })
    console.log("NEW RECORDS: ", new_records)
    res.json({status: 'success', data: new_records})
})

app.get('/*', function(req,res) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get("*", (req, res) => {
    res.send("Error")
})


app.listen(process.env.PORT)