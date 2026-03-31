const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema({
  _id: String,
  data: { type: mongoose.Schema.Types.Mixed, required: true },
});

module.exports = mongoose.model("Document", DocumentSchema);
