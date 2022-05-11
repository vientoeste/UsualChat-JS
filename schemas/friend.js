const mongoose = require('mongoose');

const { Schema } = mongoose;
const friendSchema = new Schema({

});

module.exports = mongoose.model('Friend', friendSchema);
