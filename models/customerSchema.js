const mongoose = require('mongoose')
const bcrypt   = require('bcrypt')


const customerSchema = new mongoose.Schema({
    customer_id: {type : String, required : true, unique: true},
    first_name: {type : String, required : true},
    last_name: {type: String, required: true},
    password: {type: String, required: true},
    portfolio_img: {type: String, required: false}
})

customerSchema.methods.generateHash = function(password) {
    return bcrypt.hash(password,10);
};

customerSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};


const CUSTOMER = mongoose.model('Customer', customerSchema)

module.exports = CUSTOMER