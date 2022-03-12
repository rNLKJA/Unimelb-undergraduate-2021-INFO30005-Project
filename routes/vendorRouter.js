// import library
const express=require('express')

// add router
const vendorRouter = express.Router()

// express-validator, to validate user data in forms
const expressValidator = require('express-validator')

// handle the GET request of order request
const vendorController = require("../controllers/vendorController.js")

const {ensureVanAuthenticated} = require("../config/checkAuthentication")

// handle the GET request 

// access the the vendor main page
vendorRouter.get('/', vendorController.vendorPage)

// vendor login page
vendorRouter.get('/login', vendorController.vendorLogin)
vendorRouter.post('/login', vendorController.handleVendorLogIn)
vendorRouter.get('/logout', vendorController.logOut)


// change the order status to fulfilled
vendorRouter.post('/:van_id/changeStatusToFulfilled', ensureVanAuthenticated,vendorController.stateOrderAsFulfilled)
vendorRouter.post('/:van_id/changeStatusToCollected', ensureVanAuthenticated,vendorController.markOrderAsCollected)
vendorRouter.post('/:order_id/markOrderAsDiscounted', ensureVanAuthenticated,vendorController.markOrderAsDiscounted)

// get all vans
vendorRouter.get('/getAllVans', ensureVanAuthenticated,vendorController.getAllStatus)

// get all vans (status ready to go)
vendorRouter.get('/getReadyVans', ensureVanAuthenticated,vendorController.getReadyVan)

// get all orders
vendorRouter.get('/AllOrders', ensureVanAuthenticated,vendorController.getAllOrders)

// get all outstanding orders
vendorRouter.get('/AllOutstandingOrders', ensureVanAuthenticated,vendorController.getAllOutstandingOrders)

// get all fulfilled orders
vendorRouter.get('/AllFulfilledOrders', ensureVanAuthenticated,vendorController.getAllFulfilledOrders)

// get all canceled orders
vendorRouter.get('/AllCanceledOrders', ensureVanAuthenticated,vendorController.getAllCanceledOrders)

// get all completed orders 
vendorRouter.get('/AllCompletedOrders', ensureVanAuthenticated,vendorController.getAllCompletedOrders)

// get van status
vendorRouter.get('/:van_id/details', ensureVanAuthenticated,vendorController.getVanStatus)

// change the van status to ready to go
vendorRouter.get('/:van_id/turnOn',ensureVanAuthenticated,vendorController.turnVanStatusOn)

// change the van status to off
vendorRouter.get('/:van_id/turnOff', ensureVanAuthenticated,vendorController.turnVanStatusOff)

// get all orders by a van id
vendorRouter.get('/orderList', ensureVanAuthenticated,vendorController.getOrders)
vendorRouter.post('/orderList', ensureVanAuthenticated,vendorController.vanSearchOrder)
// vendorRouter.get('/:van_id/orders',vendorController.getOrders)

// get all outstanding orders by a van id
vendorRouter.get('/:van_id/outstanding', ensureVanAuthenticated,vendorController.getOutstandingOrders)
// vendorRouter.get('/:van_id/outstanding', vendorController.getOutstandingOrders)

// get all completed orders by a van id
vendorRouter.get('/:van_id/completed', ensureVanAuthenticated,vendorController.getCompletedOrders)

// get all fulfilled orders by a van id
vendorRouter.get('/:van_id/fulfilled', ensureVanAuthenticated,vendorController.getFulfilledOrders)

// get all canceled orders by a van id
vendorRouter.get('/:van_id/canceled', ensureVanAuthenticated,vendorController.getCanceledOrders)

// get an order by an order id
vendorRouter.get('/Allorders/:order_id', ensureVanAuthenticated,vendorController.getOrderByID)
// vendorRouter.get('/Allorders/:order_id',vendorController.getOrderByID)

// set the van location
vendorRouter.post('/:van_id/getLocation', ensureVanAuthenticated,vendorController.getVanLocation)

// set the status of van
vendorRouter.post('/setStatus', ensureVanAuthenticated,vendorController.setStatus)

vendorRouter.get('/orderSearch', ensureVanAuthenticated,vendorController.orderSearch)
vendorRouter.post('/orderSearch', ensureVanAuthenticated,vendorController.search)

// export the router
module.exports = vendorRouter