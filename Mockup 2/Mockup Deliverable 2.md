<a href="https://snacks-in-a-van-4399.herokuapp.com/"><img align="left" src="https://img.icons8.com/cotton/2x/van.png" width="6%"></a>

# Mockup Deliverable 2

View the web application 👉 https://snacks-in-a-van-4399.herokuapp.com/

Download the POSTMAN.json 👉 https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%202/Mockup%20App%20Server%20-%20Group%204399.postman_collection.json

## Table of contents

- [Team Members & Task Distribution](#team-members-&-task-distribution)

- [Customer Features](#customer-features)
    - [View menu of snacks (including pictures and prices)](#view-menu-of-snacks)
    - [View details of a snack](#view-details-of-a-snack)
    - [Customer starts a new order by requesting a snack](#customer-starts-a-new-order-by-requesting-a-snack)
- [Vendor Features](#vendor-features)
    - [Setting van status (vendor sends location, marks van as ready-for-orders)](#setting-van-status)
    - [Show list of all outstanding orders](#show-list-of-all-outstanding-orders)
    - [Mark an order as "fulfilled" (ready to be picked up by customer)](#mark-an-order-as-fulfilled)
- [Other Features](#other-features)
---

## Team Members & Task Distribution

| **Group Member**                                      | **Task**                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| [Bin Liang](https://github.com/BinLiang-Eric)         | Customer Task 2) View details of a snack<br />Vendor Task 3) Mark an order as "fullfilled" (ready to picked up by customer) |
| [Declan Gannon](https://github.com/djgannon)          | Customer Task 1) View menu of snacks (including pictures and prices) |
| [Khin Liew](https://github.com/kvliew)                | Customer Task 3) Customer starts a new order by requesting a snack |
| [Sunchuangyu Huang](https://github.com/chuangyu-hscy) | Customer Task 3) Customer starts a new order by requesting a snack<br />Vendor Task 2) Show list of all outstanding orders |
| [Wei Zhao](https://github.com/EcZww)                  | Vendor Task 1) Setting van status                            |

---

## Connect to the MONGODB

Please use the following URI to connect the MongoDB Atlas

```
mongodb+srv://<username>:<password>@cluster0.gxwjq.mongodb.net/INFO30005?retryWrites=true&w=majority
```

**Please replace the username and password before using adding URI**

<mark>Please check the [<code>.env</code>](https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/.env) to obtain the login information</mark>

---

<a href="https://snacks-in-a-van-4399.herokuapp.com"><img align="left" src="https://image.flaticon.com/icons/png/512/873/873120.png" width="4%"></a>

## [Customer Features](https://snacks-in-a-van-4399.herokuapp.com/customer)

### View menu of snacks
Use 🌐 https://snacks-in-a-van-4399.herokuapp.com/customer/menu to view the heroku web page.

![POSTMAN Customer Task 1](https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%202/Customer%20task%201.png)

```bash
# Send a get request to https://snacks-in-a-van-4399.herokuapp.com/customer/menu
```

<img align="left" src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQQ_WSdtn3KLnPDYAHhVjp05Jrt_qgsfrLvyjf0ZCsGLCUTQD5It9-pjMbVGwkM9isiZXo&usqp=CAU" width="2.5%">

[View HTML CODE](https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%202/Customer%20Task%201%20output.html)

<img align="left" src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSqqHX85EQUaMhQ2wH14-SSS-fr55PzrDLs_eZAdM6TJ2-akrf6_UW8Pd-NaCYt66FJ9Qs&usqp=CAU" width="2.5%">

[View Web Page output](https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%202/Customer%20Task%201%202.png)

We render the products info (query from the MongoDB Atlas) into a single HTML file. It expects to display the image and price of each product.

User could view the menu through <code>https://snacks-in-a-van-4399.herokuapp.com/customer/menu/</code>

---

### View details of a snack

![POSTMAN Customer Task 2](https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%202/Customer%20Task%202.png)

```bash
# Send a get request to https://snacks-in-a-van-4399.herokuapp.com/customer/menu/[product id]
```

| Product name | URL |
| :---- | :---- |
| Cappuccino      |   https://snacks-in-a-van-4399.herokuapp.com/customer/menu/Cappuccino    |
| Latte      |   https://snacks-in-a-van-4399.herokuapp.com/customer/menu/Latte    |
|  Flat White     |  https://snacks-in-a-van-4399.herokuapp.com/customer/menu/Flat%20White     |
|  Long Black     |   https://snacks-in-a-van-4399.herokuapp.com/customer/menu/Long%20Black    |
| Plain Biscuit      |  https://snacks-in-a-van-4399.herokuapp.com/customer/menu/Plain%20Biscuit     |
| Fancy Biscuit      |   https://snacks-in-a-van-4399.herokuapp.com/customer/menu/Fancy%20Biscuit    |
| Small Cake      |  https://snacks-in-a-van-4399.herokuapp.com/customer/menu/Small%20Cake     |
| Large Cake | https://snacks-in-a-van-4399.herokuapp.com/customer/menu/Large%20Cake |

Similar to the customer task 1, but this time we render individual product information as an individual HTML file.

To view each product info, user can use <code>https://snacks-in-a-van-4399.herokuapp.com/customer/menu/[product id]</code>

---

### Customer starts a new order by requesting a snack

```bash
# Send a post request to the following web
https://snacks-in-a-van-4399.herokuapp.com/customer/RU3777776/cart
```

It has the following format : <code>https://snacks-in-a-van-4399.herokuapp.com/customer/[customer id]/cart</code>

![POSTMAN Customer Task 3](https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%202/Customer%20Task%203%201.png)

Via send a post request to emulate the customer add item to a shopping cart.

If the cart with a <code>{"confirm" : true}</code>. The web controller will generate a new order and upload to the database.

Including : order_id, van_id, customer_id, order_items, price, status, order_date, time, etc.

Otherwise, the controller will send back the items in the current shopping cart.

![POSTMAN Customer Task 3](https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%202/Customer%20Task%203%202.png)

Once the order has been placed, we can query it from the database.

---

<a href="https://snacks-in-a-van-4399.herokuapp.com/"><img align="left" src="https://image.flaticon.com/icons/png/512/873/873120.png" width="4%"></a>

## [Vendor Features](https://snacks-in-a-van-4399.herokuapp.com/vendor)

### Setting van status

Set up the van status  via sending a post request to:

```bash
https://snacks-in-a-van-4399.herokuapp.com/vendor/Genevieve Adele/setStatus
```

![POSTMAN Vendor Task 1](https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%202/Vendor%20task%201.png)

Set up the van location via sending a post request to:

```bash
https://snacks-in-a-van-4399.herokuapp.com/vendor/Genevieve Adele/setLocation
```

![POSTMAN Vendor Task 1](https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%202/Vendor%20task%201.1.png)

Turn on the van status via sending a get request to:

```bash
https://snacks-in-a-van-4399.herokuapp.com/vendor/Gwendolyn Cecilia/turnOn
```

![POSTMAN Vendor Task 1](https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%202/Vendor%20task%201.2.png)

Turn off the van (close the business) via sending a get request to:
```bash
https://snacks-in-a-van-4399.herokuapp.com/vendor/Gwendolyn Cecilia/turnOff
```

![POSTMAN Vendor Task 1](https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%202/Vendor%20task%201.3.png)

1. The program will query the data from the database.
2. **POST** / **GET** different request to different websites to handle the van status.

---

### Show list of all outstanding orders

Check outstanding orders based on given van id：
```bash
# send a get request to:
https://snacks-in-a-van-4399.herokuapp.com/vendor/[van id]/outstanding
```

![POSTMAN Vendor Task 2](https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%202/Vendor%20Task%202.png)

To use the web URL, please following the given format:
```
https://snacks-in-a-van-4399.herokuapp.com/vendor/[van id]/outstanding
```

Vendor could also check all outstanding orders no matter the van id via [🚗 LINK](https://snacks-in-a-van-4399.herokuapp.com/vendor/AllOrders)

or https://snacks-in-a-van-4399.herokuapp.com/vendor/AllOrders

![POSTMAN Vendor Task 2](https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%202/Vendor%20Task%202%202.png)

---

### Mark an order as "fulfilled"

Simply send a post request with an order id.

```
# send post request to 
https://snacks-in-a-van-4399.herokuapp.com/vendor/[van id]/changeStatusToFulfilled
```

If the order exist and the status is outstanding and belongs to the current van, then the program will update the status to fulfilled and update the database.

Else, the program will return a query failure.

![POSTMAN Vendor Task 3](https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%202/Vendor%20Task%203.png)

**For testing purpose, the order status of "ARD4391846" has been set to <code>outstanding</code>**

To view outstanding orders, please check via [🚗 LINK](https://snacks-in-a-van-4399.herokuapp.com/vendor/AllOutstandingOrders)

or https://snacks-in-a-van-4399.herokuapp.com/vendor/AllOrders

Any outstanding order will perform the same result.

---
## Other Features
- **For more vendor features** ➡️ [Check the Vendor Main Page](https://snacks-in-a-van-4399.herokuapp.com/vendor)

