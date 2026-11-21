
const order = JSON.parse(localStorage.getItem("latestOrder"));

const orderIdElement = document.getElementById("successOrderId");
const orderDateElement = document.getElementById("successOrderDate");
const paymentElement = document.getElementById("successPayment");
const totalElement = document.getElementById("successTotal");
const itemsContainer = document.getElementById("successOrderItems");
const emailStatusElement = document.getElementById("emailStatus");

function formatPrice(amount) {
    return "₹" + Number(amount).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

if (!order) {

    itemsContainer.textContent = "No recent order details were found.";

    orderIdElement.textContent = "Not available";
    orderDateElement.textContent = "Not available";
    paymentElement.textContent = "Not available";
    totalElement.textContent = "₹0.00";

} else {

    orderIdElement.textContent = order.orderId || "Not available";

    orderDateElement.textContent = new Date(
        order.orderDate
    ).toLocaleString("en-IN");

    paymentElement.textContent = order.paymentMethod;

    totalElement.textContent = formatPrice(order.total);

    itemsContainer.innerHTML = "";

    order.items.forEach(item => {

        const row = document.createElement("div");
        row.className = "success-item";

        const details = document.createElement("div");

        const name = document.createElement("div");
        name.className = "success-item-name";
        name.textContent = item.name;

        const quantity = document.createElement("div");
        quantity.className = "success-item-quantity";
        quantity.textContent = "Quantity: " + item.quantity;

        details.appendChild(name);
        details.appendChild(quantity);

        const price = document.createElement("div");
        price.className = "success-item-price";

        price.textContent = formatPrice(
            Number(item.price) * Number(item.quantity)
        );

        row.appendChild(details);
        row.appendChild(price);

        itemsContainer.appendChild(row);
    });
}

// Display email status
const emailStatus = localStorage.getItem("orderEmailStatus");

if (emailStatus === "failed") {

    emailStatusElement.textContent =
        "Your order is confirmed, but we could not send the email. Please contact our support team if you need confirmation.";

} else {

    emailStatusElement.textContent =
        "Your order confirmation email has been requested for your registered email address.";
}

// Logout
const logoutButton = document.getElementById("logoutButton");

if (logoutButton) {

    logoutButton.addEventListener("click", function () {

        sessionStorage.clear();

        window.location.href = "login.html";
    });
}
