### A Note of Express Handlebars

**Install dependencies**

```bash
npm init # initialize the package.json file

npm install express express-handlebars -S # install required packages and added dependencies to package.json
```

Need to create a view folder to store handlebar objects.

Need layouts folder
```bash
mkdir .views
mkdir .views/layout
touch .views/layout/main.hbs

# touch rest of file under views directory
# e.g
touch .view/index.hbs
```

**Adding the default layout**
```javascript
const express = require('express')
const app = express()
const exphbs = require('express-handlebars')

app.engine('hbs', exphbs({
        // change the default name for handlebars file name to .hbs
	extname: 'hbs',
    defaultLayout : "main",
    layoutDir : path.join(__dirname, 'views/layouts'), // change the layout folder if we don't want to use the default layouts folder
    partialsDir: path.join(__dirname, 'views/partials') // change the partial folder if we don't want to use the default partials folder
}))
```

The express handlebar will inject the content in the 
```html
<main>
    {{{ body }}} <!-- injection part -->
</main>
```
```bash
npm install -g nodemon
# may need sudo command
```

**Dynamic Tab Name <header></header>**
```html
<!-- use handlebars object -->
{{ title }}
```

```javascript
// send additional argument to let handlebar knows how to handle the new value
app.get('/about', (req, res) => {
    res.render('about', {title : 'Home Page'})
})
```
**Express Handlebars Helper**

Helper allows handlebars to perform a logic statement.

```handlebars
{{#if statement}}
    <p>display name {{ name }}</p>

    {{ else }}
    <p>No name found</p>    

{{/if}}

<!-- Three different way to use the each statement -->

{{#unless isListEnable}} <!-- if this is false-->
    <ul>
        <li>Home</li>
        <li>About</li>
        <li>Donate</li>
    </ul>
{{/unless}}

{{#each people}} <!-- each people -->
    <p>{{this}}</p> <!-- via using this object statement, or -->
    
{{/each}}

{{#each people}} <!-- each people -->

    <p>{{.}}</p>
{{/each}}

{{#each people as |value key|}} <!-- each people -->
    <p>{{key}}</p> <!-- key is the index of the object / element in an array -->
    <p>{{value}}</p>
{{/each}}

{{#each lists}}
    {{!-- use the log to check the object value --}}
    {{log this}}

    {{!-- this.items only access the value --}}
    {{#each this.items}}
        {{!-- this statement is vague --}}
        <p>{{this}}</p>
    {{/each}}
{{/each}}

<!-- nested for loop -->

{{#each lists as |xValue xkey|}}
    {{!-- provide a new name for this object --}}
    {{#each xValue.items as |yValue yKey|}}
        <p>{{yValue}}</p>
    {{/each}}
{{/each}}

{{#each lists as |xValue xkey|}}
    {{!-- using slash to access the value --}}
    {{#each xValue/items as |yValue yKey|}}
        <p>{{yValue}}</p>
    {{/each}}
{{/each}}
```

**Partials**

Create a partial folder:
```bash
mkdir ./views/partials

# create a partial handlebar file
touch ./views/partials/header.hbs
```

```handlebars
<!-- Example -->
<!-- inside the header.hbs, added code like  -->
{{#unless isListEnable}} <!-- if this is false-->
    <ul>
        <li>Home</li>
        <li>About</li>
        <li>Donate</li>
    </ul>
{{/unless}}
```

**Lookup**
```handlebars
<p>{{lookup array index}}</p>
<p>{{lookup people 0}}</p>

<p>{{lookup object 'key'}}</p>
<p>{{lookup user 'username'}}</p>
```

**Custom Helper**
```javascript
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
```

Call params :
```handlebars
{{#list people}}
    {{firstName}} {{lastName}}
{{/list}}
```

**Difference between {{ }} & {{{ }}}**
{{ }} -> handlebars render the content as text
{{{ }}} -> handlebars render the context as html content

**How to use Comment**
```handlebars
{{! This is a comment}}
```

**<code>with</code> helper**
```handlebars
{{! instance access to a variable}}
<!-- Access the first layout variables -->
{{#with author}}

    <h2>{{firstName}} {{lastName}}</h2>

{{/with}}

<!-- view dashboard.hbs to see more details -->
```

**Adding CSS to Handlebars**
```javascript
// add the following code before using app

app.use(express.static('public'))
```

CSS for the entire app?
```handlebars
<!-- add the following code in the main.hbs file -->
 <link rel="stylesheet" href="css/style.css">

<!-- Otherwise add -->
<link rel="stylesheet" href="css/{{style}}">
```