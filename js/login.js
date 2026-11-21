
const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
        message.textContent = "Logging in...";
        message.style.color = "blue";

        const userData = await loginUser(email, password);

        // Save customer session information
        sessionStorage.setItem("customerId", userData.localId);
        sessionStorage.setItem("customerEmail", userData.email);
        sessionStorage.setItem("customerToken", userData.idToken);
        sessionStorage.setItem("customerRefreshToken", userData.refreshToken);

        message.textContent = "Login successful!";
        message.style.color = "green";

        // Redirect based on user role
const ADMIN_UID = "XlBj1qfZsAeX5JEP9n24dMlsOXX2";

if (userData.localId === ADMIN_UID) {
    window.location.href = "../admin/dashboard.html";
} else {
    window.location.href = "home.html";
}

    } catch (error) {
        console.error("Login error:", error);

        message.textContent =
            error.message || "Login failed. Please check your details.";

        message.style.color = "red";
    }
});

const forgotPasswordLink = document.getElementById("forgotPassword");

forgotPasswordLink.addEventListener("click", async function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();

    if (!email) {
        message.textContent = "Please enter your email address first.";
        message.style.color = "red";
        return;
    }

    try {
        message.textContent = "Sending password reset email...";
        message.style.color = "blue";

        await resetPassword(email);

        message.textContent =
            "Password reset email requested. Please check your inbox.";

        message.style.color = "green";

    } catch (error) {
        message.textContent = error.message;
        message.style.color = "red";
    }
});
