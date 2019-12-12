const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const eventSchema = new Schema({
    date: {
        type: String,
        required: true
    },
    cpu_usage: {
        type: String,
        required: true
    },
    cpu_temp: {
        type: String,
        required: true
    }
    
});

module.exports = mongoose.model('Event', eventSchema);