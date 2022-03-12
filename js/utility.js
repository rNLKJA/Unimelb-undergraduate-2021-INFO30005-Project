function currentTime() {
    var today = new Date()
    // since the server is at US, we need to add 10 to hour
    var hour = today.getUTCHours()
    if (0 < hour && hour < 14) {
        hour += 10
    } else if (14 < hour && hour < 24) {
        hour -= 10
    } else {
        hour = 0
    }

    var time = hour + ':' + today.getMinutes() + ':' + today.getSeconds()

    return time
}

function discountTime() {
    var today = new Date()
    var hours = today.getUTCHours()
    if (0 < hours && hours < 14) {
        hours += 10
    } else if (14 < hours && hours < 24) {
        hours -= 10
    } else {
        hours = 0
    }
    var minutes = today.getMinutes() + 15

    if(minutes > 59) {
        minutes = minutes - 60
        hours++
    }

    var time = hours + ':' + minutes + ':' + today.getSeconds()

    return time
}

function currentDate() {
    var today = new Date()
    var date =  today.getDate() + "-" + (today.getMonth() + 1) + "-" + today.getFullYear()
    return date
}

// https://www.joshwcomeau.com/snippets/javascript/random/ 
// random function implementation
const random = (min, max) => Math.floor(Math.random() * (max - min)) + min


const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function generateString(length) {
    let result = ' ';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}

function generateOrderID(customer_id) {
    // theoretical the function should obtain the 3 characters and 7 numbers
    // for now, the function will randomly generate the order id

    var char3 = generateString(3)
    var num = random(0, 9999999)
    var order_id = char3 + num

    return order_id.trim()
}

function euclidean_distance(van_coords, user_coords) {
    var distance = 0
    distance += (van_coords.lat.toFixed(5) - user_coords.lat.toFixed(5)) ** 2

    distance += (van_coords.lng.toFixed(5) - user_coords.lng.toFixed(5)) ** 2
    return Math.sqrt(distance.toFixed(5))
}

module.exports = {
    currentTime,
    discountTime,
    currentDate,
    generateOrderID,
    euclidean_distance
}