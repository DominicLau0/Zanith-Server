const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: String,
    title: String,
    description: String,
    genre: String,
    date: Date,
    song: String,
    picture: String,
    listens: Number,
    likes: [String, String, Date],
    comments: Number
});

module.exports = mongoose.model("song", userSchema);