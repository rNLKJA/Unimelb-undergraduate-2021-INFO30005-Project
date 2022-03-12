// import library
const express = require('express')

// add router
const customerRouter = express.Router()

// express-validator, to validate user data in forms
const expressValidator = require('express-validator')

const passport = require('passport');
require('../config/passport')(passport);

// handle the GET request of order request
const customerController = require("../controllers/customerController.js")

const {ensureAuthenticated} = require("../config/checkAuthentication")

// handle paths below
customerRouter.get('/', customerController.customerPage)
customerRouter.get('/menu', customerController.getAllSnacks)
customerRouter.get('/menu/:product_id', customerController.getSnackDetail)
customerRouter.get('/cart', ensureAuthenticated,customerController.checkCart)
customerRouter.get('/profile/:customer_id',ensureAuthenticated, customerController.getCustomerProfile)

customerRouter.post('/cart/:customer_id', ensureAuthenticated, customerController.addToCart)
// add an order to orders collection
customerRouter.post('/:customer_id/cart/sendOrder', async (req, res) => {
    res.send('NOT IMPLEMENTED: send order')
})

customerRouter.get('/:customer_id/blog', ensureAuthenticated, customerController.blog_req)

customerRouter.post('/blog', ensureAuthenticated, customerController.blog_post)

//display all outstanding order of the customer
customerRouter.get('/:customer_id/processingOrder', ensureAuthenticated, customerController.getCustomerOutstandingOrders)

customerRouter.get('/:customer_id/completedOrder', ensureAuthenticated, customerController.getCustomerCompletedOrders)

customerRouter.get('/:customer_id/:order_id', ensureAuthenticated, customerController.getdetialOfaOrder)
customerRouter.post('/:customer_id/:order_id', customerController.cancelOrder)

customerRouter.post('/:customer_id/:order_id/rating', ensureAuthenticated, customerController.rating)
customerRouter.post('/:customer_id/:order_id/updating', customerController.updateOrder)
customerRouter.get('/:customer_id/:order_id/map', ensureAuthenticated, customerController.order_location)

// access the login page
customerRouter.get('/login', customerController.accessLogin)

// handle login post message
customerRouter.post('/login', customerController.handleLogIn)

// handle logout  request
customerRouter.get('/logout', customerController.logOut);

// handle the create account info
customerRouter.get('/newSnacker', customerController.createAccount)
// update the database
customerRouter.post('/newSnacker', customerController.updateNewAccountToDB)
// change password
customerRouter.post('/profile/:customer_id', customerController.changePassword)

customerRouter.post('/profile/img/:customer_id', customerController.upload_profile)

customerRouter.get('/map', customerController.van_location)

customerRouter.post('/map', customerController.locate_van)

// testing route
customerRouter.get('/error', (req, res) => {
    res.render("redirect_page", {
        footer : true,
        title: "Unauthorised Access",
        style: "login-status-error"
    })})

// export the router
module.exports = customerRouter