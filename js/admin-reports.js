
// ==========================================
// VELORA ADMIN - ADVANCED REPORTS & ANALYTICS
// ==========================================

const ADMIN_REPORTS_UID = "XlBj1qfZsAeX5JEP9n24dMlsOXX2";

let reportProducts = [];
let reportOrders = [];
let reportCustomers = [];
let reportCategories = [];
let filteredOrders = [];

let reportStartDate = null;
let reportEndDate = null;


// ==========================================
// HTML ELEMENTS
// ==========================================

const reportElements = {
    revenue: document.getElementById("reportRevenue"),
    orders: document.getElementById("reportOrders"),
    averageOrderValue: document.getElementById("averageOrderValue"),
    unitsSold: document.getElementById("reportUnitsSold"),

    orderStatus: document.getElementById("orderStatusReport"),
    productPerformance: document.getElementById("productPerformanceReport"),
    customerPerformance: document.getElementById("customerPerformanceReport"),

    period: document.getElementById("reportPeriod"),
    startDate: document.getElementById("startDate"),
    endDate: document.getElementById("endDate"),

    applyDateFilter: document.getElementById("applyDateFilter"),
    refreshReports: document.getElementById("refreshReports"),
    exportButton: document.getElementById("exportReportButton"),

    filterMessage: document.getElementById("filterMessage"),
    reportMessage: document.getElementById("reportMessage"),

    customerReportCount: document.getElementById("customerReportCount"),
    cashCustomerRevenue: document.getElementById("cashCustomerRevenue"),
    creditCustomerRevenue: document.getElementById("creditCustomerRevenue"),

    allCustomers: document.getElementById("allCustomersReport"),
    cashPurchases: document.getElementById("cashPurchaseReport"),
    creditPurchases: document.getElementById("creditPurchaseReport"),

    inventoryProductCount: document.getElementById("inventoryProductCount"),
    inventoryTotalStock: document.getElementById("inventoryTotalStock"),
    highStockCount: document.getElementById("highStockCount"),
    lowStockCount: document.getElementById("lowStockCount"),

    inventoryCategoryFilter: document.getElementById("inventoryCategoryFilter"),
    allInventory: document.getElementById("allInventoryReport"),
    highStock: document.getElementById("highStockReport"),
    lowStock: document.getElementById("lowStockReport"),

    cashSalesRevenue: document.getElementById("cashSalesRevenue"),
    creditSalesRevenue: document.getElementById("creditSalesRevenue"),
    unpaidCreditOrders: document.getElementById("unpaidCreditOrders"),

    categorySales: document.getElementById("categorySalesReport"),
    topSellingProducts: document.getElementById("topSellingProductsReport"),
    bottomSellingProducts: document.getElementById("bottomSellingProductsReport")
};


// ==========================================
// FIRESTORE FIELD HELPERS
// ==========================================

function getReportField(fields, fieldName) {

    if (!fields || !fields[fieldName]) {
        return null;
    }

    const field = fields[fieldName];

    if (field.stringValue !== undefined) return field.stringValue;
    if (field.integerValue !== undefined) return Number(field.integerValue);
    if (field.doubleValue !== undefined) return Number(field.doubleValue);
    if (field.booleanValue !== undefined) return field.booleanValue;
    if (field.timestampValue !== undefined) return field.timestampValue;
    if (field.nullValue !== undefined) return null;

    if (field.mapValue) {
        return field.mapValue.fields || {};
    }

    if (field.arrayValue) {
        return (field.arrayValue.values || []).map(value => {
            return getReportValue(value);
        });
    }

    return null;
}


function getReportValue(field) {

    if (!field) return null;

    if (field.stringValue !== undefined) return field.stringValue;
    if (field.integerValue !== undefined) return Number(field.integerValue);
    if (field.doubleValue !== undefined) return Number(field.doubleValue);
    if (field.booleanValue !== undefined) return field.booleanValue;
    if (field.timestampValue !== undefined) return field.timestampValue;
    if (field.nullValue !== undefined) return null;

    if (field.mapValue) {
        return field.mapValue.fields || {};
    }

    if (field.arrayValue) {
        return (field.arrayValue.values || []).map(getReportValue);
    }

    return null;
}


function convertReportDocument(document) {

    const fields = document.fields || {};

    const documentId = document.name
        ? document.name.split("/").pop()
        : "";

    const converted = {
        documentId
    };

    Object.keys(fields).forEach(fieldName => {
        converted[fieldName] = getReportField(fields, fieldName);
    });

    return converted;
}


function getReportItemField(item, fieldName) {

    if (!item) return null;

    if (item.mapValue && item.mapValue.fields) {
        return getReportField(item.mapValue.fields, fieldName);
    }

    if (item.fields) {
        return getReportField(item.fields, fieldName);
    }

    return item[fieldName] ?? null;
}


function getReportOrderItems(order) {

    return Array.isArray(order.rawItems)
        ? order.rawItems
        : [];
}


// ==========================================
// GENERAL HELPERS
// ==========================================

function reportNumber(value) {

    const number = Number(value);

    return Number.isFinite(number) ? number : 0;
}


function formatReportPrice(value) {

    return "₹" + reportNumber(value).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}


function escapeReportHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];
    });
}


function getReportDate(value) {

    if (!value) return null;

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === "object") {

        if (value.timestampValue) {
            return getReportDate(value.timestampValue);
        }

        if (value.seconds !== undefined) {
            return new Date(Number(value.seconds) * 1000);
        }
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}


function getOrderReportDate(order) {

    return getReportDate(
        order.orderDate ||
        order.createdAt ||
        order.createdOn
    );
}


function getCustomerReportDate(customer) {

    return getReportDate(
        customer.createdAt ||
        customer.createdOn ||
        customer.registrationDate
    );
}


function formatReportDate(value) {

    const date = getReportDate(value);

    if (!date) return "N/A";

    return date.toLocaleDateString("en-IN");
}


function getOrderStatus(order) {

    return String(order.status || "Pending").trim();
}


function isCancelledReportOrder(order) {

    return getOrderStatus(order).toLowerCase() === "cancelled";
}


function isCreditOrder(order) {

    return String(order.paymentMethod || "").trim().toLowerCase()
        === "credit payment";
}


function getPaymentStatus(order) {

    if (!isCreditOrder(order)) {
        return "Not Applicable";
    }

    return order.paymentStatus || "Unpaid";
}


function getProductName(product) {

    return product.name ||
        product.title ||
        product.productName ||
        "Unnamed Product";
}


function getProductStock(product) {

    return reportNumber(
        product.stock ??
        product.quantity ??
        product.qty ??
        0
    );
}


function getProductPrice(product) {

    return reportNumber(
        product.price ??
        product.sellingPrice ??
        0
    );
}


function getProductCategoryId(product) {

    return String(
        product.categoryId ??
        product.catId ??
        ""
    );
}


function getProductCategoryName(product) {

    if (
        product.categoryName ||
        product.category
    ) {
        return String(
            product.categoryName ||
            product.category
        );
    }

    const categoryId = getProductCategoryId(product);

    const category = reportCategories.find(item =>
        item.documentId === categoryId
    );

    return category
        ? category.name || category.title || categoryId
        : categoryId || "Uncategorised";
}


function getCustomerName(customer) {

    return customer.fullName ||
        customer.name ||
        customer.customerName ||
        "Customer";
}


function getCustomerEmail(customer) {

    return customer.email || "N/A";
}


function getOrderCustomerName(order) {

    const customer = reportCustomers.find(item =>
        item.documentId === order.customerId
    );

    return order.fullName ||
        order.customerName ||
        (customer ? getCustomerName(customer) : "Customer");
}


function getOrderTotal(order) {

    return reportNumber(order.total);
}


function getItemQuantity(item) {

    return reportNumber(
        getReportItemField(item, "quantity") ||
        getReportItemField(item, "qty") ||
        0
    );
}


function getItemProductId(item) {

    return String(
        getReportItemField(item, "productId") ||
        getReportItemField(item, "id") ||
        ""
    );
}


function getItemProductName(item) {

    return (
        getReportItemField(item, "name") ||
        getReportItemField(item, "productName") ||
        getReportItemField(item, "title") ||
        "Unnamed Product"
    );
}


function getItemPrice(item, product) {

    const itemPrice =
        getReportItemField(item, "price") ??
        getReportItemField(item, "unitPrice");

    if (itemPrice !== null && itemPrice !== undefined) {
        return reportNumber(itemPrice);
    }

    return product ? getProductPrice(product) : 0;
}


function getProductById(productId) {

    return reportProducts.find(product =>
        product.documentId === String(productId)
    );
}


// ==========================================
// FIRESTORE COLLECTION FETCH
// ==========================================

async function getReportCollection(collectionName, token) {

    const url = `${FIRESTORE_BASE_URL}/${collectionName}`;

    let documents = [];
    let nextPageToken = null;

    do {

        const pageUrl = new URL(url);

        pageUrl.searchParams.set("pageSize", "300");

        if (nextPageToken) {
            pageUrl.searchParams.set("pageToken", nextPageToken);
        }

        const data = await firestoreRequest(
            pageUrl.toString(),
            { method: "GET" },
            token
        );

        documents = documents.concat(data.documents || []);

        nextPageToken = data.nextPageToken || null;

    } while (nextPageToken);

    return documents;
}


// ==========================================
// DATE FILTERS
// ==========================================

function setReportDateInputs(start, end) {

    if (reportElements.startDate) {
        reportElements.startDate.value = start
            ? start.toISOString().split("T")[0]
            : "";
    }

    if (reportElements.endDate) {
        reportElements.endDate.value = end
            ? end.toISOString().split("T")[0]
            : "";
    }
}


function applyQuickReportDateFilter() {

    const period = reportElements.period.value;

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    if (period === "all") {

        reportStartDate = null;
        reportEndDate = null;

        setReportDateInputs(null, null);

    } else if (period === "custom") {

        return;

    } else {

        const start = new Date(today);

        if (period === "today") {
            // Today only
        } else if (period === "7days") {
            start.setDate(start.getDate() - 6);
        } else {
            start.setDate(start.getDate() - 29);
        }

        reportStartDate = start;

        const end = new Date(today);
        end.setHours(23, 59, 59, 999);

        reportEndDate = end;

        setReportDateInputs(start, end);
    }

    applyReportDateFilter();
}


function applyReportDateFilter() {

    if (
        reportStartDate &&
        reportEndDate &&
        reportStartDate > reportEndDate
    ) {
        reportElements.filterMessage.textContent =
            "Start date cannot be after end date.";

        return;
    }

    filteredOrders = reportOrders.filter(order => {

        const orderDate = getOrderReportDate(order);

        if (!orderDate) return false;

        if (reportStartDate && orderDate < reportStartDate) {
            return false;
        }

        if (reportEndDate && orderDate > reportEndDate) {
            return false;
        }

        return true;
    });

    reportElements.filterMessage.textContent =
        reportStartDate && reportEndDate
            ? `Showing reports from ${formatReportDate(reportStartDate)} to ${formatReportDate(reportEndDate)}.`
            : "Showing reports for all available dates.";

    displayAllReports();
}


function applyCustomReportDateFilter() {

    const startValue = reportElements.startDate.value;
    const endValue = reportElements.endDate.value;

    if (!startValue || !endValue) {

        reportElements.filterMessage.textContent =
            "Please select both start date and end date.";

        return;
    }

    reportStartDate = new Date(startValue + "T00:00:00");
    reportEndDate = new Date(endValue + "T23:59:59.999");

    if (reportStartDate > reportEndDate) {

        reportElements.filterMessage.textContent =
            "Start date cannot be after end date.";

        return;
    }

    reportElements.period.value = "custom";

    applyReportDateFilter();
}


// ==========================================
// SALES SUMMARY
// ==========================================

function displayReportSummary() {

    const validOrders = filteredOrders.filter(order =>
        !isCancelledReportOrder(order)
    );

    const revenue = validOrders.reduce((sum, order) => {
        return sum + getOrderTotal(order);
    }, 0);

    const unitsSold = validOrders.reduce((sum, order) => {

        const itemQuantity = getReportOrderItems(order).reduce(
            (itemSum, item) => itemSum + getItemQuantity(item),
            0
        );

        return sum + itemQuantity;

    }, 0);

    const average = validOrders.length
        ? revenue / validOrders.length
        : 0;

    reportElements.revenue.textContent = formatReportPrice(revenue);

    // Total orders includes cancelled orders.
    reportElements.orders.textContent = filteredOrders.length;

    reportElements.averageOrderValue.textContent =
        formatReportPrice(average);

    reportElements.unitsSold.textContent = unitsSold;
}


// ==========================================
// ORDER STATUS REPORT
// ==========================================

function displayOrderStatusReport() {

    const statuses = {};

    filteredOrders.forEach(order => {

        const status = getOrderStatus(order);

        statuses[status] = (statuses[status] || 0) + 1;

    });

    const total = filteredOrders.length;

    if (!total) {

        reportElements.orderStatus.innerHTML =
            `<tr><td colspan="3">No orders found.</td></tr>`;

        return;
    }

    reportElements.orderStatus.innerHTML =
        Object.entries(statuses).map(([status, count]) => {

            const percentage = (count / total) * 100;

            return `
                <tr>
                    <td>${escapeReportHTML(status)}</td>
                    <td>${count}</td>
                    <td>${percentage.toFixed(2)}%</td>
                </tr>
            `;

        }).join("");
}


// ==========================================
// PRODUCT SALES AGGREGATION
// ==========================================

function getProductSalesSummary() {

    const productMap = new Map();

    reportProducts.forEach(product => {

        productMap.set(product.documentId, {
            productId: product.documentId,
            name: getProductName(product),
            category: getProductCategoryName(product),
            units: 0,
            sales: 0
        });

    });

    filteredOrders
        .filter(order => !isCancelledReportOrder(order))
        .forEach(order => {

            getReportOrderItems(order).forEach(item => {

                const productId = getItemProductId(item);
                const product = getProductById(productId);

                const name = product
                    ? getProductName(product)
                    : getItemProductName(item);

                const key = productId || name;

                if (!productMap.has(key)) {

                    productMap.set(key, {
                        productId: key,
                        name,
                        category: product
                            ? getProductCategoryName(product)
                            : "Uncategorised",
                        units: 0,
                        sales: 0
                    });
                }

                const summary = productMap.get(key);

                const quantity = getItemQuantity(item);
                const price = getItemPrice(item, product);

                summary.units += quantity;
                summary.sales += quantity * price;

            });

        });

    return Array.from(productMap.values());
}


// ==========================================
// BEST-SELLING PRODUCTS
// ==========================================

function displayProductPerformanceReport() {

    const products = getProductSalesSummary()
        .filter(product => product.units > 0)
        .sort((a, b) => b.units - a.units);

    const topProducts = products.slice(0, 10);

    if (!topProducts.length) {

        reportElements.productPerformance.innerHTML =
            `<tr><td colspan="4">No product sales found.</td></tr>`;

        return;
    }

    reportElements.productPerformance.innerHTML =
        topProducts.map((product, index) => {

            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${escapeReportHTML(product.name)}</td>
                    <td>${product.units}</td>
                    <td>${formatReportPrice(product.sales)}</td>
                </tr>
            `;

        }).join("");
}


// ==========================================
// CUSTOMER PERFORMANCE
// ==========================================

function getCustomerSalesSummary() {

    const customerMap = new Map();

    filteredOrders
        .filter(order => !isCancelledReportOrder(order))
        .forEach(order => {

            const customerId = order.customerId || "unknown";

            if (!customerMap.has(customerId)) {

                const customer = reportCustomers.find(item =>
                    item.documentId === customerId
                );

                customerMap.set(customerId, {
                    customerId,
                    name: getOrderCustomerName(order),
                    email: order.email ||
                        (customer ? getCustomerEmail(customer) : "N/A"),
                    orders: 0,
                    spending: 0
                });
            }

            const customer = customerMap.get(customerId);

            customer.orders += 1;
            customer.spending += getOrderTotal(order);

        });

    return Array.from(customerMap.values());
}


function displayCustomerPerformanceReport() {

    const customers = getCustomerSalesSummary()
        .sort((a, b) => b.spending - a.spending)
        .slice(0, 10);

    if (!customers.length) {

        reportElements.customerPerformance.innerHTML =
            `<tr><td colspan="4">No customer purchases found.</td></tr>`;

        return;
    }

    reportElements.customerPerformance.innerHTML =
        customers.map(customer => {

            return `
                <tr>
                    <td>${escapeReportHTML(customer.name)}</td>
                    <td>${escapeReportHTML(customer.email)}</td>
                    <td>${customer.orders}</td>
                    <td>${formatReportPrice(customer.spending)}</td>
                </tr>
            `;

        }).join("");
}


// ==========================================
// CUSTOMER REPORTS
// ==========================================

function displayAllCustomersReport() {

    const customers = [...reportCustomers].sort((a, b) => {
        return getCustomerName(a).localeCompare(getCustomerName(b));
    });

    reportElements.customerReportCount.textContent = customers.length;

    if (!customers.length) {

        reportElements.allCustomers.innerHTML =
            `<tr><td colspan="5">No customers found.</td></tr>`;

        return;
    }

    reportElements.allCustomers.innerHTML =
        customers.map(customer => {

            return `
                <tr>
                    <td>${escapeReportHTML(customer.documentId)}</td>
                    <td>${escapeReportHTML(getCustomerName(customer))}</td>
                    <td>${escapeReportHTML(getCustomerEmail(customer))}</td>
                    <td>${formatReportPrice(customer.creditLimit || 0)}</td>
                    <td>${formatReportDate(getCustomerReportDate(customer))}</td>
                </tr>
            `;

        }).join("");
}


function displayCustomerPurchaseReports() {

    const validOrders = filteredOrders.filter(order =>
        !isCancelledReportOrder(order)
    );

    const cashOrders = validOrders.filter(order =>
        !isCreditOrder(order)
    );

    const creditOrders = validOrders.filter(order =>
        isCreditOrder(order)
    );

    const cashRevenue = cashOrders.reduce((sum, order) => {
        return sum + getOrderTotal(order);
    }, 0);

    const creditRevenue = creditOrders.reduce((sum, order) => {
        return sum + getOrderTotal(order);
    }, 0);

    reportElements.cashCustomerRevenue.textContent =
        formatReportPrice(cashRevenue);

    reportElements.creditCustomerRevenue.textContent =
        formatReportPrice(creditRevenue);


    if (!cashOrders.length) {

        reportElements.cashPurchases.innerHTML =
            `<tr><td colspan="5">No cash purchases found.</td></tr>`;

    } else {

        reportElements.cashPurchases.innerHTML =
            cashOrders.map(order => {

                return `
                    <tr>
                        <td>${escapeReportHTML(order.documentId)}</td>
                        <td>${escapeReportHTML(getOrderCustomerName(order))}</td>
                        <td>${formatReportDate(getOrderReportDate(order))}</td>
                        <td>${escapeReportHTML(order.paymentMethod || "N/A")}</td>
                        <td>${formatReportPrice(getOrderTotal(order))}</td>
                    </tr>
                `;

            }).join("");
    }


    if (!creditOrders.length) {

        reportElements.creditPurchases.innerHTML =
            `<tr><td colspan="5">No credit purchases found.</td></tr>`;

    } else {

        reportElements.creditPurchases.innerHTML =
            creditOrders.map(order => {

                return `
                    <tr>
                        <td>${escapeReportHTML(order.documentId)}</td>
                        <td>${escapeReportHTML(getOrderCustomerName(order))}</td>
                        <td>${formatReportDate(getOrderReportDate(order))}</td>
                        <td>${escapeReportHTML(getPaymentStatus(order))}</td>
                        <td>${formatReportPrice(getOrderTotal(order))}</td>
                    </tr>
                `;

            }).join("");
    }
}


// ==========================================
// INVENTORY CATEGORY DROPDOWN
// ==========================================

function populateInventoryCategoryFilter() {

    const currentValue = reportElements.inventoryCategoryFilter.value;

    const categories = new Map();

    reportProducts.forEach(product => {

        const id = getProductCategoryId(product);
        const name = getProductCategoryName(product);

        if (id || name !== "Uncategorised") {
            categories.set(id || name, name);
        }

    });

    reportElements.inventoryCategoryFilter.innerHTML =
        `<option value="all">All Categories</option>` +
        Array.from(categories.entries()).map(([id, name]) => {

            return `
                <option value="${escapeReportHTML(id)}">
                    ${escapeReportHTML(name)}
                </option>
            `;

        }).join("");

    if (
        Array.from(reportElements.inventoryCategoryFilter.options)
            .some(option => option.value === currentValue)
    ) {
        reportElements.inventoryCategoryFilter.value = currentValue;
    }
}


// ==========================================
// INVENTORY REPORTS
// ==========================================

function displayInventoryReports() {

    const selectedCategory =
        reportElements.inventoryCategoryFilter.value;

    const allProducts = reportProducts;

    const filteredProducts = selectedCategory === "all"
        ? allProducts
        : allProducts.filter(product => {

            return getProductCategoryId(product) === selectedCategory ||
                getProductCategoryName(product) === selectedCategory;

        });

    const totalStock = allProducts.reduce((sum, product) => {
        return sum + getProductStock(product);
    }, 0);

    const highStockProducts = allProducts.filter(product =>
        getProductStock(product) > 100
    );

    const lowStockProducts = allProducts.filter(product =>
        getProductStock(product) < 15
    );

    reportElements.inventoryProductCount.textContent =
        allProducts.length;

    reportElements.inventoryTotalStock.textContent =
        totalStock.toLocaleString("en-IN");

    reportElements.highStockCount.textContent =
        highStockProducts.length;

    reportElements.lowStockCount.textContent =
        lowStockProducts.length;


    if (!filteredProducts.length) {

        reportElements.allInventory.innerHTML =
            `<tr><td colspan="6">No inventory products found.</td></tr>`;

    } else {

        reportElements.allInventory.innerHTML =
            filteredProducts.map(product => {

                const stock = getProductStock(product);
                const price = getProductPrice(product);

                return `
                    <tr>
                        <td>${escapeReportHTML(product.documentId)}</td>
                        <td>${escapeReportHTML(getProductName(product))}</td>
                        <td>${escapeReportHTML(getProductCategoryName(product))}</td>
                        <td>${stock}</td>
                        <td>${formatReportPrice(price)}</td>
                        <td>${formatReportPrice(stock * price)}</td>
                    </tr>
                `;

            }).join("");
    }


    const filteredHighStock = highStockProducts.filter(product => {

        return selectedCategory === "all" ||
            getProductCategoryId(product) === selectedCategory ||
            getProductCategoryName(product) === selectedCategory;

    });

    const filteredLowStock = lowStockProducts.filter(product => {

        return selectedCategory === "all" ||
            getProductCategoryId(product) === selectedCategory ||
            getProductCategoryName(product) === selectedCategory;

    });


    reportElements.highStock.innerHTML = filteredHighStock.length
        ? filteredHighStock.map(product => `
            <tr>
                <td>${escapeReportHTML(getProductName(product))}</td>
                <td>${escapeReportHTML(getProductCategoryName(product))}</td>
                <td>${getProductStock(product)}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="3">No high stock products found.</td></tr>`;


    reportElements.lowStock.innerHTML = filteredLowStock.length
        ? filteredLowStock.map(product => `
            <tr>
                <td>${escapeReportHTML(getProductName(product))}</td>
                <td>${escapeReportHTML(getProductCategoryName(product))}</td>
                <td>${getProductStock(product)}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="3">No low stock products found.</td></tr>`;
}


// ==========================================
// SALES REPORTS
// ==========================================

function displaySalesReports() {

    const validOrders = filteredOrders.filter(order =>
        !isCancelledReportOrder(order)
    );

    const cashOrders = validOrders.filter(order =>
        !isCreditOrder(order)
    );

    const creditOrders = validOrders.filter(order =>
        isCreditOrder(order)
    );

    const cashRevenue = cashOrders.reduce((sum, order) => {
        return sum + getOrderTotal(order);
    }, 0);

    const creditRevenue = creditOrders.reduce((sum, order) => {
        return sum + getOrderTotal(order);
    }, 0);

    const unpaidCreditCount = creditOrders.filter(order => {
        return getPaymentStatus(order).toLowerCase() !== "paid";
    }).length;

    reportElements.cashSalesRevenue.textContent =
        formatReportPrice(cashRevenue);

    reportElements.creditSalesRevenue.textContent =
        formatReportPrice(creditRevenue);

    reportElements.unpaidCreditOrders.textContent =
        unpaidCreditCount;


    // CATEGORY-WISE SALES

    const categoryMap = new Map();

    validOrders.forEach(order => {

        getReportOrderItems(order).forEach(item => {

            const product = getProductById(getItemProductId(item));

            const category = product
                ? getProductCategoryName(product)
                : "Uncategorised";

            if (!categoryMap.has(category)) {

                categoryMap.set(category, {
                    category,
                    units: 0,
                    sales: 0
                });
            }

            const summary = categoryMap.get(category);

            const quantity = getItemQuantity(item);
            const price = getItemPrice(item, product);

            summary.units += quantity;
            summary.sales += quantity * price;

        });

    });

    const categories = Array.from(categoryMap.values())
        .sort((a, b) => b.sales - a.sales);

    reportElements.categorySales.innerHTML = categories.length
        ? categories.map(category => `
            <tr>
                <td>${escapeReportHTML(category.category)}</td>
                <td>${category.units}</td>
                <td>${formatReportPrice(category.sales)}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="3">No category sales found.</td></tr>`;


    // TOP AND BOTTOM 10 PRODUCTS

    const productSales = getProductSalesSummary();

    const topProducts = productSales
        .filter(product => product.units > 0)
        .sort((a, b) => b.units - a.units)
        .slice(0, 10);

    const bottomProducts = productSales
        .sort((a, b) => a.units - b.units)
        .slice(0, 10);


    reportElements.topSellingProducts.innerHTML = topProducts.length
        ? topProducts.map((product, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeReportHTML(product.name)}</td>
                <td>${product.units}</td>
                <td>${formatReportPrice(product.sales)}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="4">No selling products found.</td></tr>`;


    reportElements.bottomSellingProducts.innerHTML = bottomProducts.length
        ? bottomProducts.map((product, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeReportHTML(product.name)}</td>
                <td>${product.units}</td>
                <td>${formatReportPrice(product.sales)}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="4">No product records found.</td></tr>`;
}


// ==========================================
// DISPLAY ALL REPORTS
// ==========================================

function displayAllReports() {

    displayReportSummary();

    displayOrderStatusReport();

    displayProductPerformanceReport();

    displayCustomerPerformanceReport();

    displayAllCustomersReport();

    displayCustomerPurchaseReports();

    displayInventoryReports();

    displaySalesReports();
}


// ==========================================
// CSV EXPORT
// ==========================================

function csvEscape(value) {

    let text = String(value ?? "");

    // Prevent spreadsheet formula execution.
    if (/^[=+\-@]/.test(text)) {
        text = "'" + text;
    }

    return `"${text.replace(/"/g, '""')}"`;
}


function downloadReportCSV(filename, rows) {

    const csvContent = rows.map(row => {
        return row.map(csvEscape).join(",");
    }).join("\n");

    const blob = new Blob(
        ["\uFEFF" + csvContent],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
}


function exportReportCSV() {

    const rows = [];

    rows.push(["VELORA - ADVANCED REPORTS"]);
    rows.push(["Generated On", new Date().toLocaleString("en-IN")]);

    rows.push([
        "Report Period",
        reportStartDate && reportEndDate
            ? `${formatReportDate(reportStartDate)} to ${formatReportDate(reportEndDate)}`
            : "All Time"
    ]);

    rows.push([]);

    // SALES SUMMARY

    rows.push(["SALES SUMMARY"]);
    rows.push(["Total Revenue", reportElements.revenue.textContent]);
    rows.push(["Total Orders", reportElements.orders.textContent]);
    rows.push(["Average Order Value", reportElements.averageOrderValue.textContent]);
    rows.push(["Units Sold", reportElements.unitsSold.textContent]);

    rows.push([]);

    // ORDER STATUS

    rows.push(["ORDER STATUS REPORT"]);
    rows.push(["Status", "Number of Orders", "Percentage"]);

    filteredOrders.reduce((map, order) => {

        const status = getOrderStatus(order);

        map[status] = (map[status] || 0) + 1;

        return map;

    }, {});

    const statusMap = {};

    filteredOrders.forEach(order => {
        const status = getOrderStatus(order);
        statusMap[status] = (statusMap[status] || 0) + 1;
    });

    Object.entries(statusMap).forEach(([status, count]) => {
        rows.push([
            status,
            count,
            filteredOrders.length
                ? ((count / filteredOrders.length) * 100).toFixed(2) + "%"
                : "0%"
        ]);
    });

    rows.push([]);

    // CUSTOMER REPORT

    rows.push(["ALL CUSTOMERS"]);
    rows.push([
        "Customer ID",
        "Name",
        "Email",
        "Credit Limit",
        "Registration Date"
    ]);

    reportCustomers.forEach(customer => {
        rows.push([
            customer.documentId,
            getCustomerName(customer),
            getCustomerEmail(customer),
            customer.creditLimit || 0,
            formatReportDate(getCustomerReportDate(customer))
        ]);
    });

    rows.push([]);

    // PURCHASE REPORT

    rows.push(["PURCHASE REPORT"]);
    rows.push([
        "Order ID",
        "Customer",
        "Date",
        "Payment Method",
        "Payment Status",
        "Order Status",
        "Amount"
    ]);

    filteredOrders.forEach(order => {
        rows.push([
            order.documentId,
            getOrderCustomerName(order),
            formatReportDate(getOrderReportDate(order)),
            order.paymentMethod || "N/A",
            getPaymentStatus(order),
            getOrderStatus(order),
            getOrderTotal(order)
        ]);
    });

    rows.push([]);

    // INVENTORY REPORT

    rows.push(["CURRENT INVENTORY"]);
    rows.push([
        "Product ID",
        "Product Name",
        "Category",
        "Stock",
        "Unit Price",
        "Stock Value"
    ]);

    reportProducts.forEach(product => {

        const stock = getProductStock(product);
        const price = getProductPrice(product);

        rows.push([
            product.documentId,
            getProductName(product),
            getProductCategoryName(product),
            stock,
            price,
            stock * price
        ]);

    });

    rows.push([]);

    // PRODUCT SALES

    rows.push(["PRODUCT SALES REPORT"]);
    rows.push([
        "Product",
        "Category",
        "Units Sold",
        "Sales Value"
    ]);

    getProductSalesSummary().forEach(product => {
        rows.push([
            product.name,
            product.category,
            product.units,
            product.sales
        ]);
    });

    rows.push([]);

    // CATEGORY SALES

    rows.push(["CATEGORY SALES REPORT"]);
    rows.push([
        "Category",
        "Units Sold",
        "Sales Value"
    ]);

    const categoryTotals = {};

    filteredOrders
        .filter(order => !isCancelledReportOrder(order))
        .forEach(order => {

            getReportOrderItems(order).forEach(item => {

                const product = getProductById(getItemProductId(item));

                const category = product
                    ? getProductCategoryName(product)
                    : "Uncategorised";

                if (!categoryTotals[category]) {
                    categoryTotals[category] = {
                        units: 0,
                        sales: 0
                    };
                }

                const quantity = getItemQuantity(item);

                categoryTotals[category].units += quantity;

                categoryTotals[category].sales +=
                    quantity * getItemPrice(item, product);

            });

        });

    Object.entries(categoryTotals).forEach(([category, values]) => {
        rows.push([
            category,
            values.units,
            values.sales
        ]);
    });

    downloadReportCSV(
        "VELORA_Advanced_Reports.csv",
        rows
    );

    reportElements.reportMessage.textContent =
        "Report CSV downloaded successfully.";
}


// ==========================================
// LOAD REPORT DATA
// ==========================================

async function loadReportData() {

    try {

        reportElements.reportMessage.textContent =
            "Loading reports from Firebase...";

        const customerId = sessionStorage.getItem("customerId");
        const token = sessionStorage.getItem("customerToken");

        if (!customerId || customerId !== ADMIN_REPORTS_UID) {

            window.location.replace("../customer/login.html");

            return;
        }

        if (!token) {
            throw new Error("Your session has expired. Please log in again.");
        }

        const [
            productDocuments,
            orderDocuments,
            customerDocuments,
            categoryDocuments
        ] = await Promise.all([

            getReportCollection("products", token),
            getReportCollection("orders", token),
            getReportCollection("customers", token),
            getReportCollection("categories", token)

        ]);

        reportProducts = productDocuments.map(convertReportDocument);

        reportOrders = orderDocuments.map(document => {

            const order = convertReportDocument(document);

            order.rawItems =
                document.fields?.items?.arrayValue?.values || [];

            return order;

        });

        reportCustomers = customerDocuments.map(convertReportDocument);

        reportCategories = categoryDocuments.map(convertReportDocument);

        populateInventoryCategoryFilter();

        reportElements.period.value = "30days";

        applyQuickReportDateFilter();

        reportElements.reportMessage.textContent =
            "All reports loaded successfully.";

    } catch (error) {

        console.error("VELORA Reports Error:", error);

        reportElements.reportMessage.textContent =
            error.message || "Unable to load reports.";

    }
}


// ==========================================
// EVENT LISTENERS
// ==========================================

if (reportElements.period) {

    reportElements.period.addEventListener("change", () => {

        if (reportElements.period.value === "custom") {
            reportElements.filterMessage.textContent =
                "Select a start date and end date, then click Apply Filter.";
            return;
        }

        applyQuickReportDateFilter();

    });

}


if (reportElements.applyDateFilter) {

    reportElements.applyDateFilter.addEventListener("click", () => {

        applyCustomReportDateFilter();

    });

}


if (reportElements.refreshReports) {

    reportElements.refreshReports.addEventListener("click", () => {

        loadReportData();

    });

}


if (reportElements.exportButton) {

    reportElements.exportButton.addEventListener("click", () => {

        exportReportCSV();

    });

}


if (reportElements.inventoryCategoryFilter) {

    reportElements.inventoryCategoryFilter.addEventListener("change", () => {

        displayInventoryReports();

    });

}


// ==========================================
// INITIALIZE REPORTS
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    loadReportData();

});
