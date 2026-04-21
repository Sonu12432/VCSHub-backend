const mongoose = require("mongoose");
const { Schema } = mongoose;

const RepositorySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
  },
  content: [
    {
      type: String,
    },
  ],
  visibility: {
    type: Boolean,
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  issues: [
    {
      default: [],
      type: Schema.Types.ObjectId,
      ref: "Issue",
    },
  ],
  stars: [{    // this will be like how many people liked this repo -> like a reputation in original Github DAMN!
    default: [],
    type: mongoose.Schema.Types.ObjectId,
    ref: "User" // Linked to the User model
  }]
}, { timestamps: true });

const Repository = mongoose.model("Repository", RepositorySchema);
module.exports = Repository;
