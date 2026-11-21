
// ==========================================
// VELORA ADMIN - PRODUCT MANAGEMENT
// FIRESTORE + JQUERY AJAX + PAGINATION
// ==========================================

const ADMIN_PRODUCTS_UID = "XlBj1qfZsAeX5JEP9n24dMlsOXX2";

const PRODUCTS_PER_PAGE = 10;

let adminProducts = [];
let adminCategories = [];
let currentProductPage = 1;


// ==========================================
// HTML ELEMENTS
// ==========================================

const productElements = {

    list: document.getElementById("adminProductList"),
    pagination: document.getElementById("productPagination"),
    message: document.getElementById("productMessage"),

    total: document.getElementById("productTotal"),
    active: document.getElementById("activeProductTotal"),
    out: document.getElementById("outOfStockTotal"),
    low: document.getElementById("lowStockTotal"),

    search: document.getElementById("productSearch"),
    categoryFilter: document.getElementById("productCategoryFilter"),
    statusFilter: document.getElementById("productStatusFilter"),

    formSection: document.getElementById("productFormSection"),
    form: document.getElementById("productForm"),
    formTitle: document.getElementById("formTitle"),

    editingId: document.getElementById("editingProductId"),
    name: document.getElementById("productName"),
    category: document.getElementById("productCategory"),
    price: document.getElementById("productPrice"),
    stock: document.getElementById("productStock"),
    image: document.getElementById("productImage"),
    description: document.getElementById("productDescription"),
    activeCheckbox: document.getElementById("productActive"),

    saveButton: document.getElementById("saveProductButton")
};


// ==========================================
// ADMIN AUTHENTICATION
// ==========================================

function checkAdminAccess() {

    const customerId = sessionStorage.getItem("customerId");
    const token = sessionStorage.getItem("customerToken");

    if (!customerId || !token) {

        window.location.href = "../customer/login.html";
        return false;
    }

    if (customerId !== ADMIN_PRODUCTS_UID) {

        document.body.innerHTML = `
            <div style="padding:40px;text-align:center;">
                <h2>Access Denied</h2>
                <p>Administrator login is required.</p>
                <a href="../customer/login.html">Go to Login</a>
            </div>
        `;

        return false;
    }

    return true;
}


// ==========================================
// FIRESTORE FIELD HELPER
// ==========================================

function getProductField(fields, fieldName) {

    const field = fields?.[fieldName];

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

    return "";
}


// ==========================================
// GET PRODUCT DETAILS
// ==========================================

function getProductDetails(document) {

    const fields = document.fields || {};

    return {

        id: document.name.split("/").pop(),

        name: getProductField(fields, "name"),

        description: getProductField(fields, "description"),

        price: Number(getProductField(fields, "price") || 0),

        categoryId: getProductField(fields, "categoryId"),

        categoryName: getProductField(fields, "categoryName"),

        image: getProductField(fields, "image"),

        stock: Number(getProductField(fields, "stock") || 0),

        isActive: getProductField(fields, "isActive") !== false
    };
}


// ==========================================
// GET CATEGORY DETAILS
// ==========================================

function getCategoryDetails(document) {

    const fields = document.fields || {};

    return {

        id: document.name.split("/").pop(),

        name:
            getProductField(fields, "name") ||
            getProductField(fields, "categoryName") ||
            ""
    };
}


// ==========================================
// GET CATEGORY NAME BY ID
// ==========================================

function getCategoryName(categoryId) {

    const category = adminCategories.find(
        item => item.id === categoryId
    );

    return category ? category.name : "";
}


// ==========================================
// FIRESTORE AJAX REQUEST
// ==========================================

function firestoreAjax(url) {

    const token = sessionStorage.getItem("customerToken");

    return $.ajax({

        url: url,

        method: "GET",

        dataType: "json",

        headers: {

            "Authorization": "Bearer " + token

        }

    });
}


// ==========================================
// LOAD PRODUCTS AND CATEGORIES USING AJAX
// ==========================================

async function loadAdminProducts() {

    if (!checkAdminAccess()) return;

    if (typeof jQuery === "undefined") {

        productElements.message.textContent =
            "jQuery failed to load. Check your internet connection.";

        return;
    }

    try {

        productElements.message.textContent =
            "Loading products and categories using AJAX...";

        productElements.list.innerHTML = `
            <tr>
                <td colspan="6" class="loading-cell">
                    Loading products...
                </td>
            </tr>
        `;

        productElements.pagination.innerHTML = "";

        const productsUrl =
            `${FIRESTORE_BASE_URL}/products`;

        const categoriesUrl =
            `${FIRESTORE_BASE_URL}/categories`;


        // JQUERY AJAX - ASYNCHRONOUS FIRESTORE REQUESTS
        const results = await Promise.all([

            firestoreAjax(productsUrl),

            firestoreAjax(categoriesUrl)

        ]);

        const productData = results[0];

        const categoryData = results[1];


        // PROCESS PRODUCTS
        adminProducts = (productData.documents || []).map(
            getProductDetails
        );


        // PROCESS CATEGORIES
        adminCategories = (categoryData.documents || [])
            .map(getCategoryDetails)
            .filter(category => category.id && category.name)
            .sort((a, b) => a.name.localeCompare(b.name));


        // UPDATE PAGE
        updateProductStatistics();

        populateCategoryDropdown();

        populateCategoryFilter();

        displayAdminProducts();


        productElements.message.textContent =
            `${adminProducts.length} products and ${adminCategories.length} categories loaded successfully using jQuery AJAX.`;


        console.log("Products loaded using jQuery AJAX.");

    } catch (error) {

        console.error("Product loading error:", error);

        const errorMessage =
            error.responseJSON?.error?.message ||
            error.statusText ||
            error.message ||
            "Unknown error";

        productElements.message.textContent =
            "Unable to load products: " + errorMessage;

        productElements.list.innerHTML = `
            <tr>
                <td colspan="6" class="loading-cell">
                    Unable to load products.
                </td>
            </tr>
        `;

        productElements.pagination.innerHTML = "";
    }
}


// ==========================================
// PRODUCT STATISTICS
// ==========================================

function updateProductStatistics() {

    productElements.total.textContent =
        adminProducts.length;

    productElements.active.textContent =
        adminProducts.filter(p => p.isActive).length;

    productElements.out.textContent =
        adminProducts.filter(p => p.stock === 0).length;

    productElements.low.textContent =
        adminProducts.filter(
            p => p.stock > 0 && p.stock <= 5
        ).length;
}


// ==========================================
// POPULATE PRODUCT FORM CATEGORY DROPDOWN
// ==========================================

function populateCategoryDropdown() {

    const selectedCategory = productElements.category.value;

    productElements.category.innerHTML = `
        <option value="">Select Category</option>
    `;

    adminCategories.forEach(category => {

        const option = document.createElement("option");

        option.value = category.id;
        option.textContent = category.name;

        productElements.category.appendChild(option);
    });

    if (
        selectedCategory &&
        adminCategories.some(category => category.id === selectedCategory)
    ) {

        productElements.category.value = selectedCategory;
    }
}


// ==========================================
// POPULATE CATEGORY FILTER
// ==========================================

function populateCategoryFilter() {

    const selectedCategory = productElements.categoryFilter.value;

    const categoryMap = new Map();

    adminCategories.forEach(category => {

        categoryMap.set(category.id, category.name);

    });

    adminProducts.forEach(product => {

        if (
            product.categoryId &&
            product.categoryName &&
            !categoryMap.has(product.categoryId)
        ) {

            categoryMap.set(
                product.categoryId,
                product.categoryName
            );
        }
    });

    productElements.categoryFilter.innerHTML = `
        <option value="">All Categories</option>
    `;

    [...categoryMap.entries()]
        .sort((a, b) => a[1].localeCompare(b[1]))
        .forEach(([categoryId, categoryName]) => {

            const option = document.createElement("option");

            option.value = categoryId;
            option.textContent = categoryName;

            productElements.categoryFilter.appendChild(option);
        });

    if (categoryMap.has(selectedCategory)) {

        productElements.categoryFilter.value = selectedCategory;
    }
}


// ==========================================
// GET FILTERED PRODUCTS
// ==========================================

function getFilteredAdminProducts() {

    const searchText =
        productElements.search.value.trim().toLowerCase();

    const selectedCategory =
        productElements.categoryFilter.value;

    const selectedStatus =
        productElements.statusFilter.value;

    return adminProducts.filter(function (product) {

        const matchesSearch =
            product.name.toLowerCase().includes(searchText) ||
            product.description.toLowerCase().includes(searchText);

        const matchesCategory =
            !selectedCategory ||
            product.categoryId === selectedCategory;

        let matchesStatus = true;

        if (selectedStatus === "active") {
            matchesStatus = product.isActive;
        }

        if (selectedStatus === "inactive") {
            matchesStatus = !product.isActive;
        }

        if (selectedStatus === "out") {
            matchesStatus = product.stock === 0;
        }

        return matchesSearch && matchesCategory && matchesStatus;
    });
}


// ==========================================
// DISPLAY PRODUCTS WITH PAGINATION
// ==========================================

function displayAdminProducts() {

    productElements.list.innerHTML = "";

    const filteredProducts = getFilteredAdminProducts();

    const totalProducts = filteredProducts.length;

    const totalPages = Math.ceil(
        totalProducts / PRODUCTS_PER_PAGE
    );

    if (totalPages === 0) {

        currentProductPage = 1;

    } else if (currentProductPage > totalPages) {

        currentProductPage = totalPages;
    }

    if (totalProducts === 0) {

        productElements.list.innerHTML = `
            <tr>
                <td colspan="6" class="loading-cell">
                    No matching products found.
                </td>
            </tr>
        `;

        productElements.pagination.innerHTML = "";

        return;
    }

    const startIndex =
        (currentProductPage - 1) * PRODUCTS_PER_PAGE;

    const endIndex = Math.min(
        startIndex + PRODUCTS_PER_PAGE,
        totalProducts
    );

    const currentProducts = filteredProducts.slice(
        startIndex,
        endIndex
    );


    currentProducts.forEach(function (product) {

        const row = document.createElement("tr");


        // PRODUCT IMAGE AND NAME
        const productCell = document.createElement("td");

        const productInfo = document.createElement("div");
        productInfo.className = "product-info";

        const image = document.createElement("img");

        image.src = product.image || "";
        image.alt = product.name;

        image.onerror = function () {
            this.style.visibility = "hidden";
        };

        const name = document.createElement("strong");
        name.textContent = product.name;

        productInfo.appendChild(image);
        productInfo.appendChild(name);

        productCell.appendChild(productInfo);


        // CATEGORY
        const categoryCell = document.createElement("td");

        categoryCell.textContent =
            getCategoryName(product.categoryId) ||
            product.categoryName ||
            "Uncategorised";


        // PRICE
        const priceCell = document.createElement("td");

        priceCell.textContent =
            "₹" + product.price.toLocaleString("en-IN");


        // STOCK
        const stockCell = document.createElement("td");

        stockCell.textContent = product.stock;


        // STATUS
        const statusCell = document.createElement("td");

        const status = document.createElement("span");

        status.className = "status";

        if (product.stock === 0) {

            status.classList.add("out");
            status.textContent = "Out of Stock";

        } else if (product.isActive) {

            status.classList.add("active");
            status.textContent = "Active";

        } else {

            status.classList.add("inactive");
            status.textContent = "Inactive";
        }

        statusCell.appendChild(status);


        // ACTION BUTTONS
        const actionCell = document.createElement("td");

        const actions = document.createElement("div");
        actions.className = "action-buttons";


        // EDIT BUTTON
        const editButton = document.createElement("button");

        editButton.type = "button";
        editButton.className = "edit-button";
        editButton.textContent = "Edit";

        editButton.addEventListener("click", function () {
            editProduct(product.id);
        });


        // ACTIVATE / DEACTIVATE BUTTON
        const toggleButton = document.createElement("button");

        toggleButton.type = "button";
        toggleButton.className = "toggle-button";

        toggleButton.textContent =
            product.isActive ? "Deactivate" : "Activate";

        toggleButton.addEventListener("click", function () {
            toggleProductStatus(product.id);
        });


        // DELETE BUTTON
        const deleteButton = document.createElement("button");

        deleteButton.type = "button";
        deleteButton.className = "delete-button";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", function () {
            deleteProduct(product.id);
        });


        actions.appendChild(editButton);
        actions.appendChild(toggleButton);
        actions.appendChild(deleteButton);

        actionCell.appendChild(actions);


        row.appendChild(productCell);
        row.appendChild(categoryCell);
        row.appendChild(priceCell);
        row.appendChild(stockCell);
        row.appendChild(statusCell);
        row.appendChild(actionCell);

        productElements.list.appendChild(row);

    });


    renderProductPagination(
        totalProducts,
        totalPages,
        startIndex,
        endIndex
    );
}


// ==========================================
// RENDER PAGINATION
// ==========================================

function renderProductPagination(
    totalProducts,
    totalPages,
    startIndex,
    endIndex
) {

    productElements.pagination.innerHTML = "";

    const info = document.createElement("div");

    info.className = "pagination-info";

    info.textContent =
        `Showing ${startIndex + 1}–${endIndex} of ${totalProducts} products`;


    const controls = document.createElement("div");

    controls.className = "pagination-controls";


    // PREVIOUS BUTTON
    const previousButton = document.createElement("button");

    previousButton.type = "button";
    previousButton.className = "pagination-button";
    previousButton.textContent = "Previous";

    previousButton.disabled = currentProductPage === 1;

    previousButton.addEventListener("click", function () {

        if (currentProductPage > 1) {

            currentProductPage--;

            displayAdminProducts();
        }
    });

    controls.appendChild(previousButton);


    // NUMBERED PAGE BUTTONS
    for (let page = 1; page <= totalPages; page++) {

        const pageButton = document.createElement("button");

        pageButton.type = "button";
        pageButton.className = "pagination-button";

        pageButton.textContent = page;

        if (page === currentProductPage) {

            pageButton.classList.add("active");

            pageButton.setAttribute("aria-current", "page");
        }

        pageButton.addEventListener("click", function () {

            currentProductPage = page;

            displayAdminProducts();
        });

        controls.appendChild(pageButton);
    }


    // NEXT BUTTON
    const nextButton = document.createElement("button");

    nextButton.type = "button";
    nextButton.className = "pagination-button";
    nextButton.textContent = "Next";

    nextButton.disabled =
        currentProductPage === totalPages;

    nextButton.addEventListener("click", function () {

        if (currentProductPage < totalPages) {

            currentProductPage++;

            displayAdminProducts();
        }
    });

    controls.appendChild(nextButton);

    productElements.pagination.appendChild(info);

    productElements.pagination.appendChild(controls);
}


// ==========================================
// OPEN PRODUCT FORM
// ==========================================

function openProductForm() {

    productElements.form.reset();

    productElements.editingId.value = "";

    productElements.formTitle.textContent =
        "Add New Product";

    productElements.saveButton.textContent =
        "Save Product";

    productElements.activeCheckbox.checked = true;

    productElements.formSection.classList.add("show");

    productElements.formSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


// ==========================================
// CLOSE PRODUCT FORM
// ==========================================

function closeProductForm() {

    productElements.formSection.classList.remove("show");

    productElements.form.reset();

    productElements.editingId.value = "";

    productElements.saveButton.textContent = "Save Product";

    productElements.saveButton.disabled = false;
}


// ==========================================
// EDIT PRODUCT
// ==========================================

function editProduct(productId) {

    const product = adminProducts.find(
        item => item.id === productId
    );

    if (!product) {

        alert("Product not found.");

        return;
    }

    productElements.editingId.value = product.id;

    productElements.name.value = product.name;

    productElements.category.value = product.categoryId;

    productElements.price.value = product.price;

    productElements.stock.value = product.stock;

    productElements.image.value = product.image;

    productElements.description.value = product.description;

    productElements.activeCheckbox.checked = product.isActive;

    productElements.formTitle.textContent =
        "Edit Product";

    productElements.saveButton.textContent =
        "Update Product";

    productElements.formSection.classList.add("show");

    productElements.formSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


// ==========================================
// SAVE PRODUCT
// ==========================================

productElements.form.addEventListener("submit", async function (event) {

    event.preventDefault();

    if (!checkAdminAccess()) return;

    const productId = productElements.editingId.value;

    const name = productElements.name.value.trim();

    const categoryId = productElements.category.value;

    const categoryName = getCategoryName(categoryId);

    const price = Number(productElements.price.value);

    const stock = Number(productElements.stock.value);

    const image = productElements.image.value.trim();

    const description = productElements.description.value.trim();

    const isActive = productElements.activeCheckbox.checked;


    if (
        !name ||
        !categoryId ||
        !categoryName ||
        !image ||
        !description ||
        !Number.isFinite(price) ||
        price < 0 ||
        !Number.isInteger(stock) ||
        stock < 0
    ) {

        alert("Please enter valid product details.");

        return;
    }


    const productFields = {

        name: {
            stringValue: name
        },

        description: {
            stringValue: description
        },

        price: {
            doubleValue: price
        },

        categoryId: {
            stringValue: categoryId
        },

        categoryName: {
            stringValue: categoryName
        },

        image: {
            stringValue: image
        },

        stock: {
            integerValue: String(stock)
        },

        isActive: {
            booleanValue: isActive
        }
    };


    try {

        productElements.saveButton.disabled = true;

        productElements.saveButton.textContent = "Saving...";


        if (productId) {

            // UPDATE EXISTING PRODUCT
            const url =
                `${FIRESTORE_BASE_URL}/products/${encodeURIComponent(productId)}`;

            const updateMask = Object.keys(productFields)
                .map(field =>
                    "updateMask.fieldPaths=" +
                    encodeURIComponent(field)
                )
                .join("&");

            await firestoreRequest(
                `${url}?${updateMask}`,
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        fields: productFields
                    })
                }
            );

            productElements.message.textContent =
                "Product updated successfully.";

        } else {

            // ADD NEW PRODUCT
            const newProductId =
                "PRODUCT_" + Date.now();

            const url =
                `${FIRESTORE_BASE_URL}/products?documentId=${encodeURIComponent(newProductId)}`;

            await firestoreRequest(
                url,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        fields: productFields
                    })
                }
            );

            productElements.message.textContent =
                "New product added successfully.";

            currentProductPage = 1;
        }


        closeProductForm();

        await loadAdminProducts();


    } catch (error) {

        console.error("Save product error:", error);

        productElements.message.textContent =
            "Unable to save product: " + error.message;

    } finally {

        productElements.saveButton.disabled = false;

        productElements.saveButton.textContent =
            productElements.editingId.value
                ? "Update Product"
                : "Save Product";
    }
});


// ==========================================
// DELETE PRODUCT
// ==========================================

async function deleteProduct(productId) {

    const product = adminProducts.find(
        item => item.id === productId
    );

    if (!product) return;

    const confirmed = confirm(
        `Are you sure you want to delete "${product.name}"?`
    );

    if (!confirmed) return;

    try {

        const url =
            `${FIRESTORE_BASE_URL}/products/${encodeURIComponent(productId)}`;

        await firestoreRequest(url, {
            method: "DELETE"
        });

        productElements.message.textContent =
            "Product deleted successfully.";

        await loadAdminProducts();

    } catch (error) {

        console.error("Delete product error:", error);

        productElements.message.textContent =
            "Unable to delete product: " + error.message;
    }
}


// ==========================================
// ACTIVATE / DEACTIVATE PRODUCT
// ==========================================

async function toggleProductStatus(productId) {

    const product = adminProducts.find(
        item => item.id === productId
    );

    if (!product) return;

    const newStatus = !product.isActive;

    const confirmed = confirm(
        `Do you want to ${newStatus ? "activate" : "deactivate"} ${product.name}?`
    );

    if (!confirmed) return;

    try {

        const url =
            `${FIRESTORE_BASE_URL}/products/${encodeURIComponent(productId)}` +
            "?updateMask.fieldPaths=isActive";

        await firestoreRequest(
            url,
            {
                method: "PATCH",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    fields: {
                        isActive: {
                            booleanValue: newStatus
                        }
                    }
                })
            }
        );

        productElements.message.textContent =
            "Product status updated successfully.";

        await loadAdminProducts();

    } catch (error) {

        console.error("Status update error:", error);

        productElements.message.textContent =
            "Unable to update status: " + error.message;
    }
}


// ==========================================
// EVENT LISTENERS
// ==========================================

// ADD PRODUCT
document.getElementById("addProductButton")
    .addEventListener("click", openProductForm);


// CLOSE PRODUCT FORM
document.getElementById("closeProductForm")
    .addEventListener("click", closeProductForm);


// CANCEL PRODUCT FORM
document.getElementById("cancelProductForm")
    .addEventListener("click", closeProductForm);


// REFRESH PRODUCTS
document.getElementById("refreshProducts")
    .addEventListener("click", loadAdminProducts);


// SEARCH FILTER
productElements.search.addEventListener("input", function () {

    currentProductPage = 1;

    displayAdminProducts();
});


// CATEGORY FILTER
productElements.categoryFilter.addEventListener("change", function () {

    currentProductPage = 1;

    displayAdminProducts();
});


// STATUS FILTER
productElements.statusFilter.addEventListener("change", function () {

    currentProductPage = 1;

    displayAdminProducts();
});


// ADMIN LOGOUT
document.getElementById("adminLogout")
    .addEventListener("click", function () {

        sessionStorage.clear();

        window.location.href = "../customer/login.html";
    });


// ==========================================
// INITIALIZE
// ==========================================

if (checkAdminAccess()) {

    loadAdminProducts();
}
