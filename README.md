<img align="center" style="width: 200px; height: 150px;" src="https://source.unsplash.com/K0WGia1XDJA">

<a href="https://snacks-in-a-van-4399.herokuapp.com/"><img align="left" src="https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/public/images/van.png" width="6%"></a>
# [Web Information Technologies](https://handbook.unimelb.edu.au/2021/subjects/info30005) :: Group 4399

---

## General info

This project ➡️ INFO30005 Web Information Technologies ➡️ Web application development ➡️ [Snacks in a Van](http://snacks-in-a-van-4399.herokuapp.com/)

**<mark>For marking purpose, please visit:</mark>**

- Customer Application via http://snacks-in-a-van-4399.herokuapp.com/customer
  - For customer application functional testing, please create a new customer account (the team reset the customer collection after Mockup 3 deliverable).
  - The customer password should contain at least one punctuation, e.g. <code>test-1234</code>.
- Vendor Application via http://snacks-in-a-van-4399.herokuapp.com/vendor
  - Vendors are not allowed to create a new account, for vendor login information, please visit https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/vendor%20login%20info.csv

For CSS style consistence, please use _Google Chrome Browser_.

For database connection, please use the following URI:
- mongodb+srv://<username>:<password>@cluster0.gxwjq.mongodb.net/myFirstDatabase?retryWrites=true&w=majority
- Replace the <username> and <password> before connect, please view the connection details from .env file.

Last commit at 30th May 2021 : _4cc0648c1125916172a025ad51c22fe987dc2e3b_

---

## Table of contents
* [Team Members](#team-members)
* [Mockup Deliverable 1](#mockup-deliverable-1)
* [Mockup Deliverable 2](#mockup-deliverable-2)
* [Mockup Deliverable 3](#mockup-deliverable-3)
* [Mockup Deliverable 4](#mockup-deliverable-4)

---

## Team Members

| Participant | Main Task |
| :----: | :---- | 
| Bin | Deliverable 2: Database Schema Design<br>Deliverable 2: View details of a snack <br> Deliverable 2: Mark an order as "fullfilled" (ready to picked up by customer) <br> Deliverable 3: View Order Details <br> Deliverable 4: View Completed Order - Customer <br> Bouns 3: Rating Function| 
| Declan | Deliverable 1: Customer App Foundation Design <br> Deliverable 2 & 3: View menu of snacks (including pictures and prices) CSS <br> Deliverable 4: Customer Profile Page <br> Deliverable 4: Vendor Order Search Function <br> Project Report <br> Application Test Functions| 
| Khin | Deliverable 1: Customer App Foundation Design, Mockup Annotations<br> Deliverable 2: Customer starts a new order by requesting a snack <br> Deliverable 4: Vendor outstanding order page <br> Deliverable 4: History page <br> Deliverable 4: Order Details <br>| 
| Rin | Deliverable 1: Vendor App Design, Customer App Design optimization <br> Deliverable 2: Customer starts a new order by requesting a snack <br> Deliverable 2: Show list of all outstanding orders <br> Deliverable 3 & 4: Customer Login, Vendor Login <br> Bouns 1 & 2: Map function, Blog Function <br> Deliverable 4: Vendor CSS Refine|
| Eric | Deliverable 1: Customer App Design optimization  <br> Deliverable 2: Setting van status <br> Deliverable 3: Order three different snacks <br> Deliverable 4: More cart function and CSS <br> Deliverable 4: Password encryption improvement (security practice) <br> Deliverable 4: Application of passport-local strategies and router authenticating management|

---

<details><summary><b> Technologies & Dependencies </b></summary>
  
  ## Technologies
  Project is created with:
  
  * "@babel/plugin-syntax-dynamic-import": "^7.8.3",
  * "@babel/plugin-syntax-jsx": "^7.12.13",
  * "@babel/plugin-transform-react-jsx": "^7.14.3",
  * "@babel/preset-env": "^7.14.4",
  * "@babel/preset-react": "^7.13.13",
  * "babel": "^6.23.0",
  * "bcrypt": "^5.0.1",
  * "bcrypt-nodejs": "0.0.3",
  * "blueimp-md5": "^2.18.0",
  * "connect-flash-plus": "^0.2.1",
  * "cookie-parser": "^1.4.5",
  * "cors": "^2.8.5",
  * "dotenv": "^8.6.0",
  * "enzyme": "^3.11.0",
  * "express": "^4.17.1",
  * "express-handlebars": "^5.3.0",
  * "express-session": "^1.17.1",
  * "express-validator": "^6.10.0",
  * "flash": "^1.1.0",
  * "handlebar": "^1.0.0",
  * "jest": "^27.0.1",
  * "jsonwebtoken": "^8.5.1",
  * "md5": "^2.3.0",
  * "mongodb": "^3.6.6",
  * "mongoose": "^5.12.7",
  * "nodemon": "^2.0.7",
  * "npm": "^7.11.2",
  * "opencage-api-client": "^1.0.0",
  * "passport": "^0.4.1",
  * "passport-jwt": "^4.0.0",
  * "passport-local": "^1.0.0",
  * "password": "^0.1.1",
  * "passwort": "^1.0.4",
  * "popups": "^1.1.3",
  * "react": "^17.0.2",
  * "sha1": "^1.1.1",
  * "supertest": "^6.1.3",
  * "taiko": "^1.2.5"
  
</details>

---

<a href="https://snacks-in-a-van-4399.herokuapp.com/"><img align="left" src="https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/public/images/van.png" width="6%"></a>
## Mockup Deliverable 1

[Mockup Deliverable 1 Github Folder](https://github.com/INFO30005-2021-SM1/project-t03-4399/tree/main/Mockup%201)

---

<a href="https://snacks-in-a-van-4399.herokuapp.com/"><img align="left" src="https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/public/images/van.png" width="6%"></a>
## Mockup Deliverable 2

[Mockup Deliverable 2 README.md](https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%202/Mockup%20Deliverable%202.md)

---

<a href="https://snacks-in-a-van-4399.herokuapp.com/"><img align="left" src="https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/public/images/van.png" width="6%"></a>
## Mockup Deliverable 3
[Mockup Deliverable 3 README.md](https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%203/Mockup3.md)

---

<a href="https://snacks-in-a-van-4399.herokuapp.com/"><img align="left" src="https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/public/images/van.png" width="6%"></a>
## Mockup Deliverable 4
[Mockup Deliverable 4 README.md](https://github.com/INFO30005-2021-SM1/project-t03-4399/blob/main/Mockup%204/Mockup4.md)

