
// ==========================================
// VELORA ADMIN DASHBOARD
// ==========================================

const ADMIN_DASHBOARD_UID = "XlBj1qfZsAeX5JEP9n24dMlsOXX2";
const LOW_STOCK_LIMIT = 5;

let dashboardProducts = [];
let dashboardOrders = [];
let dashboardCustomers = [];
let salesChartInstance = null;

// ==========================================
// DASHBOARD ELEMENTS
// ==========================================

const dashboardElements = {
    totalProducts: document.getElementById("totalProducts"),
    totalOrders: document.getElementById("totalOrders"),
    totalCustomers: document.getElementById("totalCustomers"),
    totalRevenue: document.getElementById("totalRevenue"),

    salesChart: document.getElementById("salesChart"),
    bestSellingProducts: document.getElementById("bestSellingProducts"),
    lowStockProducts: document.getElementById("lowStockProducts"),
    recentCustomers: document.getElementById("recentCustomers"),
    recentOrders: document.getElementById("recentOrders"),

    dashboardMessage: document.getElementById("dashboardMessage")
};

// ==========================================
// FIRESTORE FIELD READER
// ==========================================

function getAdminField(fields, fieldName) {

    if (!fields || !fields[fieldName]) {
        return null;
    }

    const field = fields[fieldName];

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

    if (field.mapValue?.fields) {
        return field.mapValue.fields;
    }

    if (field.arrayValue?.values) {
        return field.arrayValue.values.map(item => {

            if (item.mapValue?.fields) {
                return item.mapValue.fields;
            }

            if (item.stringValue !== undefined) {
                return item.stringValue;
            }

            if (item.integerValue !== undefined) {
                return Number(item.integerValue);
            }

            if (item.doubleValue !== undefined) {
                return Number(item.doubleValue);
            }

            return item;
        });
    }

    return null;
}

// ==========================================
// ORDER ITEM FIELD READER
// ==========================================

function getItemField(item, fieldName) {

    if (!item || !fieldName) {
        return null;
    }

    let value;

    if (item.mapValue?.fields) {
        value = item.mapValue.fields[fieldName];
    }
    else if (item.fields) {
        value = item.fields[fieldName];
    }
    else {
        value = item[fieldName];
    }

    if (value === undefined || value === null) {
        return null;
    }

    if (typeof value === "object") {

        if (value.stringValue !== undefined) {
            return value.stringValue;
        }

        if (value.integerValue !== undefined) {
            return Number(value.integerValue);
        }

        if (value.doubleValue !== undefined) {
            return Number(value.doubleValue);
        }

        if (value.booleanValue !== undefined) {
            return value.booleanValue;
        }

        if (value.timestampValue !== undefined) {
            return value.timestampValue;
        }

        if (value.mapValue?.fields) {
            return value.mapValue.fields;
        }

        if (value.arrayValue?.values) {
            return value.arrayValue.values;
        }

        if (value.nullValue !== undefined) {
            return null;
        }
    }

    return value;
}

// ==========================================
// DATE FUNCTIONS
// ==========================================

function parseAdminDate(value) {

    if (!value) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

function formatAdminDate(value) {

    const date = parseAdminDate(value);

    if (!date) {
        return "Not available";
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function getOrderDate(order) {

    return (
        order.orderDate ||
        order.createdAt ||
        order.createdOn ||
        null
    );
}

function getCustomerDate(customer) {

    return (
        customer.createdAt ||
        customer.registeredAt ||
        null
    );
}

// ==========================================
// PRICE FORMAT
// ==========================================

function formatAdminPrice(amount) {

    const value = Number(amount) || 0;

    return value.toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    });
}

// ==========================================
// FIRESTORE COLLECTION READER
// ==========================================

async function getAdminCollection(collectionName, token) {

    const url = `${FIRESTORE_BASE_URL}/${collectionName}`;

    const data = await firestoreRequest(
        url,
        { method: "GET" },
        token
    );

    return data.documents || [];
}

// ==========================================
// CONVERT DOCUMENT TO OBJECT
// ==========================================

function convertAdminDocument(document) {

    const fields = document.fields || {};

    const result = {};

    Object.keys(fields).forEach(key => {
        result[key] = getAdminField(fields, key);
    });

    result.documentName = document.name;

    result.documentId = document.name
        ? document.name.split("/").pop()
        : "";

    return result;
}

// ==========================================
// ORDER STATUS
// ==========================================

function isCancelledOrder(order) {

    return String(order.status || "")
        .toLowerCase() === "cancelled";
}

// ==========================================
// DASHBOARD STATISTICS
// ==========================================

function displayAdminStatistics() {

    const totalProducts = dashboardProducts.length;

    // Includes all orders, including cancelled orders
    const totalOrders = dashboardOrders.length;

    const customerIds = new Set();

    let totalRevenue = 0;

    dashboardOrders.forEach(order => {

        if (order.customerId) {
            customerIds.add(order.customerId);
        }

        // Exclude cancelled orders from revenue
        if (!isCancelledOrder(order)) {
            totalRevenue += Number(order.total) || 0;
        }
    });

    if (dashboardElements.totalProducts) {
        dashboardElements.totalProducts.textContent = totalProducts;
    }

    if (dashboardElements.totalOrders) {
        dashboardElements.totalOrders.textContent = totalOrders;
    }

    if (dashboardElements.totalCustomers) {
        dashboardElements.totalCustomers.textContent = customerIds.size;
    }

    if (dashboardElements.totalRevenue) {
        dashboardElements.totalRevenue.textContent =
            formatAdminPrice(totalRevenue);
    }
}

// ==========================================
// LAST SIX MONTHS
// ==========================================

function getLastSixMonths() {

    const months = [];

    const today = new Date();

    for (let i = 5; i >= 0; i--) {

        const date = new Date(
            today.getFullYear(),
            today.getMonth() - i,
            1
        );

        months.push({
            key: `${date.getFullYear()}-${String(
                date.getMonth() + 1
            ).padStart(2, "0")}`,

            label: date.toLocaleDateString("en-IN", {
                month: "short",
                year: "numeric"
            }),

            revenue: 0,
            orders: 0
        });
    }

    return months;
}

// ==========================================
// MONTHLY SALES CHART
// ==========================================

function displaySalesChart() {

    const canvas = dashboardElements.salesChart;

    if (!canvas || typeof Chart === "undefined") {
        console.warn("Sales chart canvas or Chart.js not found.");
        return;
    }

    const months = getLastSixMonths();

    const monthMap = new Map();

    months.forEach(month => {
        monthMap.set(month.key, month);
    });

    dashboardOrders.forEach(order => {

        if (isCancelledOrder(order)) {
            return;
        }

        const orderDate = parseAdminDate(getOrderDate(order));

        if (!orderDate) {
            return;
        }

        const key =
            `${orderDate.getFullYear()}-${String(
                orderDate.getMonth() + 1
            ).padStart(2, "0")}`;

        const month = monthMap.get(key);

        if (month) {
            month.revenue += Number(order.total) || 0;
            month.orders += 1;
        }
    });

    if (salesChartInstance) {
        salesChartInstance.destroy();
    }

    salesChartInstance = new Chart(canvas, {

        type: "bar",

        data: {
            labels: months.map(month => month.label),

            datasets: [

                {
                    type: "bar",
                    label: "Monthly Revenue",
                    data: months.map(month => month.revenue),
                    backgroundColor: "#203b30",
                    borderRadius: 6,
                    yAxisID: "y"
                },

                {
                    type: "line",
                    label: "Number of Orders",
                    data: months.map(month => month.orders),
                    borderColor: "#c5a46d",
                    backgroundColor: "#c5a46d",
                    tension: 0.35,
                    yAxisID: "y1"
                }

            ]
        },

        options: {

            responsive: true,
            maintainAspectRatio: false,

            interaction: {
                mode: "index",
                intersect: false
            },

            plugins: {
                legend: {
                    position: "bottom"
                }
            },

            scales: {

                y: {
                    beginAtZero: true,
                    position: "left",
                    title: {
                        display: true,
                        text: "Revenue (₹)"
                    }
                },

                y1: {
                    beginAtZero: true,
                    position: "right",
                    grid: {
                        drawOnChartArea: false
                    },
                    title: {
                        display: true,
                        text: "Orders"
                    }
                }

            }
        }
    });
}

// ==========================================
// GET ORDER ITEMS
// ==========================================

function getOrderItems(fields) {

    const itemsField = fields.items;

    if (!itemsField || !itemsField.arrayValue) {
        return [];
    }

    return itemsField.arrayValue.values || [];
}

// ==========================================
// BEST-SELLING PRODUCTS
// ==========================================

function displayBestSellingProducts() {

    const container = dashboardElements.bestSellingProducts;

    if (!container) {
        return;
    }

    const productSales = {};

    dashboardOrders.forEach(order => {

        if (isCancelledOrder(order)) {
            return;
        }

        const rawItems = order.rawItems || [];

        rawItems.forEach(item => {

            const productId =
                getItemField(item, "productId");

            const productName =
                getItemField(item, "name") ||
                getItemField(item, "productName") ||
                "Unnamed Product";

            const quantity =
                Number(getItemField(item, "quantity")) || 0;

            if (quantity <= 0) {
                return;
            }

            const key = productId || productName;

            if (!productSales[key]) {

                productSales[key] = {
                    name: productName,
                    quantity: 0
                };
            }

            productSales[key].quantity += quantity;
        });
    });

    const bestSelling = Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

    if (bestSelling.length === 0) {

        container.innerHTML = `
            <p class="empty-text">
                No product sales available yet.
            </p>
        `;

        return;
    }

    container.innerHTML = bestSelling.map((product, index) => `

        <div class="dashboard-list-item">

            <div class="list-product-info">

                <span class="product-rank">
                    ${index + 1}
                </span>

                <div>
                    <h4>${escapeDashboardHTML(product.name)}</h4>

                    <p>
                        ${product.quantity} units sold
                    </p>
                </div>

            </div>

            <div class="list-product-value">
                ${product.quantity}
            </div>

        </div>

    `).join("");
}

// ==========================================
// LOW-STOCK PRODUCTS
// ==========================================

function displayLowStockProducts() {

    const container = dashboardElements.lowStockProducts;

    if (!container) {
        return;
    }

    const lowStock = dashboardProducts
        .filter(product => {

            const stock = Number(product.stock) || 0;

            const active = product.isActive !== false;

            return active && stock <= LOW_STOCK_LIMIT;
        })
        .sort((a, b) => {
            return Number(a.stock) - Number(b.stock);
        })
        .slice(0, 5);

    if (lowStock.length === 0) {

        container.innerHTML = `
            <p class="empty-text">
                All active products have sufficient stock.
            </p>
        `;

        return;
    }

    container.innerHTML = lowStock.map(product => {

        const stock = Number(product.stock) || 0;

        const stockClass =
            stock === 0 ? "stock-danger" : "stock-warning";

        return `

            <div class="dashboard-list-item">

                <div class="list-product-info">

                    <div>
                        <h4>${escapeDashboardHTML(product.name || "Unnamed Product")}</h4>

                        <p>Product stock level</p>
                    </div>

                </div>

                <span class="${stockClass}">
                    ${stock} left
                </span>

            </div>

        `;

    }).join("");
}

// ==========================================
// RECENT CUSTOMER REGISTRATIONS
// ==========================================

function displayRecentCustomers() {

    const container = dashboardElements.recentCustomers;

    if (!container) {
        return;
    }

    const recentCustomers = [...dashboardCustomers]
        .sort((a, b) => {

            const dateA = parseAdminDate(getCustomerDate(a));
            const dateB = parseAdminDate(getCustomerDate(b));

            return (dateB?.getTime() || 0) -
                   (dateA?.getTime() || 0);
        })
        .slice(0, 5);

    if (recentCustomers.length === 0) {

        container.innerHTML = `
            <tr>
                <td colspan="3">No customers registered yet.</td>
            </tr>
        `;

        return;
    }

    container.innerHTML = recentCustomers.map(customer => `

        <tr>

            <td>
                ${escapeDashboardHTML(customer.fullName || "Customer")}
            </td>

            <td>
                ${escapeDashboardHTML(customer.email || "Not available")}
            </td>

            <td>
                ${formatAdminDate(getCustomerDate(customer))}
            </td>

        </tr>

    `).join("");
}

// ==========================================
// RECENT ORDERS
// ==========================================

function displayRecentAdminOrders() {

    const container = dashboardElements.recentOrders;

    if (!container) {
        return;
    }

    const recentOrders = [...dashboardOrders]
        .sort((a, b) => {

            const dateA = parseAdminDate(getOrderDate(a));
            const dateB = parseAdminDate(getOrderDate(b));

            return (dateB?.getTime() || 0) -
                   (dateA?.getTime() || 0);
        })
        .slice(0, 5);

    if (recentOrders.length === 0) {

        container.innerHTML = `
            <tr>
                <td colspan="5">No orders available.</td>
            </tr>
        `;

        return;
    }

    container.innerHTML = recentOrders.map(order => `

        <tr>

            <td>
                ${escapeDashboardHTML(
                    order.orderId || order.documentId || "Order"
                )}
            </td>

            <td>
                ${escapeDashboardHTML(
                    order.fullName ||
                    order.customerName ||
                    "Customer"
                )}
            </td>

            <td>
                ${formatAdminPrice(order.total)}
            </td>

            <td>
                ${escapeDashboardHTML(
                    order.paymentMethod || "Not available"
                )}
            </td>

            <td>
                ${formatAdminDate(getOrderDate(order))}
            </td>

        </tr>

    `).join("");
}

// ==========================================
// HTML ESCAPING
// ==========================================

function escapeDashboardHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, character => {

        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

// ==========================================
// LOAD ADMIN DASHBOARD
// ==========================================

async function loadAdminDashboard() {

    try {

        if (dashboardElements.dashboardMessage) {
            dashboardElements.dashboardMessage.textContent =
                "Loading dashboard data...";
        }

        const customerId =
            sessionStorage.getItem("customerId");

        const token =
            sessionStorage.getItem("customerToken");

        if (!customerId || !token) {

            window.location.href = "../customer/login.html";
            return;
        }

        if (customerId !== ADMIN_DASHBOARD_UID) {

            alert("Access denied. Admin account required.");

            window.location.href = "../customer/login.html";
            return;
        }

        const [productDocuments, orderDocuments, customerDocuments] =
            await Promise.all([

                getAdminCollection("products", token),
                getAdminCollection("orders", token),
                getAdminCollection("customers", token)

            ]);

        dashboardProducts =
            productDocuments.map(convertAdminDocument);

        dashboardOrders =
            orderDocuments.map(document => {

                const order = convertAdminDocument(document);

                order.rawItems = getOrderItems(document.fields || {});

                return order;
            });

        dashboardCustomers =
            customerDocuments.map(convertAdminDocument);

        // Display all dashboard sections

        displayAdminStatistics();

        displaySalesChart();

        displayBestSellingProducts();

        displayLowStockProducts();

        displayRecentCustomers();

        displayRecentAdminOrders();

        if (dashboardElements.dashboardMessage) {
            dashboardElements.dashboardMessage.textContent = "";
        }

    }
    catch (error) {

        console.error("Dashboard loading error:", error);

        if (dashboardElements.dashboardMessage) {
            dashboardElements.dashboardMessage.textContent =
                "Unable to load dashboard data. Please check the console.";
        }
    }
}

// ==========================================
// LOGOUT
// ==========================================

function adminDashboardLogout() {

    sessionStorage.clear();

    window.location.href = "../customer/login.html";
}

// ==========================================
// INITIALIZE DASHBOARD
// ==========================================

loadAdminDashboard();
