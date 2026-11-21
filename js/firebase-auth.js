
const AUTH_BASE_URL =
    "https://identitytoolkit.googleapis.com/v1/accounts";

// Register a new customer
async function registerUser(email, password) {
    const url =
        `${AUTH_BASE_URL}:signUp?key=${window.firebaseConfig.apiKey}`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email,
            password,
            returnSecureToken: true
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || "Registration failed.");
    }

    return data;
}

// Login an existing customer
async function loginUser(email, password) {
    const url =
        `${AUTH_BASE_URL}:signInWithPassword?key=${window.firebaseConfig.apiKey}`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email,
            password,
            returnSecureToken: true
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || "Login failed.");
    }

    return data;
}

// Refresh an expired Firebase ID token
async function refreshUserToken() {
    const refreshToken = sessionStorage.getItem("customerRefreshToken");

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

        throw new Error(
            data.error?.message || "Session expired. Please log in again."
        );
    }

    // Save the new ID token and rotated refresh token
    sessionStorage.setItem("customerToken", data.id_token);
    sessionStorage.setItem("customerRefreshToken", data.refresh_token);

    return data.id_token;
}

// Send password reset email
async function resetPassword(email) {
    const url =
        `${AUTH_BASE_URL}:sendOobCode?key=${window.firebaseConfig.apiKey}`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            requestType: "PASSWORD_RESET",
            email
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || "Password reset failed.");
    }

    return data;
}
