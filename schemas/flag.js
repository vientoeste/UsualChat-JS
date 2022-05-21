const mongoose = require('mongoose');

const { Schema } = mongoose;
const {
  Types: { ObjectId },
} = Schema;
const flagSchema = new Schema({
  username: {
    type: String,
    required: true,
    ref: 'User'  
  },
  room: {
    type: ObjectId,
    required: true,
    ref: 'Room',
  },
  deletedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Flag', flagSchema);
