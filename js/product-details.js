
const productDetail = document.getElementById("productDetail");
const relatedProducts = document.getElementById("relatedProducts");
const logoutButton = document.getElementById("logoutButton");

const customerId = sessionStorage.getItem("customerId");
const token = sessionStorage.getItem("customerToken");

let allProducts = [];
let currentProduct = null;
let selectedQuantity = 1;

const productId = new URLSearchParams(
    window.location.search
).get("id");

// Check customer login
if (!customerId || !token) {
    window.location.href = "login.html";
}

// Read Firestore fields
function getProductValue(fields, fieldName) {
    const field = fields[fieldName];

    if (!field) return "";

    return (
        field.stringValue ??
        field.integerValue ??
        field.doubleValue ??
        field.booleanValue ??
        ""
    );
}

// Escape HTML
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

// Load product information
async function loadProductDetails() {

    if (!productId) {
        showError("No product was selected.");
        return;
    }

    try {
        const documents = await getAllProducts(token);

        allProducts = documents.map(function (document) {

            const fields = document.fields;

            return {
                id: document.name.split("/").pop(),
                name: getProductValue(fields, "name"),
                description: getProductValue(fields, "description"),
                price: Number(getProductValue(fields, "price")),
                category: getProductValue(fields, "categoryName"),
                image: getProductValue(fields, "image"),
                stock: Number(getProductValue(fields, "stock")),
                isActive: getProductValue(fields, "isActive")
            };

        }).filter(function (product) {
            return product.isActive !== false;
        });

        currentProduct = allProducts.find(function (product) {
            return product.id === productId;
        });

        if (!currentProduct) {
            showError("This product is unavailable or no longer exists.");
            relatedProducts.innerHTML = "";
            return;
        }

        displayProduct();
        displayRelatedProducts();

    } catch (error) {

        console.error("Product details error:", error);

        showError(
            "Unable to load product details. " + error.message
        );
    }
}

// Show error
function showError(message) {

    productDetail.innerHTML = `
        <div class="error-message">
            <h2>Product unavailable</h2>
            <p>${escapeHTML(message)}</p>
            <br>
            <a href="products.html">Return to collection</a>
        </div>
    `;
}

// Display selected product
function displayProduct() {

    const product = currentProduct;

    const isAvailable = product.stock > 0;

    productDetail.innerHTML = `
        <div class="product-image-panel">

            <img
                id="detailProductImage"
                src="${escapeHTML(product.image)}"
                alt="${escapeHTML(product.name)}"
            >

            <span class="image-caption">
                THE VELORA COLLECTION
            </span>

        </div>

        <div class="product-information">

            <p class="eyebrow">A VELORA FIND</p>

            <span class="detail-category">
                ${escapeHTML(product.category || "Collection")}
            </span>

            <h1>${escapeHTML(product.name)}</h1>

            <p class="detail-price">
                ₹${product.price.toLocaleString("en-IN")}
            </p>

            <div class="detail-divider"></div>

            <p class="detail-description">
                ${escapeHTML(product.description || "A thoughtful addition to your everyday collection.")}
            </p>

            <div class="stock-information ${isAvailable ? "" : "out-of-stock"}">

                <span class="stock-dot"></span>

                ${
                    isAvailable
                    ? `${product.stock} item(s) available`
                    : "Currently out of stock"
                }

            </div>

            <div class="detail-divider"></div>

            <p class="quantity-label">SELECT QUANTITY</p>

            <div class="quantity-control">

                <button
                    type="button"
                    id="decreaseQuantity"
                    aria-label="Decrease quantity"
                    ${!isAvailable ? "disabled" : ""}
                >−</button>

                <span id="quantityValue">1</span>

                <button
                    type="button"
                    id="increaseQuantity"
                    aria-label="Increase quantity"
                    ${!isAvailable ? "disabled" : ""}
                >+</button>

            </div>

            <button
                type="button"
                id="detailAddToCart"
                class="detail-add-button"
                ${!isAvailable ? "disabled" : ""}
            >
                ${isAvailable ? "ADD TO SHOPPING BAG" : "OUT OF STOCK"}
            </button>

            <a href="products.html" class="back-to-shop">
                ← CONTINUE SHOPPING
            </a>

        </div>
    `;

    const image = document.getElementById("detailProductImage");

    image.onerror = function () {
        this.style.display = "none";
    };

    document.getElementById("decreaseQuantity")
        .addEventListener("click", function () {
            if (selectedQuantity > 1) {
                selectedQuantity--;
                updateQuantityDisplay();
            }
        });

    document.getElementById("increaseQuantity")
        .addEventListener("click", function () {
            if (selectedQuantity < product.stock) {
                selectedQuantity++;
                updateQuantityDisplay();
            }
        });

    document.getElementById("detailAddToCart")
        .addEventListener("click", addSelectedProductToCart);
}

// Update quantity
function updateQuantityDisplay() {

    document.getElementById("quantityValue").textContent =
        selectedQuantity;
}

// Add product to existing cart
function addSelectedProductToCart() {

    if (!currentProduct || currentProduct.stock <= 0) {
        alert("This product is currently unavailable.");
        return;
    }

    let cart = JSON.parse(
        localStorage.getItem("shoppingCart")
    ) || [];

    const existingProduct = cart.find(function (item) {
        return item.name === currentProduct.name;
    });

    const existingQuantity = existingProduct
        ? Number(existingProduct.quantity)
        : 0;

    if (existingQuantity + selectedQuantity > currentProduct.stock) {

        alert(
            "Only " +
            Math.max(0, currentProduct.stock - existingQuantity) +
            " more item(s) can be added to your cart."
        );

        return;
    }

    if (existingProduct) {

        existingProduct.quantity += selectedQuantity;

    } else {

        cart.push({
            name: currentProduct.name,
            price: currentProduct.price,
            quantity: selectedQuantity
        });
    }

    localStorage.setItem(
        "shoppingCart",
        JSON.stringify(cart)
    );

    alert(
        selectedQuantity +
        " × " +
        currentProduct.name +
        " added to your cart!"
    );
}

// Related products
function displayRelatedProducts() {

    const related = allProducts
        .filter(function (product) {
            return (
                product.id !== currentProduct.id &&
                product.category === currentProduct.category
            );
        })
        .slice(0, 4);

    if (related.length === 0) {
        relatedProducts.innerHTML =
            "<p>No related products available right now.</p>";
        return;
    }

    relatedProducts.innerHTML = "";

    related.forEach(function (product) {

        const card = document.createElement("article");
        card.className = "related-card";

        const image = document.createElement("img");
        image.src = product.image;
        image.alt = product.name;
        image.loading = "lazy";

        image.onerror = function () {
            this.style.display = "none";
        };

        const content = document.createElement("div");
        content.className = "related-card-content";

        const name = document.createElement("h3");
        name.textContent = product.name;

        const category = document.createElement("p");
        category.textContent = product.category;

        const price = document.createElement("p");
        price.className = "related-price";
        price.textContent =
            "₹" + product.price.toLocaleString("en-IN");

        const link = document.createElement("a");
        link.href =
            "product-details.html?id=" +
            encodeURIComponent(product.id);

        link.textContent = "VIEW PRODUCT →";

        content.appendChild(name);
        content.appendChild(category);
        content.appendChild(price);
        content.appendChild(link);

        card.appendChild(image);
        card.appendChild(content);

        relatedProducts.appendChild(card);
    });
}

// Logout
logoutButton.addEventListener("click", function () {

    sessionStorage.clear();

    window.location.href = "login.html";
});

// Start
if (customerId && token) {
    loadProductDetails();
}
