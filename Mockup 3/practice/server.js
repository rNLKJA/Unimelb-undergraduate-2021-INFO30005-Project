// start the express server
const express = require('express');
const app = express();
const exphbs = require('express-handlebars');

// added path module
const path = require('path')

// create custom handlebars helper
const hbs = exphbs.create({
    // change the default name for handlebars file name to .hbs
    extname: 'hbs', // u can name the file type whatever it is
    defaultLayout : "main",
    layoutDir : path.join(__dirname, 'views/layouts'), // change the layout folder if we don't want to use the default layouts folder
    partialsDir: path.join(__dirname, 'views/partials'), // change the partial folder if we don't want to use the default partials folder

    // create helper object
    helpers: {
        calculation: function(value) {
            return value + 7
        },

        list: function(value, options) {
            // return "<h2>" + options.fn({ test: value, prove : 'sdgsdg'}) + "</h2>"

            // value = people
            let out = "<ul>";

            for (let i = 0; i < value.length; i ++) {
                out = out + "<li>" + options.fn(value[i]) + "</li>"
            }

            return out + "</ul>"
        }
    }
})

app.use(express.static('public'))

// set the view engine
app.engine('hbs', hbs.engine)
app.set('view engine', 'hbs')

// Routing
app.get('/', (req, res) => {
    res.render('index', {
        title: 'Home Page', 
        name : 'Rin Huang',
        date: '26-04',
        isDisplayname: false,
        age: 22,
        isAgeEnable: false,
        people: [
            {firstName : "Yehuda", lastName : "Katz"},
            {firstName : "Carl", lastName : "Lerche"},
            {firstName : "Alan", lastName : "Johnson"}
        ],
        style : "home.css"
    });
})

app.get('/about', (req, res) => {
    res.render('about', {
        title: 'About Me',
        description : "Balabala",
        style : "about.css"
    });
})

app.get('/dashboard', (req, res) => {
    res.render('dashboard', {
        isListEnabled: false,
        author: {
            firstName: "Peter",
            lastName : "James",
            project: {
                name: "Build Random Quote"
            }
        },
        style : "dashboard.css"
    })
});

app.get('/each/helper', (req, res) => {

    res.render('contact', {
        people: [
            "James",
            "Peter",
            "Sadrack",
            "Morissa"
        ],
        user: {
            username: 'accimessterlin',
            age: 20,
            phone: 2002421
        },
        lists: [
            {
                items : ['Mango', 'Banana', 'Pineappple']
            },
            {
                items : ['Potatoe', 'Manioc', 'Avocado']
            }
        ]
    })
})

app.get('/look', (req, res) => {

    res.render('lookup', {
        user: {
            username: 'accimessterlin',
            age: 20,
            phone: 2002421
        },
        people: [
            "James",
            "Peter",
            "Sadrack",
            "Morissa"
        ],
    });
})

// start the server 
app.listen(8080, () => {
    console.log("Sever is starting at post ", 8080);
})