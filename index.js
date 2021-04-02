const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const md5 = require('md5')
const fetch = require('node-fetch')
const neatCsv = require('neat-csv')

const firebase = require("firebase");
require("firebase/firestore")

var admin = require("firebase-admin");
var serviceAccount = require("./creds.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
var db = admin.firestore();

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

const PORT = process.env.PORT || 3000

app.get("/",(req,res)=>{
    // db.collection('users').add({
    //     email:"jishantacharya@gmail.com",
    //     password:"sjdflkdsjkldsgddsflgkj"
    // }).then(res =>{
    //     console.log(res.id)
    //     db.collection('users').get().then(snapshot =>{
    //         snapshot.forEach(snap => console.log(snap.data()))
    //     })
    // })
    res.send("Hello World")
})

app.post("/login",(req,res)=>{
    if(req.body.email !== "" && req.body.email !== undefined && req.body.password !== "" && req.body.password !== undefined)
    {
        db.collection('users')
        .where("email","==",req.body.email)
        .where("password","==",md5(req.body.password))
        .get()
        .then(snapshot => {
            if(snapshot.empty)
            {
                res.json({
                    status:"fail",
                    msg: "Not found"
                })
            }
            else{
                res.json({
                    status:"success",
                    msg:"Login Creds Match"
                })
            }
        })
    }
    else{
        res.json({
            status:"fail",
            msg:"Incomplete request"
        })
    }

})

app.post("/signup",(req,res)=>{
    if(req.body.email !== "" && req.body.email !== undefined && req.body.password !== "" && req.body.password !== undefined)
    {
        db.collection('users')
        .where("email","==",req.body.email)
        .get()
        .then(snapshot=>{
            if(snapshot.empty)
            {
                db.collection('users')
                .add({email:req.body.email,password:md5(req.body.password)})
                .then(response =>{
                    res.json({
                        status:"success",
                        msg:"User added successfully",
                        id:response.id
                    })
                })
            }
            else{
                res.json({
                    status:"fail",
                    msg:"User already exists"
                })
            }
        })
    }
    else{
        res.json({
            status:"fail",
            msg:"Incomplete request"
        })
    }
})


app.post("/get_file",(req,res)=>{
    var file_location = req.body.file_location
    fetch(file_location)
    .then((res)=>res.text())
    .then(body=>neatCsv(body)
        .then((parsedData)=>{
            res.json({
                "data":parsedData
            })
        }))
})


app.listen(PORT,()=>console.log("Server is running at " + PORT))