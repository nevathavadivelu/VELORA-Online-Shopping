
document.addEventListener("DOMContentLoaded", function () {

    // ======================================
    // VELORA PRODUCT CATALOGUE
    // ======================================

    const PRODUCTS_PER_PAGE = 12;

    const productList = document.getElementById("productList");
    const productCount = document.getElementById("productCount");
    const pagination = document.getElementById("productPagination");

    const searchInput = document.getElementById("productSearch");
    const categoryFilter = document.getElementById("categoryFilter");
    const sortFilter = document.getElementById("sortFilter");
    const logoutButton = document.getElementById("logoutButton");

    // Check that all required HTML elements exist.
    const requiredElements = {
        productList,
        productCount,
        pagination,
        searchInput,
        categoryFilter,
        sortFilter,
        logoutButton
    };

    for (const [elementName, element] of Object.entries(requiredElements)) {

        if (!element) {

            console.error(
                "VELORA: Missing HTML element:",
                elementName
            );

            return;
        }
    }

    let allProducts = [];
    let currentProductPage = 1;


    // ======================================
    // CUSTOMER LOGIN
    // ======================================

    const customerId = sessionStorage.getItem("customerId");
    const token = sessionStorage.getItem("customerToken");

    if (!customerId || !token) {

        window.location.href = "login.html";

        return;
    }


    // ======================================
    // FIRESTORE FIELD READER
    // ======================================

    function getProductValue(fields, fieldName) {

        const field = fields?.[fieldName];

        if (!field) return "";

        if (field.stringValue !== undefined) {
            return field.stringValue;
        }

        if (field.integerValue !== undefined) {
            return Number(field.integerValue);
        }

        if (field.doubleValue !== undefined) {
            return field.doubleValue;
        }

        if (field.booleanValue !== undefined) {
            return field.booleanValue;
        }

        return "";
    }


    // ======================================
    // LOAD PRODUCTS
    // ======================================

    async function loadProducts() {

        try {

            productList.innerHTML =
                '<p class="empty-products">Loading our collection...</p>';

            pagination.innerHTML = "";

            const documents = await getAllProducts(token);

            allProducts = documents.map(function (document) {

                const fields = document.fields || {};

                return {

                    id: document.name.split("/").pop(),

                    name: String(
                        getProductValue(fields, "name")
                    ),

                    description: String(
                        getProductValue(fields, "description")
                    ),

                    price: Number(
                        getProductValue(fields, "price") || 0
                    ),

                    category: String(
                        getProductValue(fields, "categoryName")
                    ),

                    image: String(
                        getProductValue(fields, "image")
                    ),

                    stock: Number(
                        getProductValue(fields, "stock") || 0
                    ),

                    isActive: getProductValue(fields, "isActive")

                };

            }).filter(function (product) {

                return product.isActive !== false;

            });

            createCategoryOptions();

            displayProducts();

        } catch (error) {

            console.error("Product loading error:", error);

            productList.innerHTML = `
                <div class="empty-products">
                    <h3>Unable to load products</h3>
                    <p>${escapeHTML(error.message)}</p>
                </div>
            `;

            productCount.textContent = "Unable to load collection";

            pagination.innerHTML = "";
        }
    }


    // ======================================
    // HTML ESCAPING
    // ======================================

    function escapeHTML(value) {

        return String(value).replace(/[&<>"']/g, function (character) {

            const replacements = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return replacements[character];
        });
    }


    // ======================================
    // CATEGORY DROPDOWN
    // ======================================

    function createCategoryOptions() {

        const selectedCategory = categoryFilter.value;

        const categories = [
            ...new Set(
                allProducts
                    .map(product => product.category)
                    .filter(Boolean)
            )
        ].sort();

        categoryFilter.innerHTML =
            '<option value="all">All Categories</option>';

        categories.forEach(function (category) {

            const option = document.createElement("option");

            option.value = category;
            option.textContent = category;

            categoryFilter.appendChild(option);
        });

        if (categories.includes(selectedCategory)) {

            categoryFilter.value = selectedCategory;
        }
    }


    // ======================================
    // FILTER AND SORT
    // ======================================

    function getFilteredProducts() {

        let filtered = [...allProducts];

        const searchText =
            searchInput.value.trim().toLowerCase();

        const selectedCategory = categoryFilter.value;

        const selectedSort = sortFilter.value;


        // Search
        if (searchText) {

            filtered = filtered.filter(function (product) {

                return (
                    product.name.toLowerCase().includes(searchText) ||
                    product.description.toLowerCase().includes(searchText) ||
                    product.category.toLowerCase().includes(searchText)
                );

            });
        }


        // Category
        if (selectedCategory !== "all") {

            filtered = filtered.filter(function (product) {

                return product.category === selectedCategory;

            });
        }


        // Sort
        if (selectedSort === "low-high") {

            filtered.sort((a, b) => a.price - b.price);

        } else if (selectedSort === "high-low") {

            filtered.sort((a, b) => b.price - a.price);

        } else if (selectedSort === "name") {

            filtered.sort((a, b) =>
                a.name.localeCompare(b.name)
            );
        }

        return filtered;
    }


    // ======================================
    // DISPLAY PRODUCTS
    // ======================================

    function displayProducts() {

        const filteredProducts = getFilteredProducts();

        const totalProducts = filteredProducts.length;

        const totalPages = Math.ceil(
            totalProducts / PRODUCTS_PER_PAGE
        );

        productList.innerHTML = "";

        productCount.textContent =
            totalProducts +
            (totalProducts === 1
                ? " product found"
                : " products found");


        // No products
        if (totalProducts === 0) {

            currentProductPage = 1;

            productList.innerHTML = `
                <div class="empty-products">
                    <h3>No products found</h3>
                    <p>Try another search or category.</p>
                </div>
            `;

            pagination.innerHTML = "";

            return;
        }


        // Check page range
        currentProductPage = Math.min(
            Math.max(currentProductPage, 1),
            totalPages
        );


        // Pagination calculations
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


        // Render current products
        currentProducts.forEach(function (product) {

            const card = document.createElement("article");

            card.className = "product-card";


            // Image
            const imageWrapper = document.createElement("div");

            imageWrapper.className = "product-image-wrapper";

            const image = document.createElement("img");

            image.src = product.image;

            image.alt = product.name;

            image.loading = "lazy";

            image.style.cursor = "pointer";

            image.onerror = function () {

                this.style.display = "none";

                imageWrapper.style.background = "#EEE9DE";
            };

            image.addEventListener("click", function () {

                window.location.href =
                    "product-details.html?id=" +
                    encodeURIComponent(product.id);
            });

            imageWrapper.appendChild(image);


            // Stock badge
            const stockBadge = document.createElement("span");

            stockBadge.className = "stock-badge";

            stockBadge.textContent =
                product.stock > 0 ? "IN STOCK" : "SOLD OUT";

            imageWrapper.appendChild(stockBadge);


            // Details
            const details = document.createElement("div");

            details.className = "product-details";


            const category = document.createElement("p");

            category.className = "product-category";

            category.textContent = product.category;


            const name = document.createElement("h3");

            name.textContent = product.name;

            name.style.cursor = "pointer";

            name.addEventListener("click", function () {

                window.location.href =
                    "product-details.html?id=" +
                    encodeURIComponent(product.id);
            });


            const description = document.createElement("p");

            description.className = "product-description";

            description.textContent = product.description;


            const stock = document.createElement("p");

            stock.className = "product-stock";

            stock.textContent =
                "Available stock: " + product.stock;


            // Price and button
            const bottom = document.createElement("div");

            bottom.className = "product-bottom";


            const price = document.createElement("p");

            price.className = "product-price";

            price.textContent =
                "₹" + product.price.toLocaleString("en-IN");


            const addButton = document.createElement("button");

            addButton.type = "button";

            addButton.className = "add-to-cart";

            addButton.textContent =
                product.stock > 0 ? "Add to Cart" : "Out of Stock";

            addButton.disabled = product.stock <= 0;

            addButton.addEventListener("click", function () {

                addToCart(product);
            });


            // Append elements
            bottom.appendChild(price);

            bottom.appendChild(addButton);

            details.appendChild(category);

            details.appendChild(name);

            details.appendChild(description);

            details.appendChild(stock);

            details.appendChild(bottom);

            card.appendChild(imageWrapper);

            card.appendChild(details);

            productList.appendChild(card);
        });


        // Pagination
        renderProductPagination(
            totalProducts,
            totalPages,
            startIndex,
            endIndex
        );
    }


    // ======================================
    // PAGINATION
    // ======================================

    function renderProductPagination(
        totalProducts,
        totalPages,
        startIndex,
        endIndex
    ) {

        pagination.innerHTML = "";

        if (totalPages <= 1) return;


        const info = document.createElement("p");

        info.className = "customer-pagination-info";

        info.textContent =
            `Showing ${startIndex + 1}–${endIndex} of ${totalProducts} products`;


        const controls = document.createElement("div");

        controls.className = "customer-pagination-controls";


        // Previous
        const previousButton = document.createElement("button");

        previousButton.type = "button";

        previousButton.className = "customer-page-button";

        previousButton.textContent = "Previous";

        previousButton.disabled = currentProductPage === 1;

        previousButton.addEventListener("click", function () {

            if (currentProductPage > 1) {

                currentProductPage--;

                displayProducts();

                scrollToProducts();
            }
        });

        controls.appendChild(previousButton);


        // Page numbers
        for (let page = 1; page <= totalPages; page++) {

            const pageButton = document.createElement("button");

            pageButton.type = "button";

            pageButton.className = "customer-page-button";

            pageButton.textContent = page;

            if (page === currentProductPage) {

                pageButton.classList.add("active");

                pageButton.setAttribute("aria-current", "page");
            }

            pageButton.addEventListener("click", function () {

                currentProductPage = page;

                displayProducts();

                scrollToProducts();
            });

            controls.appendChild(pageButton);
        }


        // Next
        const nextButton = document.createElement("button");

        nextButton.type = "button";

        nextButton.className = "customer-page-button";

        nextButton.textContent = "Next";

        nextButton.disabled =
            currentProductPage === totalPages;

        nextButton.addEventListener("click", function () {

            if (currentProductPage < totalPages) {

                currentProductPage++;

                displayProducts();

                scrollToProducts();
            }
        });

        controls.appendChild(nextButton);

        pagination.appendChild(info);

        pagination.appendChild(controls);
    }


    // ======================================
    // SCROLL TO PRODUCTS
    // ======================================

    function scrollToProducts() {

        productList.scrollIntoView({

            behavior: "smooth",

            block: "start"

        });
    }


    // ======================================
    // ADD TO CART
    // ======================================

    function addToCart(product) {

        let cart;

        try {

            cart = JSON.parse(
                localStorage.getItem("shoppingCart")
            ) || [];

            if (!Array.isArray(cart)) {
                cart = [];
            }

        } catch (error) {

            cart = [];
        }


        const existingProduct = cart.find(function (item) {

            return item.name === product.name;

        });

        const currentQuantity = existingProduct
            ? Number(existingProduct.quantity) || 0
            : 0;


        if (currentQuantity >= product.stock) {

            alert("You cannot add more than the available stock.");

            return;
        }


        if (existingProduct) {

            existingProduct.quantity++;

        } else {

            cart.push({

                name: product.name,

                price: product.price,

                quantity: 1

            });
        }


        localStorage.setItem(
            "shoppingCart",
            JSON.stringify(cart)
        );

        alert(product.name + " added to your cart!");
    }


    // ======================================
    // SEARCH EVENT
    // ======================================

    searchInput.addEventListener("input", function () {

        currentProductPage = 1;

        displayProducts();
    });


    // ======================================
    // CATEGORY EVENT
    // ======================================

    categoryFilter.addEventListener("change", function () {

        currentProductPage = 1;

        displayProducts();
    });


    // ======================================
    // SORT EVENT
    // ======================================

    sortFilter.addEventListener("change", function () {

        currentProductPage = 1;

        displayProducts();
    });


    // ======================================
    // LOGOUT
    // ======================================

    logoutButton.addEventListener("click", function () {

        sessionStorage.clear();

        window.location.href = "login.html";
    });


    // ======================================
    // START CATALOGUE
    // ======================================

    loadProducts();

});
