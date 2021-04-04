const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const md5 = require("md5");
const fetch = require("node-fetch");
const neatCsv = require("neat-csv");
const cron  = require('node-cron');
const axios = require('axios')

const firebase = require("firebase");
require("firebase/firestore");

var admin = require("firebase-admin");
var serviceAccount = require("./creds.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
var db = admin.firestore();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
var date = new Date().toISOString().split("T")[0];

app.get("/", (req, res) => {
  // db.collection('users').add({
  //     email:"jishantacharya@gmail.com",
  //     password:"sjdflkdsjkldsgddsflgkj"
  // }).then(res =>{
  //     console.log(res.id)
  //     db.collection('users').get().then(snapshot =>{
  //         snapshot.forEach(snap => console.log(snap.data()))
  //     })
  // })
  res.send("Hello World");
});

app.post("/login", (req, res) => {
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
            .add({ email: req.body.email, password: md5(req.body.password) })
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
  fetch(file_location)
    .then((res) => res.text())
    .then((body) =>
      neatCsv(body).then((parsedData) => {
        res.json({
          data: parsedData,
        });
      })
    );
});

app.get("/test_endpoint", (req, res) => {
  var url =
    "https://newsapi.org/v2/everything?" +
    "q=Apple&" +
    "from=2021-04-02&" +
    "sortBy=popularity&" +
    "apiKey=187f701335b24b4c8fe92ccb0d639b43";
  
  fetch(url)
  .then(res => res.json())
  .then((body) => {
    res.json(body)
  })
});


// app.get("/schedule_test",(req,res)=>{
//   var api_key = "&apiKey=187f701335b24b4c8fe92ccb0d639b43";
//   var country = "?country=in&category=business";
//   var page_size = "&pageSize=100";
//   var lang = "&language=en";
//   var base_url = "https://newsapi.org/v2";

//   var headline_url = base_url+"/top-headlines"+country+page_size+lang+api_key;
//   var apple = base_url+"/everything?q=apple"+page_size+lang+"&sortBy=publishedAt"+api_key
//   var tesla = base_url+"/everything?q=tesla"+page_size+lang+"&sortBy=publishedAt"+api_key
//   var facebook = base_url+"/everything?q=facebook"+page_size+lang+"&sortBy=publishedAt"+api_key
//   var nvidia = base_url+"/everything?q=nvidia"+page_size+lang+"&sortBy=publishedAt"+api_key
//   var qualcomm = base_url+"/everything?q=qualcomm"+page_size+lang+"&sortBy=publishedAt"+api_key

//   var req_headlines = axios.get(headline_url)
//   var req_apple = axios.get(apple)
//   var req_tesla = axios.get(tesla)
//   var req_facebook = axios.get(facebook)
//   var req_nvidia = axios.get(nvidia)
//   var req_qualcomm = axios.get(qualcomm)

//   axios.all([req_headlines,req_apple,req_tesla,req_facebook,req_nvidia,req_qualcomm])
//   .then(axios.spread((...result) => {
//     const headlines_data = result[0].data;
//     const apple_data = result[1].data;
//     const tesla_data = result[2].data;
//     const facebook_data = result[3].data;
//     const nvidia_data = result[4].data;
//     const qualcomm_data = result[5].data;

//     var add_headline = new Promise((resolve,reject) => {
//       db.collection('news')
//       .doc("headlines_"+date)
//       .set(headlines_data)
//       .then(() => resolve("Added Headline"))
//       .catch(err => reject(err))
//     })
//     var add_apple = new Promise((resolve,reject)=>{
//       db.collection('news')
//       .doc("apple_"+date)
//       .set(apple_data)
//       .then(() => resolve("Added Apple")).catch(err => reject(err))
//     })

//     var add_tesla = new Promise((resolve,reject)=>{
//       db.collection("news").doc("tesla_"+date).set(tesla_data)
//       .then(res => resolve("Added Tesla"))
//       .catch(err => reject(err))
//     })

//     var add_facebook = new Promise((resolve,reject) => {
//       db.collection('news').doc("facebook_"+date).set(facebook_data)
//       .then(() => resolve("Added Facebook")).catch(err => reject(err))
//     })

//     var add_nvidia = new Promise((resolve,reject)=>{
//       db.collection('news').doc("nvidia_"+date).set(nvidia_data)
//       .then(() => resolve("Added Nvidia")).catch(err => reject(err))
//     })

//     var add_qualcomm = new Promise((resolve,reject) =>{
//       db.collection('news').doc("qualcomm_"+date).set(qualcomm_data)
//       .then(() => resolve("Added Qualcomm")).catch(err => reject(err))
//     })

//     Promise.all([add_headline,add_apple,add_facebook,add_tesla,add_qualcomm,add_nvidia])
//     .then(data => res.json({"result_list":data}))
//     .catch(err => res.json({err}))
//   }))
// })


cron.schedule("0 9 * * *",()=>{
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
      .doc("headlines_"+date)
      .set(headlines_data)
      .then(() => resolve("Added Headline"))
      .catch(err => reject(err))
    })
    var add_apple = new Promise((resolve,reject)=>{
      db.collection('news')
      .doc("apple_"+date)
      .set(apple_data)
      .then(() => resolve("Added Apple")).catch(err => reject(err))
    })

    var add_tesla = new Promise((resolve,reject)=>{
      db.collection("news").doc("tesla_"+date).set(tesla_data)
      .then(res => resolve("Added Tesla"))
      .catch(err => reject(err))
    })

    var add_facebook = new Promise((resolve,reject) => {
      db.collection('news').doc("facebook_"+date).set(facebook_data)
      .then(() => resolve("Added Facebook")).catch(err => reject(err))
    })

    var add_nvidia = new Promise((resolve,reject)=>{
      db.collection('news').doc("nvidia_"+date).set(nvidia_data)
      .then(() => resolve("Added Nvidia")).catch(err => reject(err))
    })

    var add_qualcomm = new Promise((resolve,reject) =>{
      db.collection('news').doc("qualcomm_"+date).set(qualcomm_data)
      .then(() => resolve("Added Qualcomm")).catch(err => reject(err))
    })

    Promise.all([add_headline,add_apple,add_facebook,add_tesla,add_qualcomm,add_nvidia])
    .then(data => res.json({"result_list":data}))
    .catch(err => res.json({err}))
  }))
},{scheduled:true,timezone:"Asia/Kolkata"})


app.listen(PORT, () => console.log("Server is running at " + PORT));
