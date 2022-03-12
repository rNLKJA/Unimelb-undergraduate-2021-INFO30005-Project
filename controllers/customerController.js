// connect to Mongoose
const mongoose = require('mongoose')

// fetch results from database
const Blog = mongoose.model("BLOG")
const Order = mongoose.model("ORDER")
const Customer = mongoose.model("Customer")
const Van = mongoose.model('VAN')
const Product = mongoose.model("Product")


const passport = require('passport');
require('../config/passport')(passport);


const utility = require('../js/utility.js')

const bcrypt = require("bcrypt")

const path = require('path')
const {
    NONAME
} = require('dns')
const {
    nextTick
} = require('process')
const {
    session
} = require('passport')
/**const {
    expStatic <==Can't use 'static', it is a reserved word
} = require('express')
*/
const handleLogIn = (req, res, next) => {
    passport.authenticate('local-login', (err, user, info) => {
        if (err) {
            return next(err);
        }

        if (!user) {
            return res.redirect('/customer/login');
        }

        req.logIn(user, function (err) {
            return res.render('welcome', {
                customer_id: user.customer_id,
                style: "customer-login",
                title: "Welcome",
                footer: true
            })
        })
    })(req, res, next);
}

const logOut = (req, res) => {

    if (req.user) req.logout();
    
    res.redirect('/');
}

// main page of customer
const customerPage = async (req, res) => {
    res.redirect('/customer/login')
}

// return list of products from the menu
const getAllSnacks = async (req, res) => {

    try {
        const products = await Product.find({}).lean()

        res.render('showSnacks', {
            "products": products,
            title: "Menu",
            style: "menustyles"
        })

    } catch (err) {
        res.status(400)
        throw(err)
    }
}


const checkCart = async (req, res) => {
    try {
        const products = await Product.find({}).lean()

        res.render('cart', {
            products: products,
            title: "Menu",
            style: "cartstyles",
        })
    } catch (err) {
        res.status(400)

        return res.send(err)
    }
}


const showMenu = async (req, res) => {
    try {
        const products = await Product.find({}).lean()
        res.render('menu', {
            "products": products,
            title: "Menu",
            style: "menustyles",
        })
    } catch (err) {
        res.status(400)

        return res.send(err)
    }
}

// view details of a snack by product name
const getSnackDetail = async (req, res) => {
    try {
        const snack = await Product.findOne({
            "product": req.params.product_id
        }).lean()
        res.render('detailOfSnack', {
            "thisSnack": snack,
            title: snack.product,
            style: "menustyles"
        })
    } catch (err) {
        res.status(400)
        throw(err)
    }
}

// view details of a customer by querying customer id
const getCustomerDetail = async (req, res) => {
    try {
        const customer = await Customer.find({
            "customer_id": req.params.customer_id
        })
        if (customer.length == 0) {
            res.status(404)
            return res.send('Customer not found')
        }
        return res.send(customer)
    } catch (err) {
        res.status(400)
        return res.send("Database query failed")
    }
}

// view a customer's cart
const displayCustomerCart = async (req, res) => {
    res.send('NOT IMPLEMENTED: view customer cart')
}

const addToCustomerCart = async (req, res) => {
    try {
        let customer = await Customer.find({
            'customer_id': req.params.customer_id
        })

        if (customer) {
            await Customer.updateOne({
                'customer_id': req.params.customer_id
            }, {
                $push: {
                    'cart': req.body.orders
                }
            })
            return res.send(req.body.orders)
        } else
            return res.send("Customer not found")
    } catch (err) {
        return res.send("Database query failed")
    }
}

/* addToCustomerCart replacement */
const addToCart = async (req, res) => {
    try {
        var cart = JSON.parse(JSON.stringify(req.body.cart))
        var products = await Product.find({})
        var items = []
        JSON.parse(JSON.stringify(products)).forEach(item => {
            let prod = {}
            prod['food'] = item.product.toString()
            prod['price'] = item.price
            items.push(prod)
        })

        var price = 0

        items.forEach(item => {
            cart.forEach(cartItem => {
                if (item.food == cartItem.food) {
                    cartItem['price'] = item.price
                }
            })
        })

        cart.forEach(cartItem => {
            let subPrice = parseInt(cartItem.quantity) * parseFloat(cartItem.price)
            price += subPrice
        })

        if (req.body.confirm === true) {
            const date = utility.currentDate()

            const order_id = utility.generateOrderID(req.params.customer_id)
            const van_id = req.body.van_id
            const customer_id = req.params.customer_id

            const van = Van.find({
                "van_id": van_id
            })

            if (!van) {
                return res.send("Van is invalid (Van doesn't exist)")
            }

            const newOrder = new Order({
                "order_id": order_id,
                "van_id": van_id,
                "customer_id": customer_id,
                "order_items": req.body.cart,
                "price": price.toFixed(2),
                "status": "outstanding",
                "order_date": date,
                "start_time": utility.currentTime(),
                "discount_time": utility.discountTime(),
                "discount_applied": false
            })

            newOrder.save(function (err, newOrder) {
                if (err) return console.error(err);
            })


            res.send("Successed: the order has been placed")
        } else {
            res.send(`Current cart has items :
                    ${JSON.stringify(cart)}

                    Change the confirm to true to generate a new order
            `)
        }

    } catch (err) {
        return res.send("Database query failed")
    }

}


const getCustomerProfile = async (req, res) => {
    try {
        const customer = await Customer.findOne({
            "customer_id": req.params.customer_id
        }).lean()
        if (customer.length == 0) {
            res.status(404)
            return res.send('Customer not found')
        }
        return res.render('customerProfile', {
            "thisCustomer": customer,
            title: customer.customer_id,
            style: "customerProfile"
        })
    } catch (err) {
        res.status(400)
        return res.send("Database query failed")
    }
}

const changePassword = async (req, res) => {
    try {
        const customer = await Customer.findOne({
            "customer_id": req.user.customer_id
        })

        if (customer) {
            const customer_info = await Customer.findOne({
                "customer_id": req.user.customer_id
            }).lean()
            if (req.body.new_password !== req.body.confirm_password) {
                return res.render('customerProfile', {
                    "thisCustomer": customer_info,
                    title: customer_info.customer_id,
                    style: "customerProfile",
                    error_mismatch: true
                })
            } else if (!(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(req.body.new_password))) {
                // if new password doesn't meet the requirement, render error page

                return res.render('customerProfile', {
                    "thisCustomer": customer_info,
                    title: customer_info.customer_id,
                    style: "customerProfile",
                    error_reg: true
                })
            } else if (await customer.validPassword(req.body.old_password)) {

                // if password is validated, change the new_password for user

                const new_password = await bcrypt.hash(req.body.new_password, 10)
                await Customer.findOneAndUpdate({
                    "customer_id": req.user.customer_id
                }, {
                    "password": new_password
                }, {
                    new: true
                }).lean().
                exec((err, body) => {
                    if (err) return res.send(err + "error")
                    return res.render('customerProfile', {
                        "thisCustomer": body,
                        title: body.customer_id,
                        style: "customerProfile",
                        success: true
                    })
                })

            } else {

                // old password doesn't pass the validation
                return res.render('customerProfile', {
                    "thisCustomer": customer_info,
                    title: customer_info.customer_id,
                    style: "customerProfile",
                    error_old: true
                })
            }
        }




    } catch (err) {
        res.status(400)
        return res.send(err)
    }


}

const accessLogin = (req, res) => {

    res.render('customer-login', {
        style: "customer-login",
        title: "Login",
        footer: true
    })
}

const loginValidation = async (req, res) => {
    if (req.body.customer_id === '') {

        res.render('customer-login', {
            style: "customer-login",
            title: "Login",
            error2: true,
            footer: true
        })
    }

    // login validation
    try {
        const one_customer = await Customer.findOne({
            "customer_id": req.body.customer_id
        })


        if (one_customer) {

            if (one_customer['password'] === md5(req.body.password)) {

                res.render('welcome', {
                    customer_id: req.body.customer_id,
                    style: "customer-login",
                    title: "Welcome",
                    footer: true
                })
            } else {
                res.render('customer-login', {
                    style: "customer-login",
                    title: "Login",
                    error1: true,
                    footer: true
                })
            }

        } else {
            res.render('customer-login', {
                style: "customer-login",
                title: "Login",
                error3: true,
                footer: true
            })

        }

    } catch (err) {
        res.render('customer-login', {
            style: "customer-login",
            title: "Login",
            footer: true
        })
    }


}

const welcome = async (req, res) => {
    res.redirect('welcome')
}

const createAccount = (req, res) => {
    res.render('new-snacker', {
        title: "New Snacker",
        style: "createAccount",
        footer: true
    })
}

const updateNewAccountToDB = async (req, res) => {

    if (req.body.password1 != req.body.password2) {
        return res.render('new-snacker', {
            title: "New Snacker",
            style: "createAccount",
            error4: true,
            footer: true
        })
    } else if (/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\'\"\;\-\^\%\$\#\@\!\+\=\_\<\>\,\/\.\:\~\`\d]{8,}$/.test(req.body.password1) != true) {
        return res.render('new-snacker', {
            title: "New Snacker",
            style: "createAccount",
            error7: true,
            footer: true
        })
    }

    try {
        const user_pw = await bcrypt.hash(req.body.password1, 10)

        const customer = await Customer.find({
            "customer_id": req.body.customer_id
        }).lean()

        if (customer.length > 0) {
            return res.render('new-snacker', {
                title: "New Snacker",
                style: "createAccount",
                error5: true,
                footer: true
            })
        }

        const newCustomer = await Customer.create({
            "first_name": req.body.first_name,
            "last_name": req.body.last_name,
            "customer_id": req.body.customer_id,
            "password": user_pw,
            "portfolio_img": "BLW_KQ0Rkn0"
        })
        new Customer(newCustomer).save()

        res.redirect("login")


    } catch (err) {
        res.send("Database query failed")
        throw (err)
    }

}


const listAllCustomers = async (req, res) => {
    try {
        const products = await Customer.find({}).lean()
        return res.send(products)
    } catch (err) {
        res.status(400)
        return res.send("Database query failed")
    }
}

const getCustomerOutstandingOrders = async (req, res) => {
    try {
        const os_order = await Order.find({
            $or: [{
                'status': 'outstanding'
            }, {
                'status': 'fulfilled'
            }],
            "customer_id": req.params.customer_id
        }).lean()
        os_order.reverse()
        for (var order of os_order) {
            var van = await Van.findOne({
                'van_id': order.van_id
            }).lean()
            order.address = van.address
        }
        if (os_order === null) {
            res.status(404)
            return res.send("Order not found")
        }
        return res.render('customerProcessingOrder', {
            title: "Your Order",
            style: "customerProcessingOrder",
            "orders": os_order,
            "overdueMin": 15
        })
    } catch (err) {
        res.status(400)
        return res.send("Database query failed")
    }
}

const getCustomerCompletedOrders = async (req, res) => {
    try {
        const os_order = await Order.find({
            "status": 'collected',
            "customer_id": req.params.customer_id
        }).lean()
        os_order.reverse()
        for (var order of os_order) {
            var van = await Van.findOne({
                'van_id': order.van_id
            }).lean()
            order.address = van.address
        }
        if (os_order === null) {
            res.status(404)
            return res.send("Order not found")
        }
        return res.render('customerCompletedOrder', {
            title: "Your Order",
            style: "customerCompletedOrder",
            "orders": os_order
        })
    } catch (err) {
        res.status(400)
        return res.send("Database query failed")
    }
}

const getdetialOfaOrder = async (req, res) => {
    try {
        const order = await Order.findOne({
            "customer_id": req.params.customer_id,
            "order_id": req.params.order_id
        }).lean()
        if (order === null) {
            res.status(404)
            return res.send("Order not found")
        }
        const van = await Van.findOne({
            "van_id": order.van_id
        })
        const menu = await Product.find({}).lean()
        const estimate = parseInt(order.start_time.split(":")[1]) + 15
        var estimateHour = parseInt(order.start_time.split(":")[0]);
        if (estimate >= 60) {
            estimateHour = (parseInt(order.start_time.split(":")[0]) + 1) % 24
        }
        const estimateMin = estimate % 60
        order.estimateTime = `${estimateHour}:${estimateMin}`
        order.address = van.address
        return res.render('OneofCustomerOrder', {
            title: "Your Order detail",
            style: "customerOrderDetail",
            "thisOrder": order,
            'menu': menu,
            'updateMin': 10,
            "overdueMin": 15
        })
    } catch (err) {
        res.status(400)
        return res.send("Database query failed")
    }
}

function checkLoggedIn(req, res, next) {
    const id = Customer.findOne({
        "customer_id": req.params.customer_id
    });
    if (id) {
        return next();
    }
    alert("None exist user")
    return res.redirect('/login');
}

const order_location = async (req, res) => {

    // get location of van according to order id
    const currnetOrder = await Order.findOne({
        'order_id': req.params.order_id
    })
    const targgetVan = await Van.findOne({
        "status": "1",
        'van_id': currnetOrder.van_id
    }, {
        "van_id": true,
        "x_coord": true,
        "y_coord": true,
        "address": true
    }).lean()


    const marker = {
        coords: {
            lat: parseFloat(targgetVan.x_coord),
            lng: parseFloat(targgetVan.y_coord)
        },
        iconImage: "https://i.ibb.co/JtC9j1H/van.png",
        content: targgetVan.van_id
    }
    res.render("orderMap", {
        style: "orderMap",
        title: 'orderMap',
        marker: JSON.stringify(marker)
    })
}

// return all van location and mapping it on the map
const van_location = async (req, res) => {

    // obtain van info
    const active_van = await Van.find({
        "status": "1",
        address: {
            $ne: ""
        }
    }, {
        "van_id": true,
        "x_coord": true,
        "y_coord": true,
        "address": true
    }).lean()



    // add marker
    var markers = []
    for (let i of active_van) {
        var current_marker = {
            coords: {
                lat: parseFloat(i.x_coord),
                lng: parseFloat(i.y_coord)
            },
            iconImage: "https://i.ibb.co/JtC9j1H/van.png",
            content: i.van_id,
        }
        markers.push(current_marker)
    }

    res.render("map", {
        style: "map",
        title: "map",
        marker: JSON.stringify(markers),
        vans: markers
    })
}

// return five nearest van to user
const locate_van = async (req, res) => {

    // obtain van info
    const active_van = await Van.find({
        "status": "1",
        address: {
            $ne: ""
        }
    }, {
        "van_id": true,
        "x_coord": true,
        "y_coord": true,
        "address": true
    }).lean()

    // obtain user coords
    const user_coords = {
        lat: parseFloat(req.body.user_lat),
        lng: parseFloat(req.body.user_lng)
    }


    // calculate the distance
    var nearest_van = []

    for (let i of active_van) {
        var current_van = i
        current_van.x_coord = parseFloat(current_van.x_coord)
        current_van.y_coord = parseFloat(current_van.y_coord)

        current_van.dist = utility.euclidean_distance({
            lat: current_van.x_coord,
            lng: current_van.y_coord
        }, user_coords)

        nearest_van.push(current_van)
    }

    // sort van by distance (ascending)
    nearest_van = nearest_van.sort((a, b) => {
        return a.dist - b.dist
    }).slice(0, 5)

    // add marker
    var markers = []

    for (let i of nearest_van) {
        var current_marker = {
            coords: {
                lat: i.x_coord,
                lng: i.y_coord
            },
            iconImage: "https://i.ibb.co/JtC9j1H/van.png",
            content: i.van_id,
        }
        markers.push(current_marker)
    }


    return res.render("map", {
        style: "map",
        title: "map",
        marker: JSON.stringify(markers),
        vans: markers,
        selected_van: req.body.selected_van,
        set_location: true
    })


}

const rating = async (req, res) => {
    try {
        if (Order.findOne({
                'order_id': req.body.order_id
            })) {
            await Order.updateOne({
                'order_id': req.body.order_id
            }, {
                "comment": req.body.comment,
                'rating': req.body.rating
            })
            res.send("Thanks for rating out service")
        } else {
            res.send('No order Found')
        }
    } catch (err) {
        res.status(400)
        return res.send("Database query failed")
    }
}

const blog_req = async (req, res) => {
    try {
        const blogs = await Blog.find({}).limit(100).sort({
            '_id': -1
        }).lean()
        res.render("blog", {
            "blog": blogs,
            title: "Blog",
            style: "blog"
        })
    } catch (err) {
        res.status(400)
        return res.send('Database query failed')
    }
}

const blog_post = async (req, res) => {
    try {
        const newBlog = await Blog.create({
            "customer_id": req.body.customer_id,
            "content": req.body.content,
            "date": utility.currentDate(),
        })
        new Blog(newBlog).save()
    } catch (err) {
        res.send("Database query failed")
    }

    res.redirect(`/customer/${req.body.customer_id}/blog`)
}

const upload_profile = async (req, res) => {
    try {
        await Customer.updateOne({
            'customer_id': req.params.customer_id
        }, {
            'portfolio_img': req.body.img_url
        })

        res.redirect(`/customer/profile/${req.params.customer_id}`)
    } catch (err) {
        res.send("Database query failed")
    }

}

const cancelOrder = async (req, res) => {
    try {
        await Order.updateOne({
            'order_id': req.params.order_id
        }, {
            'status': 'canceled'
        })
    } catch (err) {
        res.send("Database query failed")
    }
}

const updateOrder = async (req, res) => {
    try {
        var cart = JSON.parse(JSON.stringify(req.body.cart))
        let price = parseFloat(req.body.total)
        await Order.updateOne({
            'order_id': req.params.order_id
        }, {
            'order_items': cart,
            'order_date': utility.currentDate(),
            'start_time': utility.currentTime(),
            'discount_time': utility.discountTime(),
            'price': price
        })
        res.redirect(`/customer/${req.params.customer_id}/${req.params.order_id}`)
    } catch (err) {
        res.send("Database query failed")
    }
}



module.exports = {
    customerPage,
    getSnackDetail,
    getAllSnacks,
    getCustomerDetail,
    displayCustomerCart,
    addToCustomerCart,
    listAllCustomers,
    addToCart,
    accessLogin,
    loginValidation,
    welcome,
    getCustomerOutstandingOrders,
    createAccount,
    updateNewAccountToDB,
    getdetialOfaOrder,
    checkCart,
    showMenu,
    checkLoggedIn,
    van_location,
    locate_van,
    getCustomerProfile,
    changePassword,
    getCustomerCompletedOrders,
    order_location,
    rating,
    logOut,
    handleLogIn,
    blog_req,
    blog_post,
    upload_profile,
    cancelOrder,
    updateOrder
}
