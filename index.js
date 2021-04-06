const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const md5 = require("md5");
const fetch = require("node-fetch");
const neatCsv = require("neat-csv");
const cron  = require('node-cron');
const axios = require('axios')
const cors = require('cors')
var FormData = require('form-data');

const firebase = require("firebase");
require("firebase/firestore");
var admin = require("firebase-admin");
var serviceAccount = require("./creds.json");
const { response } = require("express");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
var db = admin.firestore();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors())

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.post("/login", (req, res) => {
  console.log(req.body);
  if (
    req.body.email !== "" &&
    req.body.email !== undefined &&
    req.body.password !== "" &&
    req.body.password !== undefined
  ) {
    db.collection("users")
      .where("email", "==", req.body.email)
      .where("password", "==", md5(req.body.password))
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
          res.json({
            status: "fail",
            msg: "Not found",
          });
        } else {
          res.json({
            status: "success",
            msg: "Login Creds Match",
          });
        }
      });
  } else {
    res.json({
      status: "fail",
      msg: "Incomplete request",
    });
  }
});

app.post("/signup", (req, res) => {
  console.log(req.body)
  if (
    req.body.email !== "" &&
    req.body.email !== undefined &&
    req.body.password !== "" &&
    req.body.password !== undefined
  ) {
    db.collection("users")
      .where("email", "==", req.body.email)
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
          db.collection("users")
            .add({ email: req.body.email, password: md5(req.body.password),firstname:req.body.firstname,lastname:req.body.lastname })
            .then((response) => {
              res.json({
                status: "success",
                msg: "User added successfully",
                id: response.id,
              });
            });
        } else {
          res.json({
            status: "fail",
            msg: "User already exists",
          });
        }
      });
  } else {
    res.json({
      status: "fail",
      msg: "Incomplete request",
    });
  }
});

app.post("/get_file", (req, res) => {
  var file_location = req.body.file_location;
  console.log(file_location)
  fetch(file_location)
    .then((res) => res.text())
    .then((body) =>
      neatCsv(body).then((parsedData) => {
        res.json({
          "data":parsedData.splice(parsedData.length-50)
        })
      })
    );
});


app.get("/schedule_test",(req,res)=>{

  var today = new Date();
  var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();

  var api_key = "&apiKey=187f701335b24b4c8fe92ccb0d639b43";
  var country = "?country=in&category=business";
  var page_size = "&pageSize=100";
  var lang = "&language=en";
  var base_url = "https://newsapi.org/v2";

  var headline_url = base_url+"/top-headlines"+country+page_size+lang+api_key;
  var apple = base_url+"/everything?q=apple"+page_size+lang+"&sortBy=publishedAt"+api_key
  var tesla = base_url+"/everything?q=tesla"+page_size+lang+"&sortBy=publishedAt"+api_key
  var facebook = base_url+"/everything?q=facebook"+page_size+lang+"&sortBy=publishedAt"+api_key
  var nvidia = base_url+"/everything?q=nvidia"+page_size+lang+"&sortBy=publishedAt"+api_key
  var qualcomm = base_url+"/everything?q=qualcomm"+page_size+lang+"&sortBy=publishedAt"+api_key

  var req_headlines = axios.get(headline_url)
  var req_apple = axios.get(apple)
  var req_tesla = axios.get(tesla)
  var req_facebook = axios.get(facebook)
  var req_nvidia = axios.get(nvidia)
  var req_qualcomm = axios.get(qualcomm)

  axios.all([req_headlines,req_apple,req_tesla,req_facebook,req_nvidia,req_qualcomm])
  .then(axios.spread((...result) => {
    const headlines_data = result[0].data;
    const apple_data = result[1].data;
    const tesla_data = result[2].data;
    const facebook_data = result[3].data;
    const nvidia_data = result[4].data;
    const qualcomm_data = result[5].data;

    var add_headline = new Promise((resolve,reject) => {
      db.collection('news')
      .add({"index":"headlines_"+date,"data":headlines_data})
      .then(() => resolve("Added Headline"))
      .catch(err => reject(err))
    })
    var add_apple = new Promise((resolve,reject)=>{
      db.collection('news')
      .add({"index":"apple_"+date,"data":apple_data})
      .then(() => resolve("Added Apple")).catch(err => reject(err))
    })

    var add_tesla = new Promise((resolve,reject)=>{
      db.collection("news")
      .add({"index":"tesla_"+date,"data":tesla_data})
      .then(res => resolve("Added Tesla"))
      .catch(err => reject(err))
    })

    var add_facebook = new Promise((resolve,reject) => {
      db.collection('news').add({"index":"facebook_"+date,"data":facebook_data})
      .then(() => resolve("Added Facebook")).catch(err => reject(err))
    })

    var add_nvidia = new Promise((resolve,reject)=>{
      db.collection('news').add({"index":"nvidia_"+date,"data":nvidia_data})
      .then(() => resolve("Added Nvidia")).catch(err => reject(err))
    })

    var add_qualcomm = new Promise((resolve,reject) =>{
      db.collection('news').add({"index":"qualcomm_"+date,"data":qualcomm_data})
      .then(() => resolve("Added Qualcomm")).catch(err => reject(err))
    })

    Promise.all([add_headline,add_apple,add_facebook,add_tesla,add_qualcomm,add_nvidia])
    .then(data => res.json({data}))
    .catch(err => res.json({err}))
  }))
})


app.post("/read_firebase",async (req,res)=>{
  var today = new Date();
  var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();

  if(req.body.company !== "")
  {
    db.collection('news')
    .where("index","==",req.body.company+"_"+date)
    .get()
    .then((snapshot) => {
      var data = [];
      if(snapshot.empty){
        res.json({"msg":"Couldn't find the index"})
      }
      else{
        snapshot.forEach(snap =>{
          data.push(snap.data())
        })
        res.json({
          data
        })
      }
    })
  }
  else{
    res.json({
      "msg":"Incomplete Request"
    })
  }
})

app.get("/get_sentiments/:company",(req,res)=>{
  var today = new Date();
  var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
  var company = req.params.company;
  db.collection("sentiment_score")
  .where("index","==",company+"_"+date)
  .get()
  .then(snapshot => {
    if(snapshot.empty)
    {
      res.json({
        "status":"fail",
        "msg":"Index Not Found"
      })
    }
    else{
      var data = [];
      snapshot.forEach(snap=>{
        data.push(snap.data())
      })
      res.json({
        data
      })
    }
  })
})

app.get("/calculate_sentiments/:company", async (req,res)=>{
  console.log("REACHED HERE")
  var today = new Date();
  var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
  db.collection("news").where("index","==",req.params.company+"_"+date)
  .get()
  .then(snapshot => {
    var data = []
    var data_array = []
    if(snapshot.empty)
    {
      res.json({
        "msg":"Index not found"
      })
    }
    else{
      snapshot.forEach(snap=>{
        data.push(snap.data().data.articles)
      })
      data[0].forEach(listItem =>{
        if(listItem.content !== null)
        {
          data_array.push(listItem.content)
        }
        else if(listItem.content === null && listItem.description !== null){
          data_array.push(listItem.description)
        }
      })
      let formData = new FormData();
      var data_to_be_sent = JSON.stringify(data_array);
      formData.append("sentences",data_to_be_sent)
      fetch("http://20.55.103.133/bert_financeimdb",{
        method:"POST",
        body: formData
      })
      .then(res => res.json())
      .then(data => {
        var total_len = data['prediction'].length
        var pos_per = 0;
        var neg_per = 0;
        var neu_per = 0;
        data['prediction'].forEach(prediction => {
          if(prediction === "positive")
          {
            pos_per = pos_per + 1;
          }
          else if(prediction === "negative"){
            neg_per = neg_per + 1;
          }
          else{
            neu_per = neu_per + 1;
          }
        })
        db.collection("sentiment_score").add({
          "index" : req.params.company+"_"+date,
          "pos_percentage" : ((pos_per/total_len) * 100).toString(),
          "neg_percentage" : ((neg_per/total_len) * 100).toString(),
          "neu_percentage" : ((neu_per/total_len) * 100).toString()
        }).then(response =>{
          res.json({
            id: response.id,
            "msg":"Sentiment Calculated Successfully"
          })
        })
      })
    }
  }).catch(err => {
    console.log(err)
    res.send("ERROR")
  })
})


cron.schedule("0 9 * * *",()=>{

  console.log("This took place after a minute")
  var today = new Date();
  var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();

  var api_key = "&apiKey=187f701335b24b4c8fe92ccb0d639b43";
  var country = "?country=in&category=business";
  var page_size = "&pageSize=100";
  var lang = "&language=en";
  var base_url = "https://newsapi.org/v2";

  var headline_url = base_url+"/top-headlines"+country+page_size+lang+api_key;
  var apple = base_url+"/everything?q=apple"+page_size+lang+"&sortBy=publishedAt"+api_key
  var tesla = base_url+"/everything?q=tesla"+page_size+lang+"&sortBy=publishedAt"+api_key
  var facebook = base_url+"/everything?q=facebook"+page_size+lang+"&sortBy=publishedAt"+api_key
  var nvidia = base_url+"/everything?q=nvidia"+page_size+lang+"&sortBy=publishedAt"+api_key
  var qualcomm = base_url+"/everything?q=qualcomm"+page_size+lang+"&sortBy=publishedAt"+api_key

  var req_headlines = axios.get(headline_url)
  var req_apple = axios.get(apple)
  var req_tesla = axios.get(tesla)
  var req_facebook = axios.get(facebook)
  var req_nvidia = axios.get(nvidia)
  var req_qualcomm = axios.get(qualcomm)

  axios.all([req_headlines,req_apple,req_tesla,req_facebook,req_nvidia,req_qualcomm])
  .then(axios.spread((...result) => {
    const headlines_data = result[0].data;
    const apple_data = result[1].data;
    const tesla_data = result[2].data;
    const facebook_data = result[3].data;
    const nvidia_data = result[4].data;
    const qualcomm_data = result[5].data;

    var add_headline = new Promise((resolve,reject) => {
      db.collection('news')
      .add({"index":"headlines_"+date,"data":headlines_data})
      .then(() => resolve("Added Headline"))
      .catch(err => reject(err))
    })
    var add_apple = new Promise((resolve,reject)=>{
      db.collection('news')
      .add({"index":"apple_"+date,"data":apple_data})
      .then(() => resolve("Added Apple")).catch(err => reject(err))
    })

    var add_tesla = new Promise((resolve,reject)=>{
      db.collection("news")
      .add({"index":"tesla_"+date,"data":tesla_data})
      .then(res => resolve("Added Tesla"))
      .catch(err => reject(err))
    })

    var add_facebook = new Promise((resolve,reject) => {
      db.collection('news').add({"index":"facebook_"+date,"data":facebook_data})
      .then(() => resolve("Added Facebook")).catch(err => reject(err))
    })

    var add_nvidia = new Promise((resolve,reject)=>{
      db.collection('news').add({"index":"nvidia_"+date,"data":nvidia_data})
      .then(() => resolve("Added Nvidia")).catch(err => reject(err))
    })

    var add_qualcomm = new Promise((resolve,reject) =>{
      db.collection('news').add({"index":"qualcomm_"+date,"data":qualcomm_data})
      .then(() => resolve("Added Qualcomm")).catch(err => reject(err))
    })

    Promise.all([add_headline,add_apple,add_facebook,add_tesla,add_qualcomm,add_nvidia])
    .then(data => console.log(data))
    .catch(err => console.log(err))
  }))
},{scheduled:true,timezone:"Asia/Kolkata"})


app.listen(PORT, () => console.log("Server is running at " + PORT));
