
// ==========================================
// VELORA - CUSTOMER PROFILE DASHBOARD
// ==========================================


// ==========================================
// CUSTOMER SESSION
// ==========================================

const profileCustomerId =
    sessionStorage.getItem("customerId");

const profileCustomerEmail =
    sessionStorage.getItem("customerEmail");

const profileToken =
    sessionStorage.getItem("customerToken");


// ==========================================
// PAGE INITIALIZATION
// ==========================================

document.addEventListener("DOMContentLoaded", function () {

    initializeProfileDashboard();

});


async function initializeProfileDashboard() {

    if (!profileCustomerId || !profileToken) {

        alert("Please login to view your profile.");

        window.location.href = "login.html";

        return;

    }

    // Set basic account information
    document.getElementById("email").value =
        profileCustomerEmail || "";

    document.getElementById("customerId").value =
        profileCustomerId;

    document.getElementById("sidebarEmail").textContent =
        profileCustomerEmail || "";


    // Logout
    const logoutButton =
        document.getElementById("logoutBtn");

    if (logoutButton) {

        logoutButton.addEventListener("click", function (event) {

            event.preventDefault();

            sessionStorage.removeItem("customerId");
            sessionStorage.removeItem("customerEmail");
            sessionStorage.removeItem("customerToken");
            sessionStorage.removeItem("customerRefreshToken");

            window.location.replace("login.html");

        });

    }


    // Profile form
    const profileForm =
        document.getElementById("profileForm");

    if (profileForm) {

        profileForm.addEventListener(
            "submit",
            updateProfile
        );

    }


    // Load profile and account information
    await loadCustomerProfile();

}


// ==========================================
// SHOW MESSAGE
// ==========================================

function showProfileMessage(messageText, type) {

    const message =
        document.getElementById("message");

    if (!message) return;

    message.textContent = messageText;

    message.className = "message " + type;

}


// ==========================================
// FIRESTORE VALUE CONVERSION
// ==========================================

function getProfileFirestoreValue(field) {

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
// GET PROFILE FIELD
// ==========================================

function getProfileField(profile, fieldName) {

    if (!profile) return "";

    // Firestore REST document format
    if (profile.fields) {

        return getProfileFirestoreValue(
            profile.fields[fieldName]
        );

    }

    // Already converted profile format
    return profile[fieldName] ?? "";

}


// ==========================================
// UPDATE PROFILE NAME DISPLAY
// ==========================================

function updateProfileNameDisplay(name) {

    const displayName = name || "Customer";

    const fullNameInput =
        document.getElementById("fullName");

    const sidebarName =
        document.getElementById("sidebarName");

    const profileAvatar =
        document.getElementById("profileAvatar");

    if (fullNameInput) {
        fullNameInput.value = name || "";
    }

    if (sidebarName) {
        sidebarName.textContent = displayName;
    }

    if (profileAvatar) {

        profileAvatar.textContent =
            displayName.charAt(0).toUpperCase();

    }

}


// ==========================================
// LOAD CUSTOMER PROFILE
// ==========================================

async function loadCustomerProfile() {

    try {

        const profile = await getCustomerProfile(
            profileCustomerId,
            profileToken
        );

        if (!profile) {

            showProfileMessage(
                "Your customer profile could not be found.",
                "error"
            );

            return;

        }

        const name =
            getProfileField(profile, "fullName") ||
            getProfileField(profile, "name");

        updateProfileNameDisplay(name);

        // Load account statistics and credit summary
        await loadProfileAccountSummary(
            profile
        );

    } catch (error) {

        console.error(
            "Profile loading error:",
            error
        );

        showProfileMessage(
            error.message || "Unable to load your profile.",
            "error"
        );

    }

}


// ==========================================
// UPDATE CUSTOMER PROFILE
// ==========================================

async function updateProfile(event) {

    event.preventDefault();

    const fullNameInput =
        document.getElementById("fullName");

    const saveBtn =
        document.getElementById("saveBtn");

    const newName =
        fullNameInput.value.trim();

    if (!newName) {

        showProfileMessage(
            "Please enter your full name.",
            "error"
        );

        return;

    }

    if (newName.length < 2) {

        showProfileMessage(
            "Name must contain at least 2 characters.",
            "error"
        );

        return;

    }

    saveBtn.disabled = true;

    saveBtn.textContent = "Saving...";

    try {

        await updateCustomerName(
            profileCustomerId,
            profileToken,
            newName
        );

        updateProfileNameDisplay(newName);

        showProfileMessage(
            "Your profile was updated successfully!",
            "success"
        );

    } catch (error) {

        console.error(
            "Profile update error:",
            error
        );

        showProfileMessage(
            error.message || "Unable to update your profile.",
            "error"
        );

    } finally {

        saveBtn.disabled = false;

        saveBtn.textContent = "Save Changes";

    }

}


// ==========================================
// LOAD PROFILE ACCOUNT SUMMARY
// ==========================================

async function loadProfileAccountSummary(profile) {

    try {

        const creditLimit = Number(
            getProfileField(profile, "creditLimit")
        ) || 0;

        // Fetch customer's orders
        const orders = await getProfileCustomerOrders();

        // Calculate total spending
        const totalSpent = orders.reduce(
            function (total, order) {

                if (
                    String(order.status).toLowerCase() ===
                    "cancelled"
                ) {
                    return total;
                }

                return total + order.total;

            },
            0
        );

        // Get credit orders
        const creditOrders = orders.filter(
            function (order) {

                return order.paymentMethod ===
                    "Credit Payment";

            }
        );

        // Calculate outstanding credit
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

        const availableCredit = Math.max(
            0,
            creditLimit - outstandingCredit
        );

        // Update account summary
        document.getElementById(
            "profileTotalOrders"
        ).textContent = orders.length;

        document.getElementById(
            "profileTotalSpent"
        ).textContent = formatProfilePrice(totalSpent);

        document.getElementById(
            "profileCreditLimit"
        ).textContent = formatProfilePrice(creditLimit);

        document.getElementById(
            "profileOutstandingCredit"
        ).textContent = formatProfilePrice(outstandingCredit);

        document.getElementById(
            "profileAvailableCredit"
        ).textContent = formatProfilePrice(availableCredit);

        // Display recent orders
        displayProfileRecentOrders(orders);

    } catch (error) {

        console.error(
            "Account summary error:",
            error
        );

        const recentOrders =
            document.getElementById("recentOrdersList");

        if (recentOrders) {

            recentOrders.innerHTML = `
                <div class="recent-orders-error">
                    Unable to load your account activity.
                    Please refresh the page.
                </div>
            `;

        }

    }

}


// ==========================================
// FETCH CUSTOMER ORDERS
// ==========================================

async function getProfileCustomerOrders() {

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
                        stringValue: profileCustomerId
                    }

                }

            }

        }

    };

    const data = await firestoreRequest(

        FIRESTORE_BASE_URL + ":runQuery",

        {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(query)

        },

        profileToken

    );

    const documents = data

        .filter(function (result) {
            return result.document;
        })

        .map(function (result) {
            return result.document;
        });

    const orders = documents.map(
        convertProfileOrder
    );

    // Newest orders first
    orders.sort(function (a, b) {

        return new Date(b.orderDate) -
            new Date(a.orderDate);

    });

    return orders;

}


// ==========================================
// CONVERT FIRESTORE ORDER
// ==========================================

function convertProfileOrder(documentData) {

    const fields =
        documentData.fields || {};

    const paymentMethod =
        getProfileFirestoreValue(fields.paymentMethod);

    const items =
        fields.items?.arrayValue?.values || [];

    return {

        orderId: documentData.name.split("/").pop(),

        total: Number(
            getProfileFirestoreValue(fields.total)
        ) || 0,

        status:
            getProfileFirestoreValue(fields.status) ||
            "Order Placed",

        paymentMethod: paymentMethod,

        paymentStatus:
            getProfileFirestoreValue(fields.paymentStatus) ||
            (
                paymentMethod === "Credit Payment"
                    ? "Unpaid"
                    : "Not Applicable"
            ),

        orderDate:
            getProfileFirestoreValue(fields.orderDate),

        items: items.map(function (item) {

            const itemFields =
                item.mapValue?.fields || {};

            return {

                name:
                    getProfileFirestoreValue(itemFields.name),

                quantity:
                    Number(
                        getProfileFirestoreValue(itemFields.quantity)
                    ) || 0,

                price:
                    Number(
                        getProfileFirestoreValue(itemFields.price)
                    ) || 0

            };

        })

    };

}


// ==========================================
// DISPLAY RECENT ORDERS
// ==========================================

function displayProfileRecentOrders(orders) {

    const container =
        document.getElementById("recentOrdersList");

    if (!container) return;

    if (orders.length === 0) {

        container.innerHTML = `

            <div class="recent-orders-empty">

                <h3>No Orders Yet</h3>

                <p>
                    Your VELORA shopping journey starts here.
                </p>

                <a href="products.html">
                    EXPLORE COLLECTION
                </a>

            </div>

        `;

        return;

    }

    // Display maximum five recent orders
    const recentOrders = orders.slice(0, 5);

    container.innerHTML = recentOrders.map(
        function (order) {

            const status =
                String(order.status || "Order Placed");

            const statusClass =
                getProfileOrderStatusClass(status);

            const paymentStatus =
                String(order.paymentStatus || "");

            return `

                <article class="recent-order-card">

                    <div class="recent-order-info">

                        <h3>
                            Order #${escapeProfileHTML(order.orderId)}
                        </h3>

                        <p>
                            ${formatProfileDate(order.orderDate)}
                        </p>

                    </div>


                    <div class="recent-order-payment">

                        <span>Payment</span>

                        <strong>
                            ${escapeProfileHTML(order.paymentMethod || "Not specified")}
                        </strong>

                        ${
                            order.paymentMethod === "Credit Payment"
                            ? `
                                <small class="${
                                    paymentStatus.toLowerCase() === "paid"
                                        ? "profile-paid"
                                        : "profile-unpaid"
                                }">
                                    ${escapeProfileHTML(paymentStatus)}
                                </small>
                            `
                            : ""
                        }

                    </div>


                    <div class="recent-order-status">

                        <span class="profile-order-status ${statusClass}">
                            ${escapeProfileHTML(status)}
                        </span>

                        <strong>
                            ${formatProfilePrice(order.total)}
                        </strong>

                    </div>

                </article>

            `;

        }
    ).join("");

}


// ==========================================
// ORDER STATUS STYLE
// ==========================================

function getProfileOrderStatusClass(status) {

    const normalized =
        String(status).toLowerCase().trim();

    const classes = {

        "pending": "profile-pending",

        "processing": "profile-processing",

        "shipped": "profile-shipped",

        "delivered": "profile-delivered",

        "cancelled": "profile-cancelled",

        "order placed": "profile-placed"

    };

    return classes[normalized] || "profile-placed";

}


// ==========================================
// FORMAT PRICE
// ==========================================

function formatProfilePrice(amount) {

    return "₹" + Number(amount).toLocaleString("en-IN", {

        minimumFractionDigits: 2,

        maximumFractionDigits: 2

    });

}


// ==========================================
// FORMAT DATE
// ==========================================

function formatProfileDate(value) {

    if (!value) return "Date unavailable";

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return date.toLocaleString("en-IN", {

        day: "2-digit",

        month: "short",

        year: "numeric",

        hour: "2-digit",

        minute: "2-digit"

    });

}


// ==========================================
// HTML ESCAPING
// ==========================================

function escapeProfileHTML(value) {

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
