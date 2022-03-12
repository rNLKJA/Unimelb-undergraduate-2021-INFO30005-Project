// connect to Mongoose model
const mongoose = require("mongoose")

// fetch the data from the database
const Order = mongoose.model("ORDER")
const Van = mongoose.model("VAN")

const utility = require("../js/utility.js")
const opencage = require('opencage-api-client');
const path = require("path")
const md5 = require("blueimp-md5")
const passport = require('passport');
const nodemon = require("nodemon");
require('../config/passport')(passport);

const vendorPage = (req, res) => {
    res.redirect('/vendor/login')
}

// return all orders
const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find({})
        return res.send(orders)
    } catch (err) {
        console.log(err)
    }
}

// get orders by van id
const getOrders = async (req, res) => {
    try {
        // const orders = await Order.find({"van_id" : req.params.van_id}).lean()
        const orders = await Order.find({}).lean()
        res.render('vendor-order-history', {
            "van_name": req.params.van_id,
            "all_orders": orders,
            "no_search": true,
            style: "vendorStyles",
            title: "Order History",
            footer: true
        })

    } catch (err) {
        console.log(err)
    }
}
const vanSearchOrder = async (req, res) => {
    try {
        // const orders = await Order.find({"van_id" : req.params.van_id}).lean()
        const orders = await Order.find({}).lean()
        const order = await Order.findOne({
            "order_id": req.body.order_id
        }).lean()
        if (order === null) {
            return res.render('vendor-order-history', {
                footer: true,
                style: "vendorStyles",
                title: "Order Search",
                "all_orders": orders,
                not_success: true
            })
        } else {
            return res.render('vendor-order-history', {
                footer: true,
                style: "vendorStyles",
                title: "Order Search",
                "all_orders": orders,
                "order": order,
                success: true
            })
        }
    } catch (err) {
        res.status(400)
        throw(err)
    }
}
const orderSearch = async (req, res) => {
    try {
        const orders = await Order.find({}).lean()
        if (orders === null) {
            res.status(404)
            return res.send("Orders not found")
        }
        return res.render('orderSearch', {
            footer: true,
            style: "vendorOrderSearch",
            title: "Order Search",
            "orders": orders,
            no_search: true
        });
    } catch (err) {
        res.status(400)
        return res.send("Database query failed")
    }
}
const search = async (req, res) => {
    try {
        const orders = await Order.find({}).lean()
        const order = await Order.findOne({
            "order_id": req.body.order_id
        }).lean()
        if (order === null) {
            return res.render('orderSearch', {
                footer: true,
                style: "vendorOrderSearch",
                title: "Order Search",
                "orders": orders,
                not_success: true
            })
        } else {
            return res.render('orderSearch', {
                footer: true,
                style: "vendorOrderSearch",
                title: "Order Search",
                "orders": orders,
                "order": order,
                success: true
            })
        }
    } catch (err) {
        res.status(400)
        return res.send("Database query failed")
    }
}

// get all outstanding orders
const getAllOutstandingOrders = async (req, res) => {
    try {
        const orders = await Order.find({
            "status": 'outstanding'
        })
        return res.send(orders)
    } catch (err) {
        console.log(err)
    }
}

// return outstanding orders by van id
const getOutstandingOrders = async (req, res) => {

    try {
        const os_order = await Order.find({
            $or: [{
                "status": 'outstanding'
            }, {
                "status": 'fulfilled'
            }],
            "van_id": req.params.van_id
        }).lean()
        // const os_order = await Order.find({"status" : 'outstanding', "van_id" : req.params.van_id}).lean()
        const orders = await Order.find({
            "van_id": req.params.van_id
        }).lean()
        let van = await Van.findOne({
            "van_id": req.params.van_id
        }).lean()

        if (os_order === null) {
            res.status(404)
            return res.send("Order not found")
        }
        res.render('vendor-outstanding-orders', {
            orders: JSON.stringify(os_order),
            "outstanding-orders": os_order,
            "all-orders": orders,
            "van_name_id": req.params.van_id,
            "van_status": van.status,
            style: "vendorStyles",
            title: req.params.van_id + " Outstanding",
            footer: true
        })

    } catch (err) {
        res.status(400)
        console.log(err)
        return res.send("Database query failed")
    }
}

// return all completed orders by van id
const getCompletedOrders = async (req, res) => {
    try {
        const os_order = await Order.find({
            "status": 'completed',
            "van_id": req.params.van_id
        })
        if (os_order === null) {
            res.status(404)
            return res.send("Order not found")
        }
        return res.send(os_order)
    } catch (err) {
        res.status(400)
        return res.send("Database query failed")
    }
}

// get all completed orders 
const getAllCompletedOrders = async (req, res) => {
    try {
        const os_order = await Order.find({
            "status": 'completed'
        })
        if (os_order === null) {
            res.status(404)
            return res.send("Order not found")
        }
        return res.send(os_order)
    } catch (err) {
        res.status(400)
        return res.send("Database query failed")
    }
}

// get all fulfilled orders
const getAllFulfilledOrders = async (req, res) => {
    try {
        const orders = await Order.find({
            "status": 'fulfilled'
        })
        return res.send(orders)
    } catch (err) {
        console.log(err)
    }
}

// get all fulfilled orders by van id
const getFulfilledOrders = async (req, res) => {
    try {
        const ff_order = await Order.find({
            "status": 'fulfilled',
            "van_id": req.params.van_id
        })
        if (ff_order === null) {
            res.status(404)
            return res.send("Order not found")
        }
        return res.send(ff_order)
    } catch (err) {
        res.status(400)
        return res.send("Database query failed")
    }
}

// get all canceled orders
const getAllCanceledOrders = async (req, res) => {
    try {
        const orders = await Order.find({
            "status": 'canceled'
        })
        return res.send(orders)
    } catch (err) {
        console.log(err)
    }
}

// get all canceled orders by van id
const getCanceledOrders = async (req, res) => {
    try {
        const c_order = await Order.find({
            "status": 'canceled',
            "van_id": req.params.van_id
        })
        if (c_order === null) {
            res.status(404)
            return res.send("Order not found")
        }
        return res.send(c_order)
    } catch (err) {
        res.status(400)
        return res.send("Database query failed")
    }
}

// return order information about one order
const getOrderByID = async (req, res) => {
    try {

        const one_order = await Order.find({
            "order_id": req.params.order_id
        }).lean()
        let van = await Van.findOne({
            "van_id": one_order[0].van_id
        }).lean()

        if (one_order === null) {
            res.status(404)
            return res.send('Order not found')
        }
        res.render('vendor-order-details', {
            "thisOrder": one_order,
            "van_name": one_order[0].van_id,
            "van_status": van.status,
            style: "vendorStyles",
            title: req.params.order_id + " Details",
            footer: true
        })

    } catch (err) {
        res.status(400)
        return res.send("Database query failed")
    }
}

// change the status of a order that send in req body
const stateOrderAsFulfilled = async (req, res) => {
    try {
        const ChangeNeededOrder = await Order.findOne({
            "order_id": req.body.order_id,
            "van_id": req.params.van_id
        })
        if (ChangeNeededOrder.status == 'outstanding') {
            await Order.updateOne({
                "order_id": req.body.order_id
            }, {
                "status": 'fulfilled'
            })

            const time = utility.currentTime();

            await Order.updateOne({
                "order_id": req.body.order_id
            }, {
                "fulfilled_time": time
            })
            res.send('Order Ready for Pick Up')
        } else if (ChangeNeededOrder) {
            return res.send("Not valid to fulfilled order")
        } else {
            return res.send("Order not found")
        }
    } catch (err) {
        res.status(400)
        return res.send("Database query failed")
    }
}

// change the status of a order that send in req body
const markOrderAsCollected = async (req, res) => {
    try {
        const ChangeNeededOrder = await Order.findOne({
            "order_id": req.body.order_id,
            "van_id": req.params.van_id
        })
        if (ChangeNeededOrder.status == 'fulfilled') {
            await Order.updateOne({
                "order_id": req.body.order_id
            }, {
                "status": 'collected'
            })

            const time = utility.currentTime();

            await Order.updateOne({
                "order_id": req.body.order_id
            }, {
                "collection_time": time
            })
            res.send('Order Collected')
        } else if (ChangeNeededOrder) {
            return res.send("Not valid to fulfilled order")
        } else {
            return res.send("Order not found")
        }
    } catch (err) {
        res.status(400)
        return res.send("Database query failed")
    }
}

const markOrderAsDiscounted = async (req, res) => {
    try {
        const late_order = await Order.findOne({
            "order_id": req.body.order_id
        })

        if (late_order) {
            await Order.updateOne({
                "order_id": req.body.order_id
            }, {
                "discount_applied": true
            })
        } else {
            return res.send("Order Not Found")
        }

    } catch (err) {
        res.status(400)
        return res.send("Database query failed")
    }
}

// change the address of a Van that was sent in req.body
const setLocation = async (req, res) => {
    try {
        let van = await Van.findOne({
            "van_id": req.params.van_id
        })

        if (van) {
            await Van.updateOne({
                'van_id': req.params.van_id
            }, {
                "x_coord": req.body.x_coord,
                "y_coord": req.body.y_coord,
                "address": req.body.address
            })
            return res.send("Location of " + req.params.van_id + " has been updated")
        } else
            return res.send("Van not found")
    } catch (err) {
        return res.send("Database query failed")
    }
}

const setStatus = async (req, res) => {
    try {
        let van = await Van.findOne({
            "van_id": req.body.van_id
        })

        if (van) {
            //await Van.updateOne({'van_id': req.body.van_id}, {"x_coord": req.body.x_coord,"y_coord": req.body.y_coord,"address": req.body.address,"status":req.body.status})
            await Van.updateOne({
                'van_id': req.body.van_id
            }, {
                "status": req.body.status
            })
            return res.send("Status has been updated")
        } else {
            return res.send("Van not found")
        }
    } catch (err) {
        return res.send("Database query failed")
    }
}



// return all Vans which are status on
const getReadyVan = async (req, res) => {
    try {
        let ready_van = await Van.find({
            'status': '1'
        })
        if (ready_van === null) {
            res.status(404)
            return res.send('No Van is ready for order')
        }
        return res.send(ready_van)
    } catch (err) {
        return res.send("Database query failed")
    }

}

// change the status of Van to on
const turnVanStatusOn = async (req, res) => {

    try {
        let van = await Van.findOne({
            "van_id": req.params.van_id
        })
        if (van) {
            if (van.status === '0') {
                await Van.updateOne({
                    'van_id': req.params.van_id
                }, {
                    "status": '1'
                })
                return res.send('Van is ready-for-order')

            } else if (van.status === '1') {
                return res.send("Van is already on")
            }
        } else
            return res.send("van not found")
    } catch (err) {
        res.status(400)
        return res.send("Database query failed")
    }
}


// change the status of Van to off
const turnVanStatusOff = async (req, res) => {

    try {
        let van = await Van.findOne({
            "van_id": req.params.van_id
        })
        if (van) {
            if (van.status === '0') {
                return res.send('Van is already off')
            } else if (van.status === '1') {
                await Van.updateOne({
                    'van_id': req.params.van_id
                }, {
                    "status": '0'
                })

                return res.send("Van has turn off")
            } else
                return res.send("van not found")

        } else
            return res.send("van not found")
    } catch (err) {
        res.status(400)
        return res.send("Database query failed")
    }
}


// return the information by searching with Van_id
const getVanStatus = async (req, res) => {

    // search for author in the database via ID
    try {

        let status = await Van.findOne({
            "van_id": req.params.van_id
        })
        if (status) {
            res.render('vendor-details-page', {
                "van_details": status,
                "van_name": status.van_id,
                style: "vendorStyles",
                title: "Van Details",
                footer: true
            })
        } else {
            res.status(404)
            return res.send("van not found")
        }
    } catch (err) {
        res.status(400)
        return res.send("Database query failed")
    }
}

// return all Vans information
const getAllStatus = async (req, res) => {

    try {
        let van = await Van.find({})
        return res.send(van)
    } catch (err) {
        console.log(err)
    }
}

const vendorLogin = (req, res) => {
    res.render('vendor-login', {
        footer: true,
        style: "vendor-login",
        title: "Vendor Login"
    })
}

const handleVendorLogIn = (req, res, next) => {
    passport.authenticate('vendor-login', {
        session: false
    }, (err, van) => {
        if (err) {
            return next(err);
        }

        if (!van) {
            return res.render('vendor-login', {
                footer: true,
                style: "vendor-login",
                title: "Vendor Login",
                error6: true
            })
        }

        req.logIn(van, function (err) {
            return res.render("vendor-login-confirm", {
                footer: true,
                style: "vendor-login",
                title: "Welcome",
                vendor_id: req.body.van_id
            })
        })
    })(req, res, next);
}


const getVanLocation = async (req, res) => {
    try {
        let pos = {};
        var address;
        // let position = await getVanCoords();
        pos.lat = req.body.van_lat;
        pos.lng = req.body.van_lng;
        const data = await opencage.geocode({
            q: `${pos.lat}, ${pos.lng}`,
            language: 'en'
        })
        address = data.results[0].formatted
        let van = await Van.findOne({
            "van_id": req.params.van_id
        })
        if (van && req.body.address) {
            await Van.updateOne({
                'van_id': req.params.van_id
            }, {
                "x_coord": pos.lat,
                "y_coord": pos.lng,
                "address": req.body.address
            })
            return res.send("location Update")
        } else if (req.body.address == null) {
            await Van.updateOne({
                'van_id': req.params.van_id
            }, {
                "x_coord": pos.lat,
                "y_coord": pos.lng,
                "address": address
            })
        }
        return res.send("location Update fail!")
    } catch (err) {
        res.status(400)
        return res.send('location Update fail!')
    }
}

const logOut = (req, res) => {

    if (req.user) req.logout();
    
    res.redirect('/vendor/login');
}


module.exports = {
    getAllOrders,
    getOutstandingOrders,
    getCompletedOrders,
    getOrderByID,
    getFulfilledOrders,
    stateOrderAsFulfilled,
    markOrderAsDiscounted,
    getCanceledOrders,
    getAllStatus,
    getVanStatus,
    turnVanStatusOn,
    getReadyVan,
    turnVanStatusOff,
    setLocation,
    getAllOutstandingOrders,
    getAllFulfilledOrders,
    getAllCanceledOrders,
    vendorPage,
    getOrders,
    vanSearchOrder,
    getAllCompletedOrders,
    setStatus,
    vendorLogin,
    markOrderAsCollected,
    orderSearch,
    search,
    getVanLocation,
    handleVendorLogIn,
    logOut
}