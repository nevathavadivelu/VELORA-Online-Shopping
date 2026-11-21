
// ==========================================
// VELORA - MY ORDERS & CUSTOMER CREDIT
// ==========================================

// Customer session
const myOrdersCustomerId = sessionStorage.getItem("customerId");
const myOrdersToken = sessionStorage.getItem("customerToken");


// ==========================================
// PAGE INITIALIZATION
// ==========================================

document.addEventListener("DOMContentLoaded", function () {

    // Mobile navigation
    const menuToggle = document.getElementById("menuToggle");
    const navLinks = document.getElementById("navLinks");

    if (menuToggle && navLinks) {
        menuToggle.addEventListener("click", function () {
            navLinks.classList.toggle("open");
        });
    }

    // Logout
    const logoutButton = document.getElementById("logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener("click", function (event) {

            event.preventDefault();

            sessionStorage.removeItem("customerId");
            sessionStorage.removeItem("customerEmail");
            sessionStorage.removeItem("customerToken");
            sessionStorage.removeItem("customerRefreshToken");

            window.location.href = "login.html";

        });
    }

    // Login verification
    if (!myOrdersCustomerId || !myOrdersToken) {

        alert("Please login to view your orders.");

        window.location.href = "login.html";

        return;
    }

    loadMyOrders();

});


// ==========================================
// FIRESTORE VALUE CONVERSION
// ==========================================

function getMyOrderValue(field) {

    if (!field) return "";

    if (field.stringValue !== undefined) {
        return field.stringValue;
    }

    if (field.integerValue !== undefined) {
        return Number(field.integerValue);
    }

    if (field.doubleValue !== undefined) {
        return Number(field.doubleValue);
    }

    if (field.booleanValue !== undefined) {
        return field.booleanValue;
    }

    if (field.timestampValue !== undefined) {
        return field.timestampValue;
    }

    if (field.nullValue !== undefined) {
        return null;
    }

    return "";

}


// ==========================================
// CONVERT FIRESTORE DOCUMENT
// ==========================================

function convertMyOrder(documentData) {

    const fields = documentData.fields || {};

    const itemValues =
        fields.items?.arrayValue?.values || [];

    const items = itemValues.map(function (item) {

        const itemFields = item.mapValue?.fields || {};

        return {

            name: getMyOrderValue(itemFields.name),

            price: Number(
                getMyOrderValue(itemFields.price)
            ) || 0,

            quantity: Number(
                getMyOrderValue(itemFields.quantity)
            ) || 0

        };

    });

    const paymentMethod =
        getMyOrderValue(fields.paymentMethod);

    return {

        orderId: documentData.name.split("/").pop(),

        customerId:
            getMyOrderValue(fields.customerId),

        fullName:
            getMyOrderValue(fields.fullName),

        phone:
            getMyOrderValue(fields.phone),

        address:
            getMyOrderValue(fields.address),

        city:
            getMyOrderValue(fields.city),

        pincode:
            getMyOrderValue(fields.pincode),

        paymentMethod: paymentMethod,

        paymentStatus:
            getMyOrderValue(fields.paymentStatus) ||
            (
                paymentMethod === "Credit Payment"
                    ? "Unpaid"
                    : "Not Applicable"
            ),

        total:
            Number(getMyOrderValue(fields.total)) || 0,

        orderDate:
            getMyOrderValue(fields.orderDate),

        status:
            getMyOrderValue(fields.status) || "Order Placed",

        items: items

    };

}


// ==========================================
// LOAD CUSTOMER ORDERS
// ==========================================

async function loadMyOrders() {

    const container =
        document.getElementById("ordersList");

    if (!container) {
        console.error("Orders list container not found.");
        return;
    }

    container.innerHTML = `
        <div class="loading-message">
            <div class="loader"></div>
            <p>Loading your orders...</p>
        </div>
    `;

    try {

        // Query only this customer's orders
        const query = {

            structuredQuery: {

                from: [
                    {
                        collectionId: "orders"
                    }
                ],

                where: {

                    fieldFilter: {

                        field: {
                            fieldPath: "customerId"
                        },

                        op: "EQUAL",

                        value: {
                            stringValue: myOrdersCustomerId
                        }

                    }

                }

            }

        };

        // Fetch orders using existing Firestore helper
        const data = await firestoreRequest(

            FIRESTORE_BASE_URL + ":runQuery",

            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(query)

            },

            myOrdersToken

        );

        const documents = data

            .filter(function (result) {
                return result.document;
            })

            .map(function (result) {
                return result.document;
            });

        const orders = documents.map(convertMyOrder);

        // Newest orders first
        orders.sort(function (a, b) {

            return new Date(b.orderDate) -
                new Date(a.orderDate);

        });

        // Display existing order information
        displayMyOrderStatistics(orders);

        displayMyOrders(orders);

        // Display credit dashboard
        await displayCustomerCreditDashboard(orders);

    } catch (error) {

        console.error("My Orders Error:", error);

        container.innerHTML = `
            <div class="orders-error">

                <h2>Unable to Load Your Orders</h2>

                <p>
                    ${escapeMyOrderHTML(error.message)}
                </p>

                <button class="retry-button"
                    onclick="loadMyOrders()">
                    TRY AGAIN
                </button>

            </div>
        `;

    }

}


// ==========================================
// ORDER STATISTICS
// ==========================================

function displayMyOrderStatistics(orders) {

    const totalOrders =
        document.getElementById("totalOrders");

    const totalSpent =
        document.getElementById("totalSpent");

    const latestOrder =
        document.getElementById("latestOrderDate");

    // Count every order, including cancelled orders
    if (totalOrders) {
        totalOrders.textContent = orders.length;
    }

    // Exclude cancelled orders from spending
    const amount = orders.reduce(function (sum, order) {

        if (
            String(order.status).toLowerCase() === "cancelled"
        ) {
            return sum;
        }

        return sum + order.total;

    }, 0);

    if (totalSpent) {
        totalSpent.textContent =
            formatMyOrderPrice(amount);
    }

    if (latestOrder) {

        latestOrder.textContent = orders.length
            ? formatMyOrderDate(orders[0].orderDate, false)
            : "No orders yet";

    }

}


// ==========================================
// DISPLAY NORMAL ORDERS
// ==========================================

function displayMyOrders(orders) {

    const container =
        document.getElementById("ordersList");

    if (!container) return;

    if (orders.length === 0) {

        container.innerHTML = `

            <div class="empty-orders">

                <h2>Your Shopping Journey Starts Here</h2>

                <p>
                    You haven't placed any orders yet.
                    Explore our collection and find something special.
                </p>

                <a href="products.html">
                    EXPLORE COLLECTION
                </a>

            </div>

        `;

        return;

    }

    container.innerHTML = orders.map(function (order) {

        const itemsHTML = order.items.map(function (item) {

            return `

                <div class="order-product">

                    <span>
                        ${escapeMyOrderHTML(item.name)}
                        × ${item.quantity}
                    </span>

                    <span>
                        ${formatMyOrderPrice(
                            item.price * item.quantity
                        )}
                    </span>

                </div>

            `;

        }).join("");

        const status =
            String(order.status || "Order Placed");

        const statusClass =
            getOrderStatusClass(status);

        return `

            <article class="order-card">

                <div class="order-card-header">

                    <div>

                        <h3>
                            Order #${escapeMyOrderHTML(order.orderId)}
                        </h3>

                        <p>
                            ${formatMyOrderDate(order.orderDate)}
                        </p>

                    </div>

                    <span class="order-status ${statusClass}">
                        ${escapeMyOrderHTML(status.toUpperCase())}
                    </span>

                </div>

                <div class="order-card-body">

                    <h4>Ordered Products</h4>

                    ${itemsHTML}

                    <div class="order-details">

                        <p>
                            <strong>Payment Method:</strong>
                            ${escapeMyOrderHTML(order.paymentMethod)}
                        </p>

                        <p>
                            <strong>Delivery Address:</strong>
                            ${escapeMyOrderHTML(order.address)},
                            ${escapeMyOrderHTML(order.city)} -
                            ${escapeMyOrderHTML(order.pincode)}
                        </p>

                        <p>
                            <strong>Phone:</strong>
                            ${escapeMyOrderHTML(order.phone)}
                        </p>

                    </div>

                </div>

                <div class="order-card-footer">

                    <span>Total Amount</span>

                    <strong>
                        ${formatMyOrderPrice(order.total)}
                    </strong>

                </div>

            </article>

        `;

    }).join("");

}


// ==========================================
// CUSTOMER CREDIT DASHBOARD
// ==========================================

async function displayCustomerCreditDashboard(orders) {

    const creditLimitElement =
        document.getElementById("customerCreditLimit");

    const outstandingElement =
        document.getElementById("customerOutstandingCredit");

    const availableElement =
        document.getElementById("customerAvailableCredit");

    const creditOrdersContainer =
        document.getElementById("creditOrdersList");

    if (!creditOrdersContainer) return;

    try {

        // Get customer profile from Firestore
        const customerData = await firestoreRequest(

            FIRESTORE_BASE_URL +
            "/customers/" +
            encodeURIComponent(myOrdersCustomerId),

            {
                method: "GET"
            },

            myOrdersToken

        );

        const customerFields =
            customerData.fields || {};

        const creditLimit = Number(
            getMyOrderValue(customerFields.creditLimit)
        ) || 0;

        // Filter credit payment orders
        const creditOrders = orders.filter(function (order) {

            return order.paymentMethod === "Credit Payment";

        });

        // Calculate outstanding unpaid credit
        const outstandingCredit = creditOrders.reduce(
            function (total, order) {

                const paymentStatus =
                    String(order.paymentStatus || "Unpaid")
                        .toLowerCase()
                        .trim();

                const deliveryStatus =
                    String(order.status || "")
                        .toLowerCase()
                        .trim();

                if (
                    paymentStatus !== "paid" &&
                    deliveryStatus !== "cancelled"
                ) {

                    return total + order.total;

                }

                return total;

            },
            0
        );

        // Calculate available credit
        const availableCredit = Math.max(
            0,
            creditLimit - outstandingCredit
        );

        // Display credit amounts
        if (creditLimitElement) {

            creditLimitElement.textContent =
                formatMyOrderPrice(creditLimit);

        }

        if (outstandingElement) {

            outstandingElement.textContent =
                formatMyOrderPrice(outstandingCredit);

        }

        if (availableElement) {

            availableElement.textContent =
                formatMyOrderPrice(availableCredit);

        }

        // Display credit transaction history
        displayCustomerCreditOrders(creditOrders);

    } catch (error) {

        console.error("Credit Dashboard Error:", error);

        if (creditLimitElement) {
            creditLimitElement.textContent = "Unavailable";
        }

        if (outstandingElement) {
            outstandingElement.textContent = "Unavailable";
        }

        if (availableElement) {
            availableElement.textContent = "Unavailable";
        }

        creditOrdersContainer.innerHTML = `

            <div class="credit-error">

                Unable to load your credit information.
                Please refresh the page.

            </div>

        `;

    }

}


// ==========================================
// DISPLAY CREDIT PURCHASE HISTORY
// ==========================================

function displayCustomerCreditOrders(creditOrders) {

    const container =
        document.getElementById("creditOrdersList");

    if (!container) return;

    if (creditOrders.length === 0) {

        container.innerHTML = `

            <div class="empty-credit">

                <h3>No Credit Purchases Yet</h3>

                <p>
                    Your purchases made using Credit Payment
                    will appear here.
                </p>

            </div>

        `;

        return;

    }

    container.innerHTML = creditOrders.map(function (order) {

        const paymentStatus =
            String(order.paymentStatus || "Unpaid");

        const deliveryStatus =
            String(order.status || "Order Placed");

        const paymentClass =
            paymentStatus.toLowerCase() === "paid"
                ? "credit-paid"
                : "credit-unpaid";

        return `

            <article class="credit-order-card">

                <div class="credit-order-header">

                    <div>

                        <h3>
                            Order #${escapeMyOrderHTML(order.orderId)}
                        </h3>

                        <p>
                            ${formatMyOrderDate(order.orderDate)}
                        </p>

                    </div>

                    <strong>
                        ${formatMyOrderPrice(order.total)}
                    </strong>

                </div>

                <div class="credit-order-details">

                    <p>

                        <span>Payment Method</span>

                        <strong>
                            Credit Payment
                        </strong>

                    </p>

                    <p>

                        <span>Payment Status</span>

                        <strong class="${paymentClass}">
                            ${escapeMyOrderHTML(paymentStatus)}
                        </strong>

                    </p>

                    <p>

                        <span>Delivery Status</span>

                        <strong>
                            ${escapeMyOrderHTML(deliveryStatus)}
                        </strong>

                    </p>

                </div>

            </article>

        `;

    }).join("");

}


// ==========================================
// ORDER STATUS STYLE
// ==========================================

function getOrderStatusClass(status) {

    const normalizedStatus = String(status)
        .toLowerCase()
        .trim();

    const statusClasses = {

        "pending": "status-pending",

        "processing": "status-processing",

        "shipped": "status-shipped",

        "delivered": "status-delivered",

        "cancelled": "status-cancelled",

        "order placed": "status-placed"

    };

    return statusClasses[normalizedStatus] || "status-placed";

}


// ==========================================
// FORMAT PRICE
// ==========================================

function formatMyOrderPrice(amount) {

    return "₹" + Number(amount).toLocaleString("en-IN", {

        minimumFractionDigits: 2,

        maximumFractionDigits: 2

    });

}


// ==========================================
// FORMAT DATE
// ==========================================

function formatMyOrderDate(value, includeTime = true) {

    if (!value) {
        return "Date unavailable";
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return date.toLocaleString("en-IN", {

        day: "2-digit",

        month: "short",

        year: "numeric",

        ...(includeTime && {

            hour: "2-digit",

            minute: "2-digit"

        })

    });

}


// ==========================================
// HTML ESCAPING
// ==========================================

function escapeMyOrderHTML(value) {

    const entities = {

        "&": "&amp;",

        "<": "&lt;",

        ">": "&gt;",

        '"': "&quot;",

        "'": "&#039;"

    };

    return String(value ?? "").replace(/[&<>"']/g, function (character) {

        return entities[character];

    });

}
