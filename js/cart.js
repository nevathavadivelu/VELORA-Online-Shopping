
const cartList = document.getElementById("cartList");
const cartTotal = document.getElementById("cartTotal");
const logoutButton = document.getElementById("logoutButton");

const customerId = sessionStorage.getItem("customerId");
const token = sessionStorage.getItem("customerToken");

let productImages = {};

if (!customerId || !token) {
    window.location.href = "login.html";
}

// Escape HTML safely
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

// Read products from Firestore to get their images
async function loadCartImages() {
    try {
        const documents = await getAllProducts(token);

        documents.forEach(function (document) {
            const fields = document.fields;

            const name = fields.name?.stringValue || "";
            const image = fields.image?.stringValue || "";

            if (name && image) {
                productImages[name] = image;
            }
        });

    } catch (error) {
        console.error("Unable to load product images:", error);
    }

    displayCart();
}

// Display shopping cart
function displayCart() {
    let cart = JSON.parse(
        localStorage.getItem("shoppingCart")
    ) || [];

    cartList.innerHTML = "";

    if (cart.length === 0) {
        cartList.innerHTML = `
            <div class="empty-cart">
                <h2>Your shopping bag is empty</h2>
                <p>Discover something beautiful for yourself.</p>
                <a href="products.html" class="checkout-button">
                    EXPLORE COLLECTION
                </a>
            </div>
        `;

        cartTotal.textContent = "₹0";
        return;
    }

    let total = 0;

    cart.forEach(function (item, index) {
        const subtotal = Number(item.price) * Number(item.quantity);
        total += subtotal;

        const cartItem = document.createElement("article");
        cartItem.className = "cart-item";

        // Product image
        const image = document.createElement("img");

        image.src = productImages[item.name] || "";
        image.alt = item.name;
        image.loading = "lazy";

        image.onerror = function () {
            this.style.display = "none";
        };

        // Product information
        const details = document.createElement("div");
        details.className = "cart-item-details";

        details.innerHTML = `
            <h3>${escapeHTML(item.name)}</h3>

            <p class="cart-item-price">
                ₹${Number(item.price).toLocaleString("en-IN")}
            </p>

            <p>
                Subtotal: ₹${subtotal.toLocaleString("en-IN")}
            </p>

            <div class="cart-quantity">
                <button
                    type="button"
                    aria-label="Decrease quantity"
                    onclick="changeQuantity(${index}, -1)"
                >−</button>

                <span>${item.quantity}</span>

                <button
                    type="button"
                    aria-label="Increase quantity"
                    onclick="changeQuantity(${index}, 1)"
                >+</button>
            </div>

            <button
                type="button"
                class="remove-item"
                onclick="removeFromCart(${index})"
            >
                Remove Item
            </button>
        `;

        cartItem.appendChild(image);
        cartItem.appendChild(details);

        cartList.appendChild(cartItem);
    });

    cartTotal.textContent =
        "₹" + total.toLocaleString("en-IN");
}

// Change quantity
function changeQuantity(index, change) {
    let cart = JSON.parse(
        localStorage.getItem("shoppingCart")
    ) || [];

    if (!cart[index]) return;

    cart[index].quantity += change;

    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }

    localStorage.setItem(
        "shoppingCart",
        JSON.stringify(cart)
    );

    displayCart();
}

// Remove product
function removeFromCart(index) {
    let cart = JSON.parse(
        localStorage.getItem("shoppingCart")
    ) || [];

    cart.splice(index, 1);

    localStorage.setItem(
        "shoppingCart",
        JSON.stringify(cart)
    );

    displayCart();
}

// Logout
logoutButton.addEventListener("click", function (event) {
    event.preventDefault();

    sessionStorage.clear();

    window.location.href = "login.html";
});

// Start
if (customerId && token) {
    loadCartImages();
}
