const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    admin: { 
        type: Boolean,
        default: false
    },
    moderator: {
        type: Boolean,
        default: false
    },
    recordLabel: {
        type: Boolean,
        default: false
    },
    sessionId: [String],
    lastPlayedSong: String,
    profilePic: String
});

module.exports = mongoose.model("user", userSchema);