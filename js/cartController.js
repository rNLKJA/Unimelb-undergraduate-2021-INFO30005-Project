// This cartController.js include the script for showCart.hbs and handle the event when user click different
// button when they are ordering snacks
if (document.readyState == 'loading') {
    document.addEventListener('DOMContentLoaded', ready)
} else {
    ready()
}


function ready() {

    // reload the cart items that save in sessionStorage
    if(sessionStorage.getItem("cart")){
        const cart = JSON.parse(sessionStorage.getItem("cart"))  
        makeRows(cart)
    }

    const addToCartButtons = document.getElementsByClassName('shop-item-button')
    for (let i of addToCartButtons) {

        i.addEventListener('click', addToCartClicked)
    }

    document.getElementsByClassName('btn-purchase')[0].addEventListener('click', purchaseClicked)
}

function increaseItemCount(event) {
    const button = event.target
    const cartQuantity = button.parentElement.parentElement
    const quantityElement = cartQuantity.getElementsByClassName('cart-quantity-input')[0]
    var quantity = parseInt(quantityElement.value)
    if (quantity > 0) {
        quantity += 1
    }

    quantityElement.value = quantity

    updateCartTotal()
}

function reduceItemCount(event) {
    const button = event.target
    const cartQuantity = button.parentElement.parentElement
    const quantityElement = cartQuantity.getElementsByClassName('cart-quantity-input')[0]
    var quantity = parseInt(quantityElement.value)
    if (quantity >= 2) {
        quantity -= 1
    }
    quantityElement.value = quantity
    updateCartTotal()
}

// This function is to check when purchase button is clicked, if there is no item in cart, alert the user. Otherwise,
// Ask the user to confirm
function purchaseClicked() {

    const cartRows = document.getElementsByClassName('item-rows')[0]

    if (document.getElementsByClassName('cart-item').length != 0) {
        if (confirm('Order will be placed, are you sure?')) {
            makeCart(cartRows)
            const order_items = makeCart(cartRows)

            const selected_van = sessionStorage.getItem("selected_van")

            if (selected_van) {
                const cartData = {
                    "van_id": selected_van,
                    "cart": order_items,
                    "confirm": true
                }

                uploadData(cartData);
                sessionStorage.removeItem("cart")
            }else{
                alert("please choose a van first~")
                window.location.replace("/customer/map")
                return
            }

            while (cartRows.hasChildNodes()) {
                cartRows.removeChild(cartRows.firstChild)
                updateCartTotal()
            }
            alert('Thanks for your order !!')
        }

    } else alert("please order something")
}

// This function is used to make a list of items in cart
function makeCart(cartRows) {
    const cartItems = cartRows.getElementsByClassName('cart-item')

    var order_items = []

    for (let i of cartItems) {

        var newCartItem = new Object()

        newCartItem.food = i.getElementsByClassName('item-title')[0].innerText
        newCartItem.quantity = parseInt(i.getElementsByClassName("cart-quantity-input")[0].value)
    
        order_items.push(newCartItem)
 

    }

    return order_items
}


// This function is to track the item in cart and save them in sessionStorage
function saveInSession(cartRows){
    const cartItems = cartRows.getElementsByClassName('cart-item')
    var cart = []

    for (let i of cartItems) {
        var cartInSession = new Object()
        cartInSession.food = i.getElementsByClassName('item-title')[0].innerText
        cartInSession.price = i.getElementsByClassName('cart-price')[0].innerText
        cartInSession.quantity = parseInt(i.getElementsByClassName("cart-quantity-input")[0].value)
        cart.push(cartInSession)
    }
    sessionStorage.setItem("cart",JSON.stringify(cart))
}


// This function is to add items that save in sessionStorage to cart
function makeRows(orderItems){

    for (let i of orderItems){
        addItemToCart(i.food,i.price,i.quantity)
    }
    updateCartTotal()
}

// This function is to add the order to database when user confirmed 
function uploadData(data) {

    try {
        const xhr = new XMLHttpRequest();
        const user_id = sessionStorage.getItem('customer_id')
        
        data = JSON.stringify(data)

        xhr.open("POST", '/customer/cart/' + user_id, true)
        xhr.setRequestHeader("Content-Type", "application/json")
        xhr.send(data)
    }catch(err){
        alert("Something wrong when post the order")
        throw(err)
    }

}

// This function is to remove item in cart when user click remove button
function removeCartItem(event) {
    const buttonClicked = event.target
    buttonClicked.parentElement.parentElement.parentElement.remove()
    updateCartTotal()
}



function quantityChanged(event) {
    const input = event.target
    if (isNaN(input.value) || input.value <= 0) {
        input.value = 1
    }
    updateCartTotal()
}

// When add to cart button clicked, the html text of cartRow will be added to HTML
function addToCartClicked(event) {
    const button = event.target
    const shopItem = button.parentElement.parentElement.parentElement
    const title = shopItem.getElementsByClassName('shop-item-title')[0].innerText
    const price = shopItem.getElementsByClassName('shop-item-price')[0].innerText

    addItemToCart(title, price,1)
    updateCartTotal()
}

// This function are used to add a item to cart
function addItemToCart(title, price,quantity) {
    const cartRow = document.createElement('li')
    cartRow.classList.add('cart-row')

    const cartItems = document.getElementsByClassName('cart-items')[0]
    const cartItemNames = cartItems.getElementsByClassName('item-title')
    for (let i of cartItemNames) {
        if (i.innerText == title) {
            repeatAdd(i)
            return
        }
    }

    const cartRowContents = `
        <div class="cart-item">
            <h3 class="item-title">${title}</h2>
            <span class="cart-price">${price}</span>


            <div class="cart-quantity">
            <h4 class = "qty-title">Qty</h4>
            <div class = "reduce-btn" >
                <ion-icon name="chevron-down-circle-outline"></ion-icon>
            </div>   
            <input class="cart-quantity-input" type="number" value="${quantity}">
            <div class = "add-btn">
            <ion-icon name="chevron-up-circle-outline"></ion-icon>
            </div>
            <button class="btn btn-danger" type="button">X</ion-icon>
            </button>    
            </div>
        </div>`


    cartRow.innerHTML = cartRowContents
    cartItems.getElementsByTagName('ul')[0].append(cartRow)
    cartRow.getElementsByClassName('reduce-btn')[0].addEventListener('click', reduceItemCount)
    cartRow.getElementsByClassName('add-btn')[0].addEventListener('click', increaseItemCount)
    cartRow.getElementsByClassName('btn-danger')[0].addEventListener('click', removeCartItem)
    cartRow.getElementsByClassName('cart-quantity-input')[0].addEventListener('change', quantityChanged)
}

// when trying to add a item if it is already in cart, just increase its quantity
function repeatAdd(title) {
    const cartItem = title.parentElement
    const quantityInput = cartItem.getElementsByClassName("cart-quantity-input")[0]
    var quantity = parseInt(quantityInput.value)

    quantityInput.value = quantity + 1
}

// when the number of items changed, update the total price
function updateCartTotal() {
    const cartItemContainer = document.getElementsByClassName('cart-items')[0]
    const cartRows = cartItemContainer.getElementsByClassName('cart-row')
    saveInSession(cartItemContainer)
    var total = 0
    var countItems = 0
    for (let i of cartRows) {
        const cartRow = i
        const priceElement = cartRow.getElementsByClassName('cart-price')[0]
        const quantityElement = cartRow.getElementsByClassName('cart-quantity-input')[0]
        const price = parseFloat(priceElement.innerText.replace('$', ''))
        const quantity =  parseInt(quantityElement.value)
        total = total + (price * quantity)
        countItems += quantity
    }
    const checkCount = document.getElementsByClassName("nav-counter nav-counter-blue")[0]
    document.getElementsByClassName("nav-counter nav-counter-blue")[0].innerText = countItems
    if (checkCount.innerHTML == "0"){
        checkCount.style.display = "none"
    }else{
        checkCount.style.display = "block"
    }

    total = Math.round(total * 100) / 100
    document.getElementsByClassName('cart-total-price')[0].innerText = '$' + total
}