// mongodb schema
const mongoose = require('mongoose')

const blogSchema = new mongoose.Schema({
    
    customer_id: {type: String, required: true},
    content: {type: String, required: true},
    date: {type: String, required: true}

})

const BLOG = mongoose.model("BLOG", blogSchema)


module.exports = BLOG