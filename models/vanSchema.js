// mongodb schema
const mongoose = require('mongoose')

const vanSchema = new mongoose.Schema({
    
    van_id : {type : String, required : true},
    password : {type: String, required : true},
    x_coord : {type : Number, required : true},
    y_coord : {type : Number, required : true},
    address : {type : String, required : true},
    status: {type : String, required : true}

})

const VAN = mongoose.model("VAN", vanSchema)


module.exports = VAN