## Final App Development Progress

---

### Map function development

-   [x] load map
-   [x] obtain user location
-   [x] add user location marker
-   [x] add test van location marker
-   [x] map display
-   [x] map responsive design
-   [x] hardcode database coordinates
-   [x] euclidean distance function
-   [x] return five nearest van
-   [x] select van funciton

**operation logic**

User needs to enable the geo-location service, & browser need to support the service (e.g. chrome safari).

User could use map without login.

The first time loading, the map will display all the available van on the map.

User could click the top left corner to refresh the map. But for somehow user need to click it twice to display the correct position (first time will display user location but wrong nearest van location).

Click the van icon to view the van name.

User need to select a van from the drop down list & submit it via the top right corner button.

Now the web will store the **selected_van** into SessionStorage for order function.

_The Map Application should auto adjust the map size to fit the browser._

---

### Blog function development

- [x] Blog UI Design
- [x] Blog operation logic
- [x] Blog UI implementation
- [x] Database Mockup
- [x] Database construction 
- [x] Blog Schema
- [x] GET/POST route
- [x] hbs implementation
- [x] responsive design
- [x] testing

---

### Login function modify

- [ ] ~~remove welcome page~~
- [x] vendor login validation
- [ ] ~~session ID generate function~~
- [x] ~~database new field -> session ID~~
- [ ] A new customer needs to create a password with minimum length of 8 characters including a punctuation.

---
### Running Jest Tests
Navigate to root folder of the project (project-t03-4399). In the cmd, type "npm test" to run the full suite of integration and unit tests 

---
