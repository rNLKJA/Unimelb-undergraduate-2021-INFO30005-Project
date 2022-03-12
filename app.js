const express = require('express')
const bodyParser = require('body-parser')
const session = require('express-session')
const cors = require('cors')
const passport = require('passport')
const flash = require('connect-flash-plus')

const app = express()

// automatically redirect the web to the customer login page
app.get('/', (req, res) => {
	res.redirect('/customer/login')
})

app.use(express.json())
app.use(express.urlencoded({
	extended: true
}))
app.use(express.static('public'))
app.use(express.static('js'))
app.use(session({
	secret: 'wood',
	resave: false,
	saveUninitialized: false})
);
app.use(passport.initialize());
app.use(passport.session())
app.use(flash())
app.use((req, res, next)=>{
	app.locals.loginMessage = req.flash('loginMessage')
	app.locals.errorMessage = req.flash('errorMessage')
	next();
});
const exphbs = require('express-handlebars')
app.engine('hbs', exphbs({
	extname: 'hbs',
	helpers: require(__dirname + "/js/handlebarsHelpers.js").helpers
}))
app.set('view engine', 'hbs')

// connect to database
require('./models/db.js')

// set up routes
const vendorRouter = require('./routes/vendorRouter.js')
const customerRouter = require('./routes/customerRouter.js')

// handlers for sub pages
app.use('/vendor', vendorRouter)
app.use('/customer', customerRouter)

app.all('*', (req, res) => { // 'default' route to catch user errors
	res.status(404).render('error', {
		errorCode: '404',
		message: 'That route is invalid.'
	})
})

app.listen(process.env.PORT || 3000, () => {
	console.log("The app is running!")
})

module.exports = app;