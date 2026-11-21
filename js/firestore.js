
const FIRESTORE_BASE_URL =
    "https://firestore.googleapis.com/v1/projects/" +
    window.firebaseConfig.projectId +
    "/databases/(default)/documents";

// Refresh Firebase ID token
async function refreshFirestoreIdToken(fallbackRefreshToken) {

    const refreshToken =
        sessionStorage.getItem("customerRefreshToken") ||
        fallbackRefreshToken;

    if (!refreshToken) {
        throw new Error("Your session has expired. Please log in again.");
    }

    const url =
        `https://securetoken.googleapis.com/v1/token?key=${window.firebaseConfig.apiKey}`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken
        })
    });

    const data = await response.json();

    if (!response.ok) {
        sessionStorage.removeItem("customerId");
        sessionStorage.removeItem("customerEmail");
        sessionStorage.removeItem("customerToken");
        sessionStorage.removeItem("customerRefreshToken");

        throw new Error("Session expired. Please log in again.");
    }

    sessionStorage.setItem("customerToken", data.id_token);
    sessionStorage.setItem("customerRefreshToken", data.refresh_token);

    return data.id_token;
}

// Common Firestore request function
async function firestoreRequest(
    url,
    options = {},
    fallbackToken = null,
    fallbackRefreshToken = null
) {

    let token =
        sessionStorage.getItem("customerToken") ||
        fallbackToken;

    if (!token) {
        throw new Error("Please log in again.");
    }

    async function sendRequest(currentToken) {

        const headers = {
            ...(options.headers || {}),
            "Authorization": `Bearer ${currentToken}`
        };

        return fetch(url, {
            ...options,
            headers
        });
    }

    let response = await sendRequest(token);

    // Retry once if Firebase rejects the ID token
    if (response.status === 401) {

        token = await refreshFirestoreIdToken(fallbackRefreshToken);

        response = await sendRequest(token);
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.error?.message || "Firestore request failed."
        );
    }

    return data;
}

// Save customer details in Firestore
async function saveCustomerProfile(userData) {

    const url =
        `${FIRESTORE_BASE_URL}/customers/${userData.localId}`;

    return firestoreRequest(url, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            fields: {
                fullName: {
                    stringValue: userData.fullName
                },
                email: {
                    stringValue: userData.email
                },
                createdAt: {
                    timestampValue: new Date().toISOString()
                }
            }
        })
    }, userData.idToken, userData.refreshToken);
}

// Get customer profile from Firestore
async function getCustomerProfile(localId, idToken) {

    const url = `${FIRESTORE_BASE_URL}/customers/${localId}`;

    const data = await firestoreRequest(url, {
        method: "GET"
    }, idToken);

    return {
        fullName: data.fields?.fullName?.stringValue || "",
        email: data.fields?.email?.stringValue || ""
    };
}

// Update customer full name in Firestore
async function updateCustomerName(localId, idToken, newName) {

    const url =
        `${FIRESTORE_BASE_URL}/customers/${localId}` +
        `?updateMask.fieldPaths=fullName`;

    return firestoreRequest(url, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            fields: {
                fullName: {
                    stringValue: newName
                }
            }
        })
    }, idToken);
}

// Get all products from Firestore
async function getAllProducts(idToken) {

    const url = `${FIRESTORE_BASE_URL}/products`;

    const data = await firestoreRequest(url, {
        method: "GET"
    }, idToken);

    return data.documents || [];
}

// Save customer order in Firestore
async function saveOrder(order, idToken) {

    const orderId = "ORDER_" + Date.now();

    const url =
        `${FIRESTORE_BASE_URL}/orders?documentId=${orderId}`;

    const orderItems = order.items.map(function (item) {
        return {
            mapValue: {
                fields: {
                    name: {
                        stringValue: item.name
                    },
                    price: {
                        doubleValue: Number(item.price)
                    },
                    quantity: {
                        integerValue: String(item.quantity)
                    }
                }
            }
        };
    });

    return firestoreRequest(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            fields: {
                customerId: {
                    stringValue: order.customerId
                },
                fullName: {
                    stringValue: order.fullName
                },
                phone: {
                    stringValue: order.phone
                },
                address: {
                    stringValue: order.address
                },
                city: {
                    stringValue: order.city
                },
                pincode: {
                    stringValue: order.pincode
                },
                paymentMethod: {
                    stringValue: order.paymentMethod
                },
                total: {
                    doubleValue: Number(order.total)
                },
                orderDate: {
                    timestampValue: order.orderDate
                },
                items: {
                    arrayValue: {
                        values: orderItems
                    }
                }
            }
        })
    }, idToken);
}
