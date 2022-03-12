// This cartController.js include the script for showCart.hbs and handle the event when user click different
// button when they are ordering snacks


function increaseItemCount(event) {
    const button = event.target
    const cartQuantity = button.parentElement.parentElement
    const quantityElement = cartQuantity.getElementsByClassName('cart-quantity-input')[0]
    var quantity = parseInt(quantityElement.value)
    if (quantity >= 0) {
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
    if (quantity >= 1) {
        quantity -= 1
    }
    quantityElement.value = quantity
    updateCartTotal()
}

// This function is to check when purchase button is clicked, if there is no item in cart, alert the user. Otherwise,
// Ask the user to confirm
function purchaseClicked(order_id, customer_id) {

    const cartRows = document.getElementsByClassName('item-rows')[0]
    const total = updateCartTotal()
    if (document.getElementsByClassName('cart-item').length != 0) {
        if (confirm('Order will be updated, are you sure?')) {

            const order_items = makeCart(cartRows)
            
            const cartData = {
                "order_id": order_id,
                "customer_id": customer_id,
                "cart": order_items,
                "total": total
            }
            uploadData(cartData);
            sessionStorage.removeItem('cart')

            while (cartRows.hasChildNodes()) {
                cartRows.removeChild(cartRows.firstChild)
                updateCartTotal()
            }
            alert('your order have been updated !!')
            location.reload()
        }

    } else {alert("do you want to cancel your order?")}
}

function makeCart(cartRows) {
    const cartItems = cartRows.getElementsByClassName('cart-item')

    if (sessionStorage.cart) {
        var order_items = JSON.parse(sessionStorage.getItem("cart"))
    } else {
        order_items = []
    }

    for (let i of cartItems) {
        if (parseInt(i.getElementsByClassName("cart-quantity-input")[0].value) != 0){
        var newCartItem = new Object()
        newCartItem.food = i.getElementsByClassName('item-title')[0].innerText
        newCartItem.quantity = parseInt(i.getElementsByClassName("cart-quantity-input")[0].value)
        console.log(i.getElementsByClassName('item-title')[0].innerText, parseInt(i.getElementsByClassName("cart-quantity-input")[0].value))
        order_items.push(newCartItem)
        }
    }
    return order_items
}

// This function is to add the order to database when user confirmed 
function uploadData(data) {

    try {
        const xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.status == 200) {
                console.log("posted")
            }
        }
        const orderData = JSON.stringify(data)
        console.log(orderData)
        xhr.open("POST", `/customer/${data.customer_id}/${data.order_id}/updating`, true)
        xhr.setRequestHeader("Content-Type", "application/json")
        xhr.send(orderData)
        console.log('1')
    }catch(err){
        console.log(err)
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
    if (isNaN(input.value) || input.value < 0) {
        input.value = 0
    }
    updateCartTotal()
}

// When add to cart button clicked, the html text of cartRow will be added to HTML
function addToCartClicked(event) {
    const button = event.target
    const shopItem = button.parentElement.parentElement.parentElement
    const title = shopItem.getElementsByClassName('shop-item-title')[0].innerText
    const price = shopItem.getElementsByClassName('shop-item-price')[0].innerText

    addItemToCart(title, price)
    updateCartTotal()
}

function addItemToCart(title, price) {
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
            <input class="cart-quantity-input" type="number" value="0">
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

    total = Math.round(total * 100) / 100
    document.getElementsByClassName('cart-total-price')[0].innerText = '$' + total
    return total;
}