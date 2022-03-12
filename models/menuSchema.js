const mongoose = require('mongoose')

const menuSchema = new mongoose.Schema({
    product: {type: String, required: true, unique: true},
    price: {type : Number, min: 0, required: true}, 
    photo: String,
    description: String,
})

const Product = mongoose.model('Product', menuSchema)

module.exports = Product