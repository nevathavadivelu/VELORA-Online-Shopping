
// ==========================================
// VELORA - CHECKOUT PAGE
// ==========================================

// ==========================================
// HTML ELEMENTS
// ==========================================

const checkoutForm = document.getElementById("checkoutForm");
const checkoutItems = document.getElementById("checkoutItems");
const checkoutSubtotal = document.getElementById("checkoutSubtotal");
const checkoutTotal = document.getElementById("checkoutTotal");
const logoutButton = document.getElementById("logoutButton");

const placeOrderButton = checkoutForm.querySelector(
    'button[type="submit"]'
);

// Credit information elements
const creditInfo = document.getElementById("creditInfo");
const creditLimitElement = document.getElementById("creditLimit");
const outstandingCreditElement = document.getElementById("outstandingCredit");
const availableCreditElement = document.getElementById("availableCredit");

// ==========================================
// CUSTOMER SESSION
// ==========================================

const customerId = sessionStorage.getItem("customerId");
const token = sessionStorage.getItem("customerToken");

// ==========================================
// EMAILJS CONFIGURATION
// ==========================================

const EMAILJS_SERVICE_ID = "service_nj0q1tu";
const EMAILJS_TEMPLATE_ID = "template_btz4zvy";
const EMAILJS_PUBLIC_KEY = "MTVPn_cvirahWgAVb";

if (typeof emailjs !== "undefined") {
    emailjs.init({
        publicKey: EMAILJS_PUBLIC_KEY
    });
}

// ==========================================
// CHECKOUT VARIABLES
// ==========================================

let cart = [];
let productImages = {};
let orderTotal = 0;

let customerCreditLimit = 0;
let customerOutstandingCredit = 0;
let customerAvailableCredit = 0;

let creditInformationLoaded = false;

// ==========================================
// LOGIN CHECK
// ==========================================

if (!customerId || !token) {
    window.location.href = "login.html";
}

// ==========================================
// FORMAT PRICE
// ==========================================

function formatPrice(amount) {
    return "₹" + Number(amount || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// ==========================================
// READ FIRESTORE FIELD
// ==========================================

function readFirestoreField(field) {

    if (!field) {
        return null;
    }

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

    return null;
}

// ==========================================
// LOAD CUSTOMER CREDIT INFORMATION
// ==========================================

async function loadCustomerCreditInformation() {

    if (!customerId || !token) {
        throw new Error("Customer session is missing.");
    }

    // STEP 1: Get customer profile
    const customerURL =
        `${FIRESTORE_BASE_URL}/customers/${encodeURIComponent(customerId)}`;

    const customerDocument = await firestoreRequest(
        customerURL,
        {
            method: "GET"
        },
        token
    );

    const customerFields = customerDocument.fields || {};

    customerCreditLimit = Number(
        readFirestoreField(customerFields.creditLimit) || 0
    );

    if (
        !Number.isFinite(customerCreditLimit) ||
        customerCreditLimit < 0
    ) {
        customerCreditLimit = 0;
    }

    // STEP 2: Retrieve this customer's orders
    const queryURL = `${FIRESTORE_BASE_URL}:runQuery`;

    const queryBody = {
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
                        stringValue: customerId
                    }
                }
            }
        }
    };

    const queryResponse = await firestoreRequest(
        queryURL,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(queryBody)
        },
        token
    );

    // STEP 3: Calculate outstanding credit
    customerOutstandingCredit = 0;

    queryResponse.forEach(result => {

        const document = result.document;

        if (!document) {
            return;
        }

        const fields = document.fields || {};

        const paymentMethod = String(
            readFirestoreField(fields.paymentMethod) || ""
        ).toLowerCase();

        const orderStatus = String(
            readFirestoreField(fields.status) || "Pending"
        ).toLowerCase();

        const paymentStatus = String(
            readFirestoreField(fields.paymentStatus) ||
            (paymentMethod.includes("credit") ? "Unpaid" : "Not Applicable")
        ).toLowerCase();

        const orderAmount = Number(
            readFirestoreField(fields.total) || 0
        );

        const isCreditOrder = paymentMethod.includes("credit");

        const isCancelled = orderStatus === "cancelled";

        const isUnpaid = paymentStatus !== "paid";

        if (
            isCreditOrder &&
            !isCancelled &&
            isUnpaid &&
            Number.isFinite(orderAmount)
        ) {
            customerOutstandingCredit += orderAmount;
        }
    });

    // STEP 4: Calculate available credit
    customerAvailableCredit = Math.max(
        0,
        customerCreditLimit - customerOutstandingCredit
    );

    creditInformationLoaded = true;

    displayCreditInformation();
}

// ==========================================
// DISPLAY CREDIT INFORMATION
// ==========================================

function displayCreditInformation() {

    if (!creditInfo) {
        return;
    }

    creditLimitElement.textContent =
        formatPrice(customerCreditLimit);

    outstandingCreditElement.textContent =
        formatPrice(customerOutstandingCredit);

    availableCreditElement.textContent =
        formatPrice(customerAvailableCredit);
}

// ==========================================
// SHOW / HIDE CREDIT INFORMATION
// ==========================================

function handlePaymentMethodChange() {

    const selectedPayment = document.querySelector(
        'input[name="payment"]:checked'
    );

    if (!selectedPayment) {
        return;
    }

    if (selectedPayment.value === "Credit Payment") {

        creditInfo.style.display = "block";

        if (creditInformationLoaded) {
            displayCreditInformation();
        }

    } else {

        creditInfo.style.display = "none";
    }
}

document.querySelectorAll('input[name="payment"]').forEach(input => {

    input.addEventListener("change", handlePaymentMethodChange);

});

// ==========================================
// LOAD CHECKOUT SUMMARY
// ==========================================

async function loadCheckoutSummary() {

    try {

        cart = JSON.parse(
            localStorage.getItem("shoppingCart")
        ) || [];

        if (cart.length === 0) {

            checkoutItems.innerHTML = `
                <p>Your shopping bag is empty.</p>
                <a href="products.html">Continue Shopping</a>
            `;

            placeOrderButton.disabled = true;

            checkoutSubtotal.textContent = "₹0.00";
            checkoutTotal.textContent = "₹0.00";

            return;
        }

        // Load product images
        const documents = await getAllProducts(token);

        documents.forEach(document => {

            const fields = document.fields || {};

            const name = fields.name?.stringValue || "";
            const image = fields.image?.stringValue || "";

            if (name && image) {
                productImages[name] = image;
            }

        });

        // Display products
        displayCheckoutSummary();

        // Load customer credit information
        await loadCustomerCreditInformation();

        // Update credit panel if Credit Payment is selected
        handlePaymentMethodChange();

    } catch (error) {

        console.error("Checkout loading error:", error);

        checkoutItems.innerHTML = `
            <p>Unable to load your checkout information. Please try again.</p>
        `;

        placeOrderButton.disabled = true;
    }
}

// ==========================================
// DISPLAY CHECKOUT SUMMARY
// ==========================================

function displayCheckoutSummary() {

    checkoutItems.innerHTML = "";

    orderTotal = 0;

    cart.forEach(item => {

        const price = Number(item.price);
        const quantity = Number(item.quantity);

        const subtotal = price * quantity;

        orderTotal += subtotal;

        const checkoutItem = document.createElement("div");
        checkoutItem.className = "checkout-item";

        const image = document.createElement("img");

        image.src =
            productImages[item.name] ||
            "../assets/images/products/tshirt.jpg";

        image.alt = item.name;

        image.onerror = function () {
            this.src = "../assets/images/products/tshirt.jpg";
        };

        const info = document.createElement("div");
        info.className = "checkout-item-info";

        const productName = document.createElement("h3");
        productName.textContent = item.name;

        const quantityText = document.createElement("p");
        quantityText.textContent = `Quantity: ${quantity}`;

        info.appendChild(productName);
        info.appendChild(quantityText);

        const priceElement = document.createElement("div");
        priceElement.className = "checkout-item-price";

        priceElement.textContent = formatPrice(subtotal);

        checkoutItem.appendChild(image);
        checkoutItem.appendChild(info);
        checkoutItem.appendChild(priceElement);

        checkoutItems.appendChild(checkoutItem);

    });

    checkoutSubtotal.textContent = formatPrice(orderTotal);
    checkoutTotal.textContent = formatPrice(orderTotal);
}

// ==========================================
// SEND ORDER CONFIRMATION EMAIL
// ==========================================

async function sendOrderConfirmationEmail(order, orderId) {

    if (typeof emailjs === "undefined") {
        throw new Error("EmailJS library was not loaded.");
    }

    const customerProfile = await getCustomerProfile(
        customerId,
        token
    );

    const registeredEmail = customerProfile.email;

    if (!registeredEmail) {
        throw new Error("Registered customer email was not found.");
    }

    const itemsText = order.items.map(item => {

        const itemSubtotal =
            Number(item.price) * Number(item.quantity);

        return `${item.name} x ${item.quantity} - ${formatPrice(itemSubtotal)}`;

    }).join("\n");

    const emailParameters = {

        to_email: registeredEmail,

        customer_name:
            customerProfile.fullName || order.fullName,

        order_id: orderId,

        order_date:
            new Date(order.orderDate).toLocaleString("en-IN"),

        payment_method: order.paymentMethod,

        total: formatPrice(order.total),

        items_text: itemsText,

        delivery_address:
            `${order.address}, ${order.city}, Tamil Nadu - ${order.pincode}`

    };

    const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        emailParameters
    );

    console.log("Order confirmation email sent:", response);

    return response;
}

// ==========================================
// PLACE ORDER
// ==========================================

checkoutForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    if (cart.length === 0) {

        alert("Your cart is empty. Please add products before checkout.");

        return;
    }

    if (!checkoutForm.reportValidity()) {
        return;
    }

    const fullName =
        document.getElementById("fullName").value.trim();

    const phone =
        document.getElementById("phone").value.trim();

    const address =
        document.getElementById("address").value.trim();

    const city =
        document.getElementById("city").value.trim();

    const pincode =
        document.getElementById("pincode").value.trim();

    const selectedPayment = document.querySelector(
        'input[name="payment"]:checked'
    );

    if (!selectedPayment) {

        alert("Please select a payment method.");

        return;
    }

    const paymentMethod = selectedPayment.value;

    // Validate phone
    if (!/^[6-9][0-9]{9}$/.test(phone)) {

        alert("Please enter a valid 10-digit Indian mobile number.");

        return;
    }

    // Validate pincode
    if (!/^[0-9]{6}$/.test(pincode)) {

        alert("Please enter a valid 6-digit PIN code.");

        return;
    }

    // Validate cart values
    const invalidCartItem = cart.some(item => {

        const price = Number(item.price);
        const quantity = Number(item.quantity);

        return (
            !Number.isFinite(price) ||
            !Number.isFinite(quantity) ||
            price < 0 ||
            quantity <= 0
        );

    });

    if (invalidCartItem || !Number.isFinite(orderTotal) || orderTotal <= 0) {

        alert("Your cart contains invalid product information.");

        return;
    }

    // ======================================
    // CREDIT PAYMENT VALIDATION
    // ======================================

    if (paymentMethod === "Credit Payment") {

        if (!creditInformationLoaded) {

            alert("Your credit information is still loading. Please try again.");

            return;
        }

        if (customerCreditLimit <= 0) {

            alert(
                "Credit payment is not available for your account. Please contact VELORA administration."
            );

            return;
        }

        if (orderTotal > customerAvailableCredit) {

            alert(
                "Insufficient available credit.\n\n" +
                "Order Total: " + formatPrice(orderTotal) + "\n" +
                "Available Credit: " + formatPrice(customerAvailableCredit)
            );

            return;
        }

    }

    // ======================================
    // CREATE ORDER OBJECT
    // ======================================

    const order = {

        customerId: customerId,

        fullName: fullName,

        phone: phone,

        address: address,

        city: city,

        pincode: pincode,

        paymentMethod: paymentMethod,

        paymentStatus:
            paymentMethod === "Credit Payment"
                ? "Unpaid"
                : "Not Applicable",

        total: orderTotal,

        orderDate: new Date().toISOString(),

        items: cart.map(item => ({

            name: item.name,

            price: Number(item.price),

            quantity: Number(item.quantity)

        }))

    };

    try {

        // Disable button
        placeOrderButton.disabled = true;

        placeOrderButton.textContent = "PLACING YOUR ORDER...";

        // ==================================
        // STEP 1: SAVE ORDER
        // ==================================

        const savedOrder = await saveOrder(order, token);

        const orderId = savedOrder.name
            ? savedOrder.name.split("/").pop()
            : "VELORA-" + Date.now();

        order.orderId = orderId;

        // ==================================
        // STEP 2: SAVE SUCCESS PAGE DETAILS
        // ==================================

        localStorage.setItem(
            "latestOrder",
            JSON.stringify(order)
        );

        // ==================================
        // STEP 3: SEND EMAIL
        // ==================================

        try {

            await sendOrderConfirmationEmail(order, orderId);

            localStorage.setItem(
                "orderEmailStatus",
                "sent"
            );

            console.log("VELORA confirmation email sent successfully.");

        } catch (emailError) {

            console.error(
                "Order saved, but email could not be sent:",
                emailError
            );

            localStorage.setItem(
                "orderEmailStatus",
                "failed"
            );

        }

        // ==================================
        // STEP 4: CLEAR CART
        // ==================================

        localStorage.removeItem("shoppingCart");

        // ==================================
        // STEP 5: REDIRECT
        // ==================================

        window.location.href = "order-success.html";

    } catch (error) {

        console.error("Order placement error:", error);

        alert(
            "Unable to place your order. Please check your connection and try again."
        );

        placeOrderButton.disabled = false;

        placeOrderButton.textContent = "PLACE ORDER";

    }

});

// ==========================================
// LOGOUT
// ==========================================

if (logoutButton) {

    logoutButton.addEventListener("click", function (event) {

        event.preventDefault();

        sessionStorage.clear();

        window.location.href = "login.html";

    });

}

// ==========================================
// INITIALIZE CHECKOUT
// ==========================================

if (customerId && token) {
    loadCheckoutSummary();
}
