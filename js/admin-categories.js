
const ADMIN_CATEGORIES_UID = "XlBj1qfZsAeX5JEP9n24dMlsOXX2";

const categoriesUrl = `${FIRESTORE_BASE_URL}/categories`;
const productsUrl = `${FIRESTORE_BASE_URL}/products`;

let categories = [];
let products = [];
let editingCategoryId = null;

// ------------------------------
// FIRESTORE FIELD HELPERS
// ------------------------------

function readCategoryField(fields, fieldName) {
    if (!fields || !fields[fieldName]) return "";

    const field = fields[fieldName];

    return field.stringValue ??
        field.integerValue ??
        field.doubleValue ??
        "";
}

function readProductCategory(fields) {
    return readCategoryField(fields, "categoryId");
}

function readCategoryName(fields) {
    return (
        readCategoryField(fields, "name") ||
        readCategoryField(fields, "categoryName") ||
        readCategoryField(fields, "category")
    );
}

// ------------------------------
// LOAD FIRESTORE COLLECTIONS
// ------------------------------

async function loadCategories() {
    const message = document.getElementById("categoryMessage");
    const categoryList = document.getElementById("categoryList");

    try {
        categoryList.innerHTML = `
            <tr>
                <td colspan="4" class="loading">
                    Loading categories...
                </td>
            </tr>
        `;

        const [categoryData, productData] = await Promise.all([
            firestoreRequest(categoriesUrl, { method: "GET" }),
            firestoreRequest(productsUrl, { method: "GET" })
        ]);

        categories = (categoryData.documents || []).map(doc => ({
            id: doc.name.split("/").pop(),
            name: readCategoryName(doc.fields),
            fields: doc.fields || {}
        }));

        products = (productData.documents || []).map(doc => ({
            id: doc.name.split("/").pop(),
            categoryId: readProductCategory(doc.fields),
            categoryName: readCategoryField(doc.fields, "categoryName")
        }));

        renderCategories();
        updateCategoryStats();

        message.className = "message";
        message.textContent = "";

    } catch (error) {
        console.error("Category loading error:", error);

        categoryList.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    Unable to load categories.
                </td>
            </tr>
        `;

        showCategoryMessage(error.message, "error");
    }
}

// ------------------------------
// COUNT PRODUCTS IN CATEGORY
// ------------------------------

function getProductCount(category) {
    return products.filter(product =>
        product.categoryId === category.id ||
        (
            !product.categoryId &&
            product.categoryName.toLowerCase() === category.name.toLowerCase()
        )
    ).length;
}

// ------------------------------
// DISPLAY CATEGORIES
// ------------------------------

function renderCategories() {
    const categoryList = document.getElementById("categoryList");

    if (categories.length === 0) {
        categoryList.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    No categories found.
                </td>
            </tr>
        `;
        return;
    }

    categoryList.innerHTML = categories.map(category => {
        const count = getProductCount(category);

        return `
            <tr>
                <td>
                    <span class="category-name">
                        ${escapeCategoryHTML(category.name)}
                    </span>
                </td>

                <td>
                    <span class="category-id">
                        ${escapeCategoryHTML(category.id)}
                    </span>
                </td>

                <td>
                    <span class="product-count">
                        ${count} Products
                    </span>
                </td>

                <td>
                    <div class="action-group">
                        <button
                            class="edit-btn"
                            data-action="edit"
                            data-id="${escapeCategoryHTML(category.id)}">
                            Edit
                        </button>

                        <button
                            class="delete-btn"
                            data-action="delete"
                            data-id="${escapeCategoryHTML(category.id)}">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

// ------------------------------
// UPDATE CATEGORY STATISTICS
// ------------------------------

function updateCategoryStats() {
    const used = categories.filter(category =>
        getProductCount(category) > 0
    ).length;

    document.getElementById("totalCategories").textContent =
        categories.length;

    document.getElementById("usedCategories").textContent = used;

    document.getElementById("emptyCategories").textContent =
        categories.length - used;
}

// ------------------------------
// HTML ESCAPE HELPER
// ------------------------------

function escapeCategoryHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// ------------------------------
// SHOW MESSAGE
// ------------------------------

function showCategoryMessage(message, type) {
    const element = document.getElementById("categoryMessage");

    element.textContent = message;
    element.className = `message ${type}`;
}

// ------------------------------
// OPEN CATEGORY MODAL
// ------------------------------

function openCategoryModal(category = null) {
    const modal = document.getElementById("categoryModal");
    const title = document.getElementById("modalTitle");
    const input = document.getElementById("categoryName");

    editingCategoryId = category ? category.id : null;

    title.textContent = category ? "Edit Category" : "Add Category";
    input.value = category ? category.name : "";

    modal.classList.add("show");
    input.focus();
}

function closeCategoryModal() {
    document.getElementById("categoryModal").classList.remove("show");
    document.getElementById("categoryForm").reset();

    editingCategoryId = null;
}

// ------------------------------
// GENERATE CATEGORY DOCUMENT ID
// ------------------------------

function createCategoryId(name) {
    return name
        .trim()
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

// ------------------------------
// ADD OR EDIT CATEGORY
// ------------------------------

async function saveCategory(event) {
    event.preventDefault();

    const input = document.getElementById("categoryName");
    const categoryName = input.value.trim();

    if (!categoryName) {
        showCategoryMessage("Please enter a category name.", "error");
        return;
    }

    const duplicate = categories.some(category =>
        category.name.toLowerCase() === categoryName.toLowerCase() &&
        category.id !== editingCategoryId
    );

    if (duplicate) {
        showCategoryMessage("This category already exists.", "error");
        return;
    }

    try {
        const saveButton = document.querySelector(
            "#categoryForm button[type='submit']"
        );

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        if (editingCategoryId) {
            const category = categories.find(item =>
                item.id === editingCategoryId
            );

            const existingFields = category.fields || {};

            const fieldsToUpdate = {
                name: { stringValue: categoryName },
                categoryName: { stringValue: categoryName }
            };

            const updateUrl =
                `${categoriesUrl}/${encodeURIComponent(editingCategoryId)}` +
                "?updateMask.fieldPaths=name" +
                "&updateMask.fieldPaths=categoryName";

            await firestoreRequest(updateUrl, {
                method: "PATCH",
                body: JSON.stringify({
                    fields: fieldsToUpdate
                })
            });

            // Keep the existing category ID unchanged.
            showCategoryMessage("Category updated successfully.", "success");

        } else {
            const categoryId = createCategoryId(categoryName);

            if (!categoryId) {
                throw new Error("Please enter a valid category name.");
            }

            const exists = categories.some(category =>
                category.id === categoryId
            );

            if (exists) {
                throw new Error(
                    "A category with this document ID already exists."
                );
            }

            const createUrl =
                `${categoriesUrl}?documentId=${encodeURIComponent(categoryId)}`;

            await firestoreRequest(createUrl, {
                method: "POST",
                body: JSON.stringify({
                    fields: {
                        name: { stringValue: categoryName },
                        categoryName: { stringValue: categoryName }
                    }
                })
            });

            showCategoryMessage("Category added successfully.", "success");
        }

        closeCategoryModal();
        await loadCategories();

    } catch (error) {
        console.error("Save category error:", error);
        showCategoryMessage(error.message, "error");

    } finally {
        const saveButton = document.querySelector(
            "#categoryForm button[type='submit']"
        );

        saveButton.disabled = false;
        saveButton.textContent = "Save Category";
    }
}

// ------------------------------
// DELETE CATEGORY
// ------------------------------

async function deleteCategory(categoryId) {
    const category = categories.find(item => item.id === categoryId);

    if (!category) return;

    const productCount = getProductCount(category);

    if (productCount > 0) {
        showCategoryMessage(
            `Cannot delete ${category.name}. It is currently used by ${productCount} product(s).`,
            "error"
        );
        return;
    }

    const confirmed = confirm(
        `Are you sure you want to delete "${category.name}"?`
    );

    if (!confirmed) return;

    try {
        const deleteUrl =
            `${categoriesUrl}/${encodeURIComponent(categoryId)}`;

        await firestoreRequest(deleteUrl, {
            method: "DELETE"
        });

        showCategoryMessage("Category deleted successfully.", "success");

        await loadCategories();

    } catch (error) {
        console.error("Delete category error:", error);
        showCategoryMessage(error.message, "error");
    }
}

// ------------------------------
// CATEGORY TABLE ACTIONS
// ------------------------------

document.getElementById("categoryList").addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const categoryId = button.dataset.id;
    const action = button.dataset.action;

    if (action === "edit") {
        const category = categories.find(item => item.id === categoryId);

        if (category) {
            openCategoryModal(category);
        }
    }

    if (action === "delete") {
        deleteCategory(categoryId);
    }
});

// ------------------------------
// EVENT LISTENERS
// ------------------------------

document.getElementById("addCategoryBtn").addEventListener("click", () => {
    openCategoryModal();
});

document.getElementById("closeModal").addEventListener("click", closeCategoryModal);

document.getElementById("cancelCategory").addEventListener("click", closeCategoryModal);

document.getElementById("categoryForm").addEventListener("submit", saveCategory);

document.getElementById("refreshCategories").addEventListener("click", loadCategories);

document.getElementById("categoryModal").addEventListener("click", event => {
    if (event.target.id === "categoryModal") {
        closeCategoryModal();
    }
});

// ------------------------------
// ADMIN LOGOUT
// ------------------------------

document.getElementById("adminLogout").addEventListener("click", () => {
    const confirmed = confirm("Are you sure you want to logout?");

    if (!confirmed) return;

    sessionStorage.clear();
    window.location.href = "../customer/login.html";
});

// ------------------------------
// INITIAL LOAD
// ------------------------------

loadCategories();
