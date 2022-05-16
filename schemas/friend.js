const mongoose = require('mongoose');

const { Schema } = mongoose;
const friendSchema = new Schema({
    sender: {
        type: String,
        required: true,
    },
    receiver: {
        type: String,
        required: true,
    },
    isAccepted: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    dm: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Room",
    }
});

module.exports = mongoose.model('Friend', friendSchema);
