const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
require("dotenv").config();
const cookieParser = require("cookie-parser");
const crypto = require('crypto');
const cors = require("cors");

//Cloudinary application
const cloudinary = require("cloudinary").v2;

const cloudinaryConfig = cloudinary.config({
    cloud_name: process.env.CLOUDNAME,
    api_key: process.env.CLOUDAPIKEY,
    api_secret: process.env.CLOUDINARYSECRET,
    secure: true
})

//Express application
const express = require("express");
const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('public'))
app.use(express.static('css'));
app.set("view engine", "pug");
app.use(express.json());
app.use(cookieParser());
app.use(cors({origin: 'http://localhost:3000', credentials: true}));

//Mongoose application
const mongoose = require("mongoose");
const users = require("./mongoose-schema/user");
const songs = require("./mongoose-schema/song");
const likes = require("./mongoose-schema/like");
const comments = require("./mongoose-schema/comment");
const recordLabels = require("./mongoose-schema/record-label");

const PORT = 5000;

mongoose.set(`strictQuery`, false);

const connectDB = async () => {
    try{
        const conn = await mongoose.connect(`mongodb+srv://zanithmanagement:${process.env.MONGOOSE_SECRET}@zanith.cumewc0.mongodb.net/?retryWrites=true&w=majority`, {useNewUrlParser: true});
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}

let db = mongoose.connection;

//Renders the home page.
app.get("/", (req, res) => {
    res.send("API is working properly");
});

app.get("/root", validate, async (req, res) => {
    res.send({username: req.username});
});

//Renders the home page.
app.get("/home", validate, async (req, res) => {
    let songs = await db.collection("songs").find({username: "MrObvious"}).toArray();
    let like = await db.collection("likes").find({username: req.username}).toArray();

    res.send({songs, like});
});

//Renders the profile page.
app.get("/profile/:artistName", validate, async (req, res) => {
    let artistName = req.params.artistName.toString();
    
    let songs = await db.collection("songs").find({username: artistName}).toArray();
    let like = await db.collection("likes").find({username: req.username}).toArray();

    res.send({songs, like});
});


app.get("/search/:result/", validate, async (req, res) => {
	let result = req.params.result;

	let songsResult = await db.collection("songs").find({$or: [{title: result}, {username: result}]}).toArray();
    let artistResult = await db.collection("users").find({username: result}).toArray();
    let like = await db.collection("likes").find({username: req.username}).toArray();
    let artistName = "";

    if(artistResult.length !== 0){
        artistName = artistResult[0].username;
    }

	res.send({songs: songsResult, artist: artistName, like: like});
});

//POST request for signup
app.post("/signup", async (req, res) => {
    let searchUsernameArray = await db.collection("users").find({username: req.body.username}).toArray();

    //Determine if the username has been taken or not.
    if(searchUsernameArray.length === 0){
        let hashedPassword = await bcrypt.hash(req.body.password, 10);
        let sessionId = crypto.randomUUID();

        await users.create({username: req.body.username, password: hashedPassword, email: req.body.email, admin: false, moderator: false, recordLabel: false, sessionId: sessionId});
        res.set('Set-Cookie', `sessionId=${sessionId}`);

        res.sendStatus(201).end();
    }
    else{
        res.status(400).end();
    }
});

//POST request for login
app.post("/login", async (req, res) => {
    let searchUserArray = await db.collection("users").find({username: req.body.username}).toArray();

    //Determine if the username is in the database and if the password match the password in the database.
    if(searchUserArray.length !== 0){
        if(await bcrypt.compare(req.body.password, searchUserArray[0].password)){
            let sessionId = crypto.randomUUID();

            await db.collection("users").updateOne({username: req.body.username}, {$push: {sessionId: sessionId}});

            res.cookie('sessionId', sessionId, {
                httpOnly: false
            })
            
            res.sendStatus(201).end();
        }else{
            res.sendStatus(404).end();
        }
    }else{
        res.status(400).end();
    }
});

app.post("/logout", async (req, res) =>{
    await db.collection("users").updateOne({username: req.username}, {$pull: {sessionId: req.sessionId}});
    res.set('Set-Cookie', 'sessionId=; expires=Thu, 01 Jan 1970 00:00:00 GMT');

    res.end();
});

//Get signature from Cloudinary
app.get("/signature", validate, (req, res)=>{
    let username = req.username;
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
        {
            timestamp: timestamp
        },
        cloudinaryConfig.api_secret
    );
    res.json({timestamp, signature, username});
});

//POST request for upload (Put song data on mongoose)
app.post("/upload", validate, async (req, res) => {
    //Get signature from Cloudinary
    const song_expectedSignature = cloudinary.utils.api_sign_request({ public_id: req.body.song_public_id, version: req.body.song_version }, cloudinaryConfig.api_secret);
    const image_expectedSignature = cloudinary.utils.api_sign_request({ public_id: req.body.image_public_id, version: req.body.image_version }, cloudinaryConfig.api_secret);

    //Compare with given signature
    if(song_expectedSignature === req.body.song_signature && image_expectedSignature === req.body.image_signature){
        await songs.create({username: req.body.username, title: req.body.title, description: req.body.description, genre: req.body.genre, date: req.body.date, listens: 0, likes: 0, comments: 0, song: req.body.song_public_id, picture: req.body.image_public_id});
    }

    res.end();
});

app.post("/listen", validate, async (req, res) => {
    let song = await db.collection("songs").find({song: req.body.song}).toArray();
    let response = song[0].listens + 1;

    await db.collection("songs").updateOne({song: req.body.song}, {$inc: {listens: 1}});

    res.status(200).send({listen: response});
})

app.post("/like", validate, async (req, res) => {
    let like = await db.collection("likes").find({$and: [{username: req.username}, {song: req.body.song}]}).toArray();
    let song = await db.collection("songs").find({song: req.body.song}).toArray();

    if(like.length === 1){
        await likes.deleteOne({username: req.username, song: req.body.song});
        await db.collection("songs").updateOne({song: req.body.song}, {$inc: {likes: -1}});
        res.status(200).send({like: song[0].likes-1, newLike: false});
    }else{
        await likes.create({username: req.username, song: req.body.song});

        await db.collection("songs").updateOne({song: req.body.song}, {$inc: {likes: 1}});
        res.status(200).send({like: song[0].likes+1, newLike: true});
    }
})

//Validate sessionId everytime the user makes a request
async function validate (req, res, next){
    const sessionId = req.headers.cookie?.split('=')[1];

    let user = await db.collection("users").find({sessionId: { $in: [sessionId]}}).toArray();

    if(user.length !== 0){
        req.username = user[0].username;
        req.sessionId = sessionId;
    }else{
        return res.sendStatus(403);
    }
    next();
}

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log("listening for requests");
    })
})