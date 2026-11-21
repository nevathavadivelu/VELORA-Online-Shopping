
const featuredProducts = document.getElementById("featuredProducts");
const logoutButton = document.getElementById("logoutButton");

const customerId = sessionStorage.getItem("customerId");
const token = sessionStorage.getItem("customerToken");

// Check customer login
if (!customerId || !token) {
    window.location.href = "login.html";
}

// Safely display Firestore values
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

// Load customer name
async function loadCustomerName() {
    try {
        const profile = await getCustomerProfile(customerId, token);

        const heroHeading = document.querySelector(".hero h1");

        if (heroHeading && profile && profile.fullName) {
            heroHeading.innerHTML =
                `Welcome back,<br><span>${escapeHTML(profile.fullName)}.</span>`;
        }

    } catch (error) {
        console.error("Customer profile error:", error);
    }
}

// Load featured products
async function loadFeaturedProducts() {
    try {
        featuredProducts.innerHTML =
            '<p class="loading-message">Preparing your collection...</p>';

        const products = await getAllProducts(token);

        const activeProducts = products.filter(function (product) {
            return product.fields.isActive?.booleanValue !== false;
        });

        const selectedProducts = activeProducts.slice(0, 4);

        if (selectedProducts.length === 0) {
            featuredProducts.innerHTML =
                '<p class="loading-message">No products available at the moment.</p>';
            return;
        }

        featuredProducts.innerHTML = "";

        selectedProducts.forEach(function (productDocument) {
            const fields = productDocument.fields;

            const name = fields.name?.stringValue || "Product";

            const description =
                fields.description?.stringValue || "Discover this collection.";

            const category =
                fields.categoryName?.stringValue || "VELORA COLLECTION";

            const image =
                fields.image?.stringValue || "";

            const price = Number(
                fields.price?.integerValue ??
                fields.price?.doubleValue ??
                0
            );

            const card = document.createElement("article");
            card.className = "featured-card";

            const productImage = document.createElement("img");

            productImage.src = image;
            productImage.alt = name;
            productImage.loading = "lazy";

            productImage.onerror = function () {
                this.onerror = null;
                this.src = "../assets/images/products/tshirt.jpg";
            };

            const info = document.createElement("div");
            info.className = "featured-info";

            const title = document.createElement("h3");
            title.textContent = name;

            const categoryText = document.createElement("p");
            categoryText.className = "featured-category";
            categoryText.textContent = category;

            const descriptionText = document.createElement("p");
            descriptionText.className = "featured-category";
            descriptionText.textContent = description;

            const priceText = document.createElement("p");
            priceText.className = "featured-price";
            priceText.textContent = "₹" + price.toLocaleString("en-IN");

            info.appendChild(title);
            info.appendChild(categoryText);
            info.appendChild(descriptionText);
            info.appendChild(priceText);

            card.appendChild(productImage);
            card.appendChild(info);

            featuredProducts.appendChild(card);
        });

    } catch (error) {
        console.error("Featured products error:", error);

        featuredProducts.innerHTML =
            '<p class="loading-message">Unable to load products. Please refresh the page.</p>';
    }
}

// Logout
if (logoutButton) {
    logoutButton.addEventListener("click", function (event) {
        event.preventDefault();

        sessionStorage.clear();
        window.location.href = "login.html";
    });
}

// Start homepage
if (customerId && token) {
    loadCustomerName();
    loadFeaturedProducts();
}

/* =====================================
   VELORA MOBILE NAVIGATION
===================================== */

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

if (menuToggle && navLinks) {

    menuToggle.addEventListener("click", function () {

        const isOpen = navLinks.classList.toggle("open");

        menuToggle.setAttribute("aria-expanded", isOpen);

        menuToggle.innerHTML = isOpen ? "✕" : "☰";

    });

}

/* =====================================
   VELORA HOMEPAGE SEARCH
===================================== */

const homeSearchForm = document.getElementById("homeSearchForm");
const homeSearchInput = document.getElementById("homeSearchInput");

if (homeSearchForm && homeSearchInput) {

    homeSearchForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const searchValue = homeSearchInput.value.trim();

        if (!searchValue) {
            return;
        }

        window.location.href =
            "products.html?search=" + encodeURIComponent(searchValue);

    });

}
