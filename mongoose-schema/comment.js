const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: String,
    comment: String,
    date: Date,
    songId: String
});

module.exports = mongoose.model("comment", userSchema);