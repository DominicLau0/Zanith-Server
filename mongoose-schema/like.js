const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: String,
    song: String
});

module.exports = mongoose.model("like", userSchema);