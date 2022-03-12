// mongodb schema
const { Double } = require('bson')
const mongoose = require('mongoose')

const orderItems = new mongoose.Schema({
    food : {type : String, required : true},
    quantity : {type : Number, required : true}
})

const OrderSchema = new mongoose.Schema({
    order_id : {type : String, required : true},
    van_id : {type : String, required : true}, // van name eg Irma Opal
    customer_id : {type : String, required : true},
    order_items : [orderItems],
    price : {type: Number, required : true},
    status : {type : String, required : true},
    order_date : {type : String, required : true},
    start_time : {type : String, required : true},
    collection_time : {type : String},
    discount_time : {type : String, required : true},
    fulfilled_time : {type : String},
    end_time : {type : String},
    period : {type : String},
    comment : {type : String},
    rating : {type : Number},
    discount_applied : {type : Boolean, required : true}
})

const ORDER = mongoose.model("ORDER", OrderSchema)

module.exports = ORDER
