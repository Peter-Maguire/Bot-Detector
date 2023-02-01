const express = require('express');
const jwt = require('jsonwebtoken');
const Ably = require('ably');
const ably = new Ably.Realtime({key: process.env.ABLY_KEY});
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const Session = require("./session");
const app = express()
const port = 3000



let sessions = {};

app.use(express.static('dist'))
app.use(cookieParser())
app.post("/auth", bodyParser.urlencoded({extended: true}), (req, res)=>{
    console.log("Auth request");
    let cookie = req.cookies.cisld;
    let session = new Session(ably, req.header['x-auth'], req.body.key);
    if(sessions[cookie]){
        if(!sessions[cookie].destroyed) {
            console.log("Session was interrupted");
            session.sins.wasInterruptedSession = true;
            sessions[cookie].destroy();
        }
        delete sessions[cookie];
    }
    sessions[session.sessionCookie] = session;
    // console.log(req.headers);
    // console.log(req.body);
    ably.auth.requestToken({'clientId': session.ablyClientId}, (err, tokenDetails)=>{
       if(err){
           return res.json({err});
       }
       let token = tokenDetails.token;

       let jtoken = jwt.sign({
           encryptionKey: session.ablyEncryptionPublicKey.toString("base64"),
           channelName: session.ablyChannelName,
           'x-ably-capability': tokenDetails.capability,
           iat: new Date().getTime(),
           exp: new Date().getTime()+3600,
       }, process.env.ABLY_KEY, {
           algorithm: 'HS256',
           header: {
               'typ': "JWT",
               'x-ably-token': token,
           }
       });
       res.cookie("cisld", session.sessionCookie)
       res.set('content-type', 'text/plain');
       res.send(jtoken);
    });
});

app.get('/fake_image.png', (req, res)=>{
    let cookie = req.cookies.cisld;
    console.log("Fake image requested", cookie);
    if(sessions[cookie]){
        console.log("Cookie ", cookie);
        sessions[cookie].sins.didRequestImage = true;
    }else{
        console.log("Session not existing");
    }
    res.status(404).send("cannot GET /fake_image.png");
})

app.get('/sample.pdf', (req, res)=>{
    let cookie = req.cookies.cisld;
    console.log("Sample.pdf requested", cookie);
    if(sessions[cookie]){
        console.log("Cookie ", cookie);
        sessions[cookie].sins.didRequestPdf = true;
    }else{
        console.log("Session not existing");
    }
    res.status(200).send("I bet you thought there'd be a PDF here didn't you? Mysterious!");
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
});