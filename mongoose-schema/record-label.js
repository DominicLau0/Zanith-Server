const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: String,
    recordlabel: String
});

module.exports = mongoose.model("record-label", userSchema);