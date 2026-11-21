
// ==========================================
// VELORA ADMIN - CUSTOMER MANAGEMENT
// CUSTOMER CREDIT LIMIT & OUTSTANDING CREDIT
// ==========================================

const ADMIN_CUSTOMER_UID =
    "XlBj1qfZsAeX5JEP9n24dMlsOXX2";

const customersList =
    document.getElementById("customersList");

const customerDetailsModal =
    document.getElementById("customerDetailsModal");

const customerDetailsContent =
    document.getElementById("customerDetailsContent");

let adminCustomers = [];
let adminCustomerOrders = [];


// ==========================================
// FIRESTORE FIELD HELPER
// ==========================================

function getCustomerField(fields, fieldName, fallback = "") {

    const field = fields?.[fieldName];

    if (!field) return fallback;

    return (
        field.stringValue ??
        field.integerValue ??
        field.doubleValue ??
        field.booleanValue ??
        field.timestampValue ??
        field.nullValue ??
        fallback
    );
}


// ==========================================
// PRICE FORMATTER
// ==========================================

function formatCustomerPrice(value) {

    return Number(value || 0).toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}


// ==========================================
// DATE FORMATTER
// ==========================================

function formatCustomerDate(value) {

    if (!value) return "Not available";

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return "Not available";
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}


// ==========================================
// GET CUSTOMER DOCUMENT ID
// ==========================================

function getCustomerDocumentId(document) {

    return document.name.split("/").pop();
}


// ==========================================
// ADMIN AUTHENTICATION
// ==========================================

function getAdminToken() {

    const loggedInUID =
        sessionStorage.getItem("customerId");

    const token =
        sessionStorage.getItem("customerToken");

    if (!loggedInUID || !token) {

        window.location.href =
            "../customer/login.html";

        return null;
    }

    if (loggedInUID !== ADMIN_CUSTOMER_UID) {

        if (customersList) {
            customersList.textContent =
                "Access denied. Admin login required.";
        }

        return null;
    }

    return token;
}


// ==========================================
// CHECK CREDIT PAYMENT ORDER
// ==========================================

function isCustomerCreditOrder(order) {

    return String(order.payment || "")
        .toLowerCase()
        .includes("credit");
}


// ==========================================
// GET CUSTOMER OUTSTANDING CREDIT
// ==========================================

function getCustomerOutstandingCredit(customerId) {

    const customerOrders =
        getOrdersForCustomer(customerId);

    return customerOrders.reduce((total, order) => {

        // Ignore non-credit orders.
        if (!isCustomerCreditOrder(order)) {
            return total;
        }

        // Ignore cancelled orders.
        if (
            String(order.status).toLowerCase() === "cancelled"
        ) {
            return total;
        }

        // Ignore paid orders.
        if (
            String(order.paymentStatus).toLowerCase() === "paid"
        ) {
            return total;
        }

        // Unpaid credit orders count as outstanding.
        return total + Number(order.total || 0);

    }, 0);
}


// ==========================================
// GET CUSTOMER AVAILABLE CREDIT
// ==========================================

function getCustomerAvailableCredit(customer) {

    const outstanding =
        getCustomerOutstandingCredit(customer.id);

    return Math.max(
        0,
        Number(customer.creditLimit || 0) - outstanding
    );
}


// ==========================================
// LOAD CUSTOMERS AND ORDERS
// ==========================================

async function loadCustomers() {

    const token = getAdminToken();

    if (!token) return;

    try {

        customersList.textContent =
            "Loading customer information...";

        const customersURL =
            `${FIRESTORE_BASE_URL}/customers`;

        const ordersURL =
            `${FIRESTORE_BASE_URL}/orders`;

        const [customerData, orderData] =
            await Promise.all([

                firestoreRequest(
                    customersURL,
                    { method: "GET" },
                    token
                ),

                firestoreRequest(
                    ordersURL,
                    { method: "GET" },
                    token
                )

            ]);

        const customerDocuments =
            customerData.documents || [];

        const orderDocuments =
            orderData.documents || [];


        // ==================================
        // CONVERT CUSTOMER DOCUMENTS
        // ==================================

        adminCustomers = customerDocuments.map(document => {

            const fields = document.fields || {};

            return {

                id: getCustomerDocumentId(document),

                name: getCustomerField(
                    fields,
                    "fullName",
                    "Customer"
                ),

                email: getCustomerField(
                    fields,
                    "email",
                    "Email not available"
                ),

                createdAt: getCustomerField(
                    fields,
                    "createdAt",
                    ""
                ),

                creditLimit: Number(
                    getCustomerField(
                        fields,
                        "creditLimit",
                        0
                    )
                ) || 0,

                fields: fields

            };

        });


        // ==================================
        // CONVERT ORDER DOCUMENTS
        // ==================================

        adminCustomerOrders = orderDocuments.map(document => {

            const fields = document.fields || {};

            const payment = getCustomerField(
                fields,
                "paymentMethod",
                "Not provided"
            );

            const paymentStatus = getCustomerField(
                fields,
                "paymentStatus",
                String(payment).toLowerCase().includes("credit")
                    ? "Unpaid"
                    : "Not Applicable"
            );

            return {

                id: getCustomerDocumentId(document),

                customerId: getCustomerField(
                    fields,
                    "customerId",
                    ""
                ),

                customerName: getCustomerField(
                    fields,
                    "fullName",
                    "Customer"
                ),

                total: Number(
                    getCustomerField(fields, "total", 0)
                ),

                status: getCustomerField(
                    fields,
                    "status",
                    "Pending"
                ),

                payment: payment,

                paymentStatus: paymentStatus,

                createdAt: getCustomerField(
                    fields,
                    "createdAt",
                    getCustomerField(fields, "orderDate", "")
                )

            };

        });


        createCustomerSearch();

        updateCustomerStatistics();

        displayCustomers();

    } catch (error) {

        console.error(
            "Customer loading error:",
            error
        );

        customersList.textContent =
            "Unable to load customers: " + error.message;
    }
}


// ==========================================
// GET ORDERS FOR ONE CUSTOMER
// ==========================================

function getOrdersForCustomer(customerId) {

    return adminCustomerOrders.filter(order => {

        return order.customerId === customerId;

    });
}


// ==========================================
// CUSTOMER SPENDING
// ==========================================

function getCustomerSpending(customerId) {

    const customerOrders =
        getOrdersForCustomer(customerId);

    return customerOrders.reduce((total, order) => {

        if (
            String(order.status).toLowerCase() === "cancelled"
        ) {
            return total;
        }

        return total + Number(order.total || 0);

    }, 0);
}


// ==========================================
// CUSTOMER STATISTICS
// ==========================================

function updateCustomerStatistics() {

    const totalCustomers =
        adminCustomers.length;

    const customersWithOrders =
        adminCustomers.filter(customer => {

            return getOrdersForCustomer(customer.id).length > 0;

        }).length;

    const totalOrders =
        adminCustomerOrders.length;

    const totalSpending =
        adminCustomerOrders.reduce((total, order) => {

            if (
                String(order.status).toLowerCase() === "cancelled"
            ) {
                return total;
            }

            return total + Number(order.total || 0);

        }, 0);


    const totalCustomersElement =
        document.getElementById("totalCustomers");

    const customersWithOrdersElement =
        document.getElementById("customersWithOrders");

    const totalCustomerOrdersElement =
        document.getElementById("totalCustomerOrders");

    const totalCustomerSpendingElement =
        document.getElementById("totalCustomerSpending");


    if (totalCustomersElement) {
        totalCustomersElement.textContent = totalCustomers;
    }

    if (customersWithOrdersElement) {
        customersWithOrdersElement.textContent =
            customersWithOrders;
    }

    if (totalCustomerOrdersElement) {
        totalCustomerOrdersElement.textContent = totalOrders;
    }

    if (totalCustomerSpendingElement) {
        totalCustomerSpendingElement.textContent =
            formatCustomerPrice(totalSpending);
    }
}


// ==========================================
// CREATE CUSTOMER SEARCH
// ==========================================

function createCustomerSearch() {

    if (document.getElementById("customerSearch")) {
        return;
    }

    const controls =
        document.createElement("div");

    controls.className = "customer-controls";

    const searchInput =
        document.createElement("input");

    searchInput.type = "text";

    searchInput.id = "customerSearch";

    searchInput.placeholder =
        "Search customers by name or email...";

    controls.appendChild(searchInput);

    const panel =
        document.querySelector(".customers-panel");

    const panelHeading =
        panel?.querySelector(".panel-heading");

    if (!panel || !panelHeading) {
        console.error("Customer search container is missing.");
        return;
    }

    panel.insertBefore(
        controls,
        panelHeading.nextSibling
    );

    searchInput.addEventListener(
        "input",
        displayCustomers
    );
}


// ==========================================
// UPDATE CUSTOMER CREDIT LIMIT
// ==========================================

async function updateCustomerCreditLimit(customer) {

    const token = getAdminToken();

    if (!token) return;

    const enteredValue = prompt(
        "Enter the new credit limit for " +
        customer.name +
        " (in ₹):",
        customer.creditLimit
    );

    if (enteredValue === null) {
        return;
    }

    const newCreditLimit = Number(
        enteredValue.trim()
    );

    if (
        enteredValue.trim() === "" ||
        !Number.isFinite(newCreditLimit) ||
        newCreditLimit < 0
    ) {

        alert(
            "Please enter a valid credit limit greater than or equal to ₹0."
        );

        return;
    }

    if (newCreditLimit === customer.creditLimit) {

        alert("The credit limit has not changed.");

        return;
    }

    try {

        const updateButton =
            document.querySelector(
                `[data-credit-customer="${customer.id}"]`
            );

        if (updateButton) {
            updateButton.disabled = true;
            updateButton.textContent = "Updating...";
        }

        const customerURL =
            `${FIRESTORE_BASE_URL}/customers/${customer.id}` +
            `?updateMask.fieldPaths=creditLimit`;

        await firestoreRequest(

            customerURL,

            {
                method: "PATCH",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    fields: {

                        creditLimit: {

                            doubleValue: newCreditLimit

                        }

                    }

                })

            },

            token

        );

        customer.creditLimit = newCreditLimit;

        displayCustomers();

        if (
            customerDetailsModal &&
            customerDetailsModal.classList.contains("show")
        ) {
            viewCustomerDetails(customer);
        }

        alert(
            "Credit limit updated successfully!\n\n" +
            "Customer: " + customer.name +
            "\nNew Credit Limit: " +
            formatCustomerPrice(newCreditLimit)
        );

    } catch (error) {

        console.error(
            "Credit limit update error:",
            error
        );

        alert(
            "Unable to update credit limit: " +
            error.message
        );

        displayCustomers();
    }
}


// ==========================================
// DISPLAY CUSTOMERS
// ==========================================

function displayCustomers() {

    const searchText = (

        document.getElementById("customerSearch")?.value || ""

    ).toLowerCase().trim();


    const filteredCustomers =
        adminCustomers.filter(customer => {

            const name =
                String(customer.name).toLowerCase();

            const email =
                String(customer.email).toLowerCase();

            return (
                name.includes(searchText) ||
                email.includes(searchText)
            );

        });


    customersList.innerHTML = "";


    if (adminCustomers.length === 0) {

        customersList.innerHTML =
            '<p class="loading-message">No registered customers found.</p>';

        return;
    }


    if (filteredCustomers.length === 0) {

        customersList.innerHTML =
            '<p class="loading-message">No matching customers found.</p>';

        return;
    }


    filteredCustomers.forEach(customer => {

        const orders =
            getOrdersForCustomer(customer.id);

        const spending =
            getCustomerSpending(customer.id);

        const outstanding =
            getCustomerOutstandingCredit(customer.id);

        const available =
            getCustomerAvailableCredit(customer);


        // CUSTOMER CARD

        const card =
            document.createElement("div");

        card.className = "customer-card";


        // CUSTOMER INFORMATION

        const info =
            document.createElement("div");

        info.className = "customer-info";


        const name =
            document.createElement("h4");

        name.textContent = customer.name;


        const email =
            document.createElement("p");

        email.textContent =
            "Email: " + customer.email;


        const joined =
            document.createElement("p");

        joined.textContent =
            "Joined: " +
            formatCustomerDate(customer.createdAt);


        info.appendChild(name);

        info.appendChild(email);

        info.appendChild(joined);


        // CUSTOMER SUMMARY

        const summary =
            document.createElement("div");

        summary.className = "customer-summary";


        function createSummaryItem(label, value) {

            const paragraph =
                document.createElement("p");

            paragraph.textContent = label;

            const strong =
                document.createElement("strong");

            strong.textContent = value;

            paragraph.appendChild(strong);

            return paragraph;
        }


        summary.appendChild(
            createSummaryItem(
                "Total Orders",
                orders.length
            )
        );

        summary.appendChild(
            createSummaryItem(
                "Total Spending",
                formatCustomerPrice(spending)
            )
        );

        summary.appendChild(
            createSummaryItem(
                "Credit Limit",
                formatCustomerPrice(customer.creditLimit)
            )
        );

        summary.appendChild(
            createSummaryItem(
                "Outstanding Credit",
                formatCustomerPrice(outstanding)
            )
        );

        summary.appendChild(
            createSummaryItem(
                "Available Credit",
                formatCustomerPrice(available)
            )
        );


        // BUTTON CONTAINER

        const actions =
            document.createElement("div");

        actions.className = "customer-card-actions";


        // UPDATE CREDIT BUTTON

        const creditButton =
            document.createElement("button");

        creditButton.type = "button";

        creditButton.className =
            "update-credit-btn";

        creditButton.textContent =
            "Update Credit Limit";

        creditButton.dataset.creditCustomer =
            customer.id;

        creditButton.addEventListener("click", function () {

            updateCustomerCreditLimit(customer);

        });


        // VIEW DETAILS BUTTON

        const detailsButton =
            document.createElement("button");

        detailsButton.type = "button";

        detailsButton.className =
            "view-customer-btn";

        detailsButton.textContent =
            "View Details";

        detailsButton.addEventListener("click", function () {

            viewCustomerDetails(customer);

        });


        actions.appendChild(creditButton);

        actions.appendChild(detailsButton);


        card.appendChild(info);

        card.appendChild(summary);

        card.appendChild(actions);

        customersList.appendChild(card);

    });

}


// ==========================================
// VIEW CUSTOMER PROFILE AND ORDER HISTORY
// ==========================================

function viewCustomerDetails(customer) {

    if (!customerDetailsModal || !customerDetailsContent) {

        console.error(
            "Customer details modal elements are missing."
        );

        return;
    }

    customerDetailsContent.innerHTML = "";


    const orders =
        getOrdersForCustomer(customer.id);

    const spending =
        getCustomerSpending(customer.id);

    const outstanding =
        getCustomerOutstandingCredit(customer.id);

    const available =
        getCustomerAvailableCredit(customer);


    // HELPER TO CREATE PROFILE SECTIONS

    function addCustomerSection(title, lines) {

        const section =
            document.createElement("div");

        section.className =
            "customer-detail-section";


        const heading =
            document.createElement("h3");

        heading.textContent = title;

        section.appendChild(heading);


        lines.forEach(line => {

            const paragraph =
                document.createElement("p");

            paragraph.textContent = line;

            section.appendChild(paragraph);

        });


        customerDetailsContent.appendChild(section);
    }


    // CUSTOMER PROFILE

    addCustomerSection("Customer Information", [

        "Customer ID: " + customer.id,

        "Full Name: " + customer.name,

        "Email Address: " + customer.email,

        "Registration Date: " +
        formatCustomerDate(customer.createdAt)

    ]);


    // CREDIT LIMIT INFORMATION

    addCustomerSection("Customer Credit Information", [

        "Credit Limit: " +
        formatCustomerPrice(customer.creditLimit),

        "Outstanding Credit: " +
        formatCustomerPrice(outstanding),

        "Available Credit: " +
        formatCustomerPrice(available)

    ]);


    // CREDIT LIMIT UPDATE BUTTON

    const creditButton =
        document.createElement("button");

    creditButton.type = "button";

    creditButton.className =
        "update-credit-btn";

    creditButton.textContent =
        "Update Customer Credit Limit";

    creditButton.addEventListener("click", function () {

        updateCustomerCreditLimit(customer);

    });

    customerDetailsContent.appendChild(creditButton);


    // CUSTOMER PURCHASE SUMMARY

    addCustomerSection("Purchase Summary", [

        "Total Orders: " + orders.length,

        "Total Spending (excluding cancelled orders): " +
        formatCustomerPrice(spending)

    ]);


    // ORDER HISTORY

    const orderSection =
        document.createElement("div");

    orderSection.className =
        "customer-detail-section";


    const orderHeading =
        document.createElement("h3");

    orderHeading.textContent =
        "Customer Order History";

    orderSection.appendChild(orderHeading);


    if (orders.length === 0) {

        const message =
            document.createElement("p");

        message.textContent =
            "This customer has not placed any orders yet.";

        orderSection.appendChild(message);

    } else {

        orders.forEach(order => {

            const orderCard =
                document.createElement("div");

            orderCard.className =
                "customer-order-card";


            const heading =
                document.createElement("h4");

            heading.textContent =
                "Order #" + order.id;


            const status =
                document.createElement("p");

            status.textContent =
                "Delivery Status: " + order.status;


            const payment =
                document.createElement("p");

            payment.textContent =
                "Payment Method: " + order.payment;


            const paymentStatus =
                document.createElement("p");

            paymentStatus.textContent =
                "Payment Status: " + order.paymentStatus;


            const amount =
                document.createElement("p");

            amount.textContent =
                "Order Total: " +
                formatCustomerPrice(order.total);


            const date =
                document.createElement("p");

            date.textContent =
                "Order Date: " +
                formatCustomerDate(order.createdAt);


            orderCard.appendChild(heading);

            orderCard.appendChild(status);

            orderCard.appendChild(payment);

            orderCard.appendChild(paymentStatus);

            orderCard.appendChild(amount);

            orderCard.appendChild(date);

            orderSection.appendChild(orderCard);

        });

    }


    customerDetailsContent.appendChild(orderSection);


    // SHOW MODAL

    customerDetailsModal.classList.add("show");
}


// ==========================================
// CLOSE CUSTOMER DETAILS MODAL
// ==========================================

const closeCustomerModal =
    document.getElementById("closeCustomerModal");


if (closeCustomerModal && customerDetailsModal) {

    closeCustomerModal.addEventListener("click", function () {

        customerDetailsModal.classList.remove("show");

    });


    customerDetailsModal.addEventListener("click", function (event) {

        if (event.target === customerDetailsModal) {

            customerDetailsModal.classList.remove("show");

        }

    });


    document.addEventListener("keydown", function (event) {

        if (
            event.key === "Escape" &&
            customerDetailsModal.classList.contains("show")
        ) {

            customerDetailsModal.classList.remove("show");

        }

    });

}


// ==========================================
// REFRESH CUSTOMERS
// ==========================================

const refreshCustomersButton =
    document.getElementById("refreshCustomers");


if (refreshCustomersButton) {

    refreshCustomersButton.addEventListener(
        "click",
        loadCustomers
    );

}


// ==========================================
// START CUSTOMER MANAGEMENT
// ==========================================

loadCustomers();
