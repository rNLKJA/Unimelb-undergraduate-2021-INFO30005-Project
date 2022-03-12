### Mockup3 Deliverable

---

#### Table of contents
* [Deliverable Task 1 : Customer Login](#customer-login)
* [Deliverable Task 2 : View menu of snacks (including pictures and prices)](#view-menu-of-snacks)
* [Deliverable Task 3 : Order three different snacks](#order-three-different-snacks)
* [Deliverable Task 4 : View Order Details ](#view-order-details)
* [Other function](#other-function)

---

<a href="https://snacks-in-a-van-4399.herokuapp.com/customer/login"><img align="left" src="https://img.icons8.com/cotton/2x/van.png" width="3%"></a>

#### Customer Login

Customers need to login the app to start a new order. To login, customers access the https://snacks-in-a-van-4399.herokuapp.com/ first.
The root page will automatically redirect to the customer login page : https://snacks-in-a-van-4399.herokuapp.com/customer/login.

For different device, the web application will return 3 responsive design for different screen sizes:
- screen width: (300px - 768px)
- screen width: (768px - 1200px)
- screen width: (1200px - ∞)
   

<img align="left" src="https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%203/login%20300px-768px.png" width="14%">
<img align="left" src="https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%203/login%20768px-1200px.png" width="39%">
<img src="https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%203/login%201200px-%E2%88%9E.png" width="39%">



<img align="right" src="https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%203/create%20account.png" width=30%>
For existing customer, after login process, the web application will redirect the customer to a welcome page. During the process, the web application will store two variables <code>Loggined</code> and <code>customer_id</code> in browser sessionStorage for futher login authentication and web redirection. <br><br>
If a customer doesn't have an account, the customer could click the <a href="https://snacks-in-a-van-4399.herokuapp.com/customer/newSnacker">Don't have an account?</a> to create a new account. The page also have responsive web pages for three screen sizes and it should looks like the image on the right side.<br><br>
Note, there is a minimum requirement for password length of 8 digits or characters. For security practice, the web application will hashing the password using MD5 encrpytion which the password in the database is un reservable. <br><br>
If a customer click the <code>Forget your password?</code>. The webpage will pop up an alert windows and say the customer needs to approach the customer services.

<br>

**Further Task** : Once the authentication cookie completed, the welcome page will be removed.

---

#### View menu of snacks 

<img align="right" src="https://user-images.githubusercontent.com/81336295/117271326-66a32b00-ae9d-11eb-92b3-80cd724f4f6a.png" width=65%>

In order to access the menu of snacks, the customer must access https://snacks-in-a-van-4399.herokuapp.com/customer/menu/.

Upon accessing the page, the user will see the following page, which displays a list of all available snacks including their names, prices and pictures:

The page features responsive design that will scale the sizes of the fonts and the nav bar, as well as adjust the number of columns for displaying snacks.
This will keep the design looking visually appealing and functional at all screen sizes. 

The page viewed on a screen 768px and below is shown below:

<img align="left" src="https://user-images.githubusercontent.com/81336295/117272074-27c1a500-ae9e-11eb-8e17-77091b239413.png" width=30%>

The menu page also allows the user to view the pages for each individual snack, which features a description of the given snack. These pages can be accessed
by clicking on the "VIEW ITEM" button below each snack. This will direct the user to a page with the URL https://snacks-in-a-van-4399.herokuapp.com/customer/menu/product/,
where product is the "product" field of the given snack. For example, the details of "Cappuccino" can be found at https://snacks-in-a-van-4399.herokuapp.com/customer/menu/cappuccino. This is shown below:

<img src="https://user-images.githubusercontent.com/81336295/117272616-b59d9000-ae9e-11eb-885d-698c8d90ebc0.png" width=60%>

The "BACK" button on the left of the page will direct the user back to https://snacks-in-a-van-4399.herokuapp.com/customer/menu/ when clicked.

<br>

#### Order three different snacks 

<img align="right" src="https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%203/cart%20page%20at%201200px%2B.png" width=50%>

In order to order three different snacks, users must log in before adding items to the shopping cart.
Visit https://snacks-in-a-van-4399.herokuapp.com/:customer_id/menu/cart
for example: https://snacks-in-a-van-4399.herokuapp.com/customer/admin@gmail.com/menu/cart

This page viewed on screen 1200px+:

on 1024-768:

<img align="right" src="https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%203/cart%20page%201024-768.png" width=30%>

on 768-550:

<img align="center" src="https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%203/cart%20page%20768-550.png" width=30% >

By clicking the add to cart button, user can add one shop-item to cart and edit the number in cart popup window. The pop up window will display the total price and all items which have been added to cart. The user can also click the "X" button to delete this item. The "close" button is used to hide the cart window in the lower right corner

<img align="center" src="https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%203/add%20to%20cart.png" width=60%>

When the user makes a decision, click to purchase, the web page will pop up a alert asking the user whether to confirm. After the confirmation is passed, the order will be updated to the database. 

Noted that the function of choosing which van the user what to shop has not yet been implemented. The van_id in order sent to the database is hard code with a specific van_id

<img align="center" src="https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%203/place%20the%20order.png" width=60%>

---

#### View Order Details 
Customer needed to login for access the order derails, backend will check for logged in before display the data. In order to access the order detail page, customer can access it thourgh the narvagation bar under the most screen, or directly acces "https://snacks-in-a-van-4399.herokuapp.com/customer/:customer_id/order", for example https://snacks-in-a-van-4399.herokuapp.com/customer/RU3777776/order. this page will display all processing order of a customer, as following picture showing.

<img align="left" src="https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%203/view%20order%20above%20768px.png" width=30%>

<img align="left" src="https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%203/view%20order%20768-360px.png" width=23%>

<img src="https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%203/view%20order%20under%20360px.png" width=23%>

for window size above 768, this page will display most information of a order. when width of a web is under certain number, some information will be hidden. If customer click on 'detail', more information will be present in another website, https://snacks-in-a-van-4399.herokuapp.com/customer/:customer_id/:order_id, for example https://snacks-in-a-van-4399.herokuapp.com/customer/RU3777776/MQR3689234

the following web will be display: 

<img align="left" src="https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%203/detail%20order%20above%20768.png" width=30%>

<img align="left" src="https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%203/detail%20order%20between%20768-360.png" width=19.4%>

<img src="https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%203/detail%20order%20under%20360px.png" width=23%>

---

#### Other Function

*Vendor Login Page*
- Please visit https://snacks-in-a-van-4399.herokuapp.com/vendor/login, to test the login function, please check the [vendor login info.csv](https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/vendor%20login%20info.csv).
- For example: Van ID: Red Poney, Password : kVjnzZvLHX
- As the task request, please view the login page with iPad (1024px * 768px) or use toggle device toolbars to change the view.
- _Further Task_ : Once the authentication cookie completed, the there will be a session ID in the session store.

