
// ==========================================
// VELORA ADMIN - ORDER MANAGEMENT
// ==========================================

const ordersList = document.getElementById("ordersList");

const ADMIN_UID = "XlBj1qfZsAeX5JEP9n24dMlsOXX2";

let adminOrders = [];

const ORDER_STATUSES = [
    "Pending",
    "Processing",
    "Shipped",
    "Delivered",
    "Cancelled"
];

const CREDIT_PAYMENT_STATUSES = [
    "Unpaid",
    "Paid"
];

// ==========================================
// FIRESTORE FIELD HELPER
// ==========================================

function getField(fields, fieldName, fallback = "") {

    const field = fields?.[fieldName];

    if (!field) return fallback;

    return (
        field.stringValue ??
        field.integerValue ??
        field.doubleValue ??
        field.booleanValue ??
        field.timestampValue ??
        fallback
    );
}

// ==========================================
// GET ORDER ITEMS
// ==========================================

function getOrderItems(fields) {

    return fields?.items?.arrayValue?.values || [];

}

// ==========================================
// PRICE FORMATTER
// ==========================================

function formatPrice(value) {

    return Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

}

// ==========================================
// CHECK CREDIT PAYMENT
// ==========================================

function isCreditPayment(order) {

    return String(order.payment)
        .toLowerCase()
        .includes("credit");

}

// ==========================================
// GET PAYMENT STATUS
// ==========================================

function getPaymentStatus(fields, paymentMethod) {

    const savedStatus = getField(
        fields,
        "paymentStatus",
        ""
    );

    if (savedStatus) {
        return savedStatus;
    }

    // Older credit orders without paymentStatus
    // are treated as unpaid.
    if (String(paymentMethod).toLowerCase().includes("credit")) {
        return "Unpaid";
    }

    return "Not Applicable";

}

// ==========================================
// CREATE SEARCH AND FILTER CONTROLS
// ==========================================

function createOrderControls() {

    if (document.getElementById("orderSearch")) return;

    const controls = document.createElement("div");

    controls.className = "order-controls";

    const searchInput = document.createElement("input");

    searchInput.type = "text";
    searchInput.id = "orderSearch";
    searchInput.placeholder =
        "Search by order ID, customer or phone...";

    const statusFilter = document.createElement("select");

    statusFilter.id = "orderStatusFilter";

    const allOption = document.createElement("option");

    allOption.value = "All";
    allOption.textContent = "All Orders";

    statusFilter.appendChild(allOption);

    ORDER_STATUSES.forEach(status => {

        const option = document.createElement("option");

        option.value = status;
        option.textContent = status;

        statusFilter.appendChild(option);

    });

    controls.appendChild(searchInput);
    controls.appendChild(statusFilter);

    ordersList.parentNode.insertBefore(
        controls,
        ordersList
    );

    searchInput.addEventListener("input", displayOrders);

    statusFilter.addEventListener("change", displayOrders);

}

// ==========================================
// LOAD ORDERS FROM FIRESTORE
// ==========================================

async function loadOrders() {

    const customerId = sessionStorage.getItem("customerId");

    const token = sessionStorage.getItem("customerToken");

    if (!customerId || !token) {

        window.location.href = "../customer/login.html";

        return;
    }

    if (customerId !== ADMIN_UID) {

        ordersList.textContent =
            "Access denied. Admin login required.";

        return;
    }

    try {

        ordersList.textContent = "Loading customer orders...";

        const url = `${FIRESTORE_BASE_URL}/orders`;

        const data = await firestoreRequest(
            url,
            { method: "GET" },
            token
        );

        const documents = data.documents || [];

        adminOrders = documents.map(orderDocument => {

            const fields = orderDocument.fields || {};

            const payment = getField(
                fields,
                "paymentMethod",
                "Not provided"
            );

            return {

                documentName: orderDocument.name,

                orderId: orderDocument.name.split("/").pop(),

                fields: fields,

                customerId: getField(
                    fields,
                    "customerId",
                    ""
                ),

                customerName: getField(
                    fields,
                    "fullName",
                    "Customer"
                ),

                phone: getField(
                    fields,
                    "phone",
                    "Not provided"
                ),

                address: getField(
                    fields,
                    "address",
                    ""
                ),

                city: getField(
                    fields,
                    "city",
                    ""
                ),

                pincode: getField(
                    fields,
                    "pincode",
                    ""
                ),

                payment: payment,

                paymentStatus: getPaymentStatus(
                    fields,
                    payment
                ),

                total: Number(
                    getField(fields, "total", 0)
                ),

                status: getField(
                    fields,
                    "status",
                    "Pending"
                ),

                items: getOrderItems(fields)

            };

        });

        createOrderControls();

        displayOrders();

    } catch (error) {

        console.error("Orders loading error:", error);

        ordersList.textContent =
            "Unable to load orders: " + error.message;

    }

}

// ==========================================
// ORDER SUMMARY STATISTICS
// ==========================================

function updateOrderStatistics() {

    const total = adminOrders.length;

    const pending = adminOrders.filter(
        order => order.status === "Pending"
    ).length;

    const processing = adminOrders.filter(
        order => order.status === "Processing"
    ).length;

    const delivered = adminOrders.filter(
        order => order.status === "Delivered"
    ).length;

    const totalElement =
        document.getElementById("totalOrders");

    const pendingElement =
        document.getElementById("pendingOrders");

    const processingElement =
        document.getElementById("processingOrders");

    const deliveredElement =
        document.getElementById("deliveredOrders");

    if (totalElement) totalElement.textContent = total;

    if (pendingElement) pendingElement.textContent = pending;

    if (processingElement) processingElement.textContent = processing;

    if (deliveredElement) deliveredElement.textContent = delivered;

}

// ==========================================
// DISPLAY FILTERED ORDERS
// ==========================================

function displayOrders() {

    updateOrderStatistics();

    const searchText = (
        document.getElementById("orderSearch")?.value || ""
    ).toLowerCase().trim();

    const selectedStatus =
        document.getElementById("orderStatusFilter")?.value || "All";

    const filteredOrders = adminOrders.filter(order => {

        const matchesSearch =

            String(order.orderId).toLowerCase().includes(searchText) ||

            String(order.customerName).toLowerCase().includes(searchText) ||

            String(order.phone).toLowerCase().includes(searchText);

        const matchesStatus =

            selectedStatus === "All" ||

            String(order.status).toLowerCase() ===
            selectedStatus.toLowerCase();

        return matchesSearch && matchesStatus;

    });

    ordersList.innerHTML = "";

    if (adminOrders.length === 0) {

        ordersList.innerHTML =
            '<p class="loading-message">No customer orders found.</p>';

        return;
    }

    if (filteredOrders.length === 0) {

        ordersList.innerHTML =
            '<p class="loading-message">No matching orders found.</p>';

        return;
    }

    filteredOrders.forEach(order => {

        const card = document.createElement("div");

        card.className = "order-card";

        // ORDER HEADING

        const heading = document.createElement("h3");

        heading.textContent = "Order #" + order.orderId;

        // CUSTOMER

        const customer = document.createElement("p");

        customer.textContent =
            "Customer: " + order.customerName;

        // PHONE

        const phone = document.createElement("p");

        phone.textContent =
            "Phone: " + order.phone;

        // ADDRESS

        const address = document.createElement("p");

        address.textContent =
            "Address: " +
            [
                order.address,
                order.city,
                order.pincode
            ].filter(Boolean).join(", ");

        // PAYMENT METHOD

        const payment = document.createElement("p");

        payment.textContent =
            "Payment: " + order.payment;

        // PAYMENT STATUS

        const paymentStatusElement = document.createElement("p");

        paymentStatusElement.className = "payment-status";

        paymentStatusElement.textContent =
            "Payment Status: " + order.paymentStatus;

        // PRODUCTS HEADING

        const productsHeading = document.createElement("h4");

        productsHeading.textContent = "Ordered Products";

        // PRODUCTS LIST

        const itemDetails = document.createElement("div");

        itemDetails.className = "order-items";

        order.items.forEach(item => {

            const product = item.mapValue?.fields || {};

            const productName = getField(
                product,
                "name",
                "Product"
            );

            const quantity = Number(
                getField(product, "quantity", 0)
            );

            const price = Number(
                getField(product, "price", 0)
            );

            const itemElement = document.createElement("p");

            itemElement.textContent =
                `${productName} × ${quantity} = ₹${formatPrice(price * quantity)}`;

            itemDetails.appendChild(itemElement);

        });

        // TOTAL

        const total = document.createElement("p");

        total.className = "order-total";

        total.textContent =
            "Total: ₹" + formatPrice(order.total);

        // ORDER STATUS

        const statusLabel = document.createElement("label");

        statusLabel.className = "status-label";

        statusLabel.textContent = "Order Status: ";

        const statusSelect = document.createElement("select");

        statusSelect.className = "order-status-select";

        ORDER_STATUSES.forEach(status => {

            const option = document.createElement("option");

            option.value = status;

            option.textContent = status;

            option.selected =
                status.toLowerCase() ===
                String(order.status).toLowerCase();

            statusSelect.appendChild(option);

        });

        statusSelect.addEventListener("change", async function () {

            const newStatus = statusSelect.value;

            await updateOrderStatus(
                order,
                newStatus,
                statusSelect
            );

        });

        statusLabel.appendChild(statusSelect);

        // MARK AS PAID BUTTON

        let markPaidButton = null;

        if (
            isCreditPayment(order) &&
            order.paymentStatus !== "Paid" &&
            order.status !== "Cancelled"
        ) {

            markPaidButton = document.createElement("button");

            markPaidButton.type = "button";

            markPaidButton.className = "mark-paid-btn";

            markPaidButton.textContent = "Mark as Paid";

            markPaidButton.addEventListener("click", async function () {

                await updateOrderPaymentStatus(
                    order,
                    markPaidButton
                );

            });

        }

        // VIEW DETAILS BUTTON

        const detailsButton = document.createElement("button");

        detailsButton.type = "button";

        detailsButton.className = "view-details-btn";

        detailsButton.textContent = "View Details";

        detailsButton.addEventListener("click", function () {

            viewOrderDetails(order);

        });

        // ADD ELEMENTS TO CARD

        card.appendChild(heading);

        card.appendChild(customer);

        card.appendChild(phone);

        card.appendChild(address);

        card.appendChild(payment);

        card.appendChild(paymentStatusElement);

        card.appendChild(productsHeading);

        card.appendChild(itemDetails);

        card.appendChild(total);

        card.appendChild(statusLabel);

        if (markPaidButton) {
            card.appendChild(markPaidButton);
        }

        card.appendChild(detailsButton);

        ordersList.appendChild(card);

    });

}

// ==========================================
// MARK CREDIT ORDER AS PAID
// ==========================================

async function updateOrderPaymentStatus(order, button) {

    const token = sessionStorage.getItem("customerToken");

    const customerId = sessionStorage.getItem("customerId");

    if (!token || customerId !== ADMIN_UID) {

        alert("Admin login required.");

        return;
    }

    if (!isCreditPayment(order)) {

        alert("This is not a credit payment order.");

        return;
    }

    if (order.paymentStatus === "Paid") {

        alert("This credit order is already marked as Paid.");

        return;
    }

    if (order.status === "Cancelled") {

        alert("Cancelled orders cannot be marked as Paid here.");

        return;
    }

    const confirmed = confirm(
        "Mark order #" + order.orderId + " as PAID?\n\n" +
        "Customer: " + order.customerName + "\n" +
        "Amount: ₹" + formatPrice(order.total)
    );

    if (!confirmed) {
        return;
    }

    const previousText = button.textContent;

    button.disabled = true;

    button.textContent = "Updating...";

    try {

        const url =
            `${FIRESTORE_BASE_URL}/orders/${encodeURIComponent(order.orderId)}` +
            "?updateMask.fieldPaths=paymentStatus";

        const body = {

            fields: {

                paymentStatus: {

                    stringValue: "Paid"

                }

            }

        };

        await firestoreRequest(

            url,

            {

                method: "PATCH",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify(body)

            },

            token

        );

        // Update local order information
        order.paymentStatus = "Paid";

        // Refresh order cards
        displayOrders();

        alert(
            "Payment marked as Paid successfully!\n\n" +
            "Order ID: " + order.orderId + "\n" +
            "Amount: ₹" + formatPrice(order.total)
        );

    } catch (error) {

        console.error(
            "Payment status update error:",
            error
        );

        alert(
            "Unable to update payment status: " + error.message
        );

        button.disabled = false;

        button.textContent = previousText;

    }

}

// ==========================================
// VIEW COMPLETE ORDER DETAILS
// ==========================================

function viewOrderDetails(order) {

    const modal =
        document.getElementById("orderDetailsModal");

    const content =
        document.getElementById("orderDetailsContent");

    if (!modal || !content) {

        console.error("Order details modal elements are missing.");

        return;
    }

    content.innerHTML = "";

    // CREATE DETAILS SECTION

    function addSection(title, lines) {

        const section = document.createElement("div");

        section.className = "details-section";

        const heading = document.createElement("h3");

        heading.textContent = title;

        section.appendChild(heading);

        lines.forEach(line => {

            const paragraph = document.createElement("p");

            paragraph.textContent = line;

            section.appendChild(paragraph);

        });

        content.appendChild(section);

    }

    // ORDER INFORMATION

    addSection("Order Information", [

        "Order ID: " + order.orderId,

        "Status: " + order.status,

        "Payment Method: " + order.payment,

        "Payment Status: " + order.paymentStatus

    ]);

    // CUSTOMER INFORMATION

    addSection("Customer Information", [

        "Name: " + order.customerName,

        "Phone: " + order.phone,

        "Address: " +
        [
            order.address,
            order.city,
            order.pincode
        ].filter(Boolean).join(", ")

    ]);

    // PURCHASED PRODUCTS

    const productsSection = document.createElement("div");

    productsSection.className = "details-section";

    const productsHeading = document.createElement("h3");

    productsHeading.textContent = "Purchased Products";

    productsSection.appendChild(productsHeading);

    order.items.forEach(item => {

        const product = item.mapValue?.fields || {};

        const name = getField(
            product,
            "name",
            "Product"
        );

        const quantity = Number(
            getField(product, "quantity", 0)
        );

        const price = Number(
            getField(product, "price", 0)
        );

        const row = document.createElement("div");

        row.className = "details-product";

        const productName = document.createElement("span");

        productName.textContent =
            name + " × " + quantity;

        const productPrice = document.createElement("strong");

        productPrice.textContent =
            "₹" + formatPrice(price * quantity);

        row.appendChild(productName);

        row.appendChild(productPrice);

        productsSection.appendChild(row);

    });

    content.appendChild(productsSection);

    // TOTAL AMOUNT

    const total = document.createElement("p");

    total.className = "details-total";

    total.textContent =
        "Order Total: ₹" + formatPrice(order.total);

    content.appendChild(total);

    // SHOW POPUP

    modal.classList.add("show");

}

// ==========================================
// UPDATE ORDER STATUS IN FIRESTORE
// ==========================================

async function updateOrderStatus(order, newStatus, statusSelect) {

    const token = sessionStorage.getItem("customerToken");

    const customerId = sessionStorage.getItem("customerId");

    if (!token || customerId !== ADMIN_UID) {

        alert("Admin login required.");

        window.location.href = "../customer/login.html";

        return;
    }

    if (!ORDER_STATUSES.includes(newStatus)) {

        alert("Invalid order status.");

        return;
    }

    const previousStatus = order.status;

    if (newStatus === previousStatus) return;

    statusSelect.disabled = true;

    try {

        const url =
            `${FIRESTORE_BASE_URL}/orders/${encodeURIComponent(order.orderId)}` +
            "?updateMask.fieldPaths=status";

        const body = {

            fields: {

                status: {

                    stringValue: newStatus

                }

            }

        };

        await firestoreRequest(

            url,

            {

                method: "PATCH",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify(body)

            },

            token

        );

        order.status = newStatus;

        alert(
            "Order status updated to " + newStatus + "."
        );

        displayOrders();

    } catch (error) {

        console.error("Order status update error:", error);

        alert(
            "Could not update order status: " + error.message
        );

        statusSelect.value = previousStatus;

    } finally {

        statusSelect.disabled = false;

    }

}

// ==========================================
// CLOSE ORDER DETAILS POPUP
// ==========================================

const closeOrderModal =
    document.getElementById("closeOrderModal");

const orderDetailsModal =
    document.getElementById("orderDetailsModal");

if (closeOrderModal && orderDetailsModal) {

    closeOrderModal.addEventListener("click", function () {

        orderDetailsModal.classList.remove("show");

    });

    orderDetailsModal.addEventListener("click", function (event) {

        if (event.target === orderDetailsModal) {

            orderDetailsModal.classList.remove("show");

        }

    });

    document.addEventListener("keydown", function (event) {

        if (
            event.key === "Escape" &&
            orderDetailsModal.classList.contains("show")
        ) {

            orderDetailsModal.classList.remove("show");

        }

    });

}

// ==========================================
// REFRESH ORDERS
// ==========================================

const refreshButton =
    document.getElementById("refreshOrders");

if (refreshButton) {

    refreshButton.addEventListener("click", loadOrders);

}

// ==========================================
// START ORDER MANAGEMENT
// ==========================================

loadOrders();
