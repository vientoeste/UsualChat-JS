const mongoose = require('mongoose');

const { Schema } = mongoose;
const {
  Types: { ObjectId },
} = Schema;
const chatSchema = new Schema({
  room: {
    type: ObjectId,
    required: true,
    ref: 'Room',
  },
  user: {
    type: String,
    required: true,
  },
  chat: String,
  img: String,
  file: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isDM: {
    type: boolean,
    default: false,
  }
});

module.exports = mongoose.model('Chat', chatSchema);
