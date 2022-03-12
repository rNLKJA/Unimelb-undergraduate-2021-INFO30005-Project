const LocalStrategy = require("passport-local").Strategy
require('dotenv').config()
const Customer = require("../models/customerSchema")
const Van = require("../models/vanSchema")
const md5 = require("blueimp-md5")


// This function create a object that use to decide which schema will the passport.deserializeUser use.

function SessionConstructor(userId, userGroup) {
    this.userId = userId;
    this.userGroup = userGroup;
}

module.exports = function (passport) {


    // Extending passport.serializeUser() and passport.deserializeUser();
    // cause we have two user type: customer and vendor.
    // idea comes from https://github.com/jaredhanson/passport/issues/50

    passport.serializeUser(function (userObject, done) {
        var userGroup;
        const userPrototype = Object.getPrototypeOf(userObject);
        if (userPrototype === Customer.prototype) {
            userGroup = "customer";
        } else if (userPrototype === Van.prototype) {
            userGroup = "van";
        }
        const sessionConstructor = new SessionConstructor(userObject.id, userGroup);
        done(null, sessionConstructor);
    });
    passport.deserializeUser(function (sessionConstructor, done) {
        if (sessionConstructor.userGroup == 'customer') {
            Customer.findOne({
                _id: sessionConstructor.userId
            }, function (err, user) {
                done(err, user);
            });
        } else if (sessionConstructor.userGroup == 'van') {
            Van.findOne({
                _id: sessionConstructor.userId
            }, function (err, user) {
                done(err, user);
            });
        }
    });

    passport.use('local-login', new LocalStrategy({
            usernameField: 'customer_id',
            passwordField: 'password',
            passReqToCallback: true
        }, // pass the req as the first arg to the callback for verification 
        function (req, customer_id, password, done) {

            process.nextTick(function () {
                // see if the user with the customer_id exists
                Customer.findOne({
                    'customer_id': customer_id
                }, function (err, user) {
                    // if there are errors, user is not found or password
                    // does match, send back errors
                    if (err)
                        return done(err);
                    if (!user)
                        return done(null, false, req.flash('loginMessage', 'Customer not found.'));

                    if (!user.validPassword(password)) {
                        // false in done() indicates to the strategy that authentication has
                        // failed
                        return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.'));
                    }
                    // otherwise, we put the user's customer_id in the session
                    else {
                        // in app.js, we have indicated that we will be using sessions
                        // the server uses the included modules to create and manage
                        // sessions. each client gets assigned a unique identifier and the
                        // server uses that identifier to identify different clients
                        // all this is handled by the session middleware that we are using 
                        
                        req.session.customer_id = customer_id;

                        return done(null, user, req.flash('loginMessage', 'Login successful'));
                    }
                });
            });

        }));

    passport.use('vendor-login', new LocalStrategy({
            usernameField: 'van_id',
            passwordField: 'password',
            passReqToCallback: true
        }, // pass the req as the first arg to the callback for verification 
        function (req, van_id, password, done) {

            process.nextTick(function () {
                // see if the user with the van_id exists
                Van.findOne({
                    'van_id': van_id
                }, function (err, user) {

                    if (err) {

                        return done(err);
                    }
                    if (!user) {

                        return done(null, false, req.flash('loginMessage', 'Van not found.'));
                    }

                    if (user.password != md5(password)) {


                        return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.'));
                    } else {

                        req.session.van_id = van_id;

                        return done(null, user, req.flash('loginMessage', 'Login successful'));
                    }
                });
            });

        }));
}