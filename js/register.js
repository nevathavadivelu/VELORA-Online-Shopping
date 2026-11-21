
const registerForm = document.getElementById("registerForm");
const message = document.getElementById("message");

registerForm.addEventListener("submit", async function (event) {

    // Prevent page refresh
    event.preventDefault();

    // Get values from the form
    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword =
        document.getElementById("confirmPassword").value;

    // Check whether passwords match
    if (password !== confirmPassword) {
        message.textContent = "Passwords do not match!";
        message.style.color = "red";
        return;
    }

    try {

        message.textContent = "Creating your account...";
        message.style.color = "blue";

        // Step 1: Register customer in Firebase Authentication
        const userData = await registerUser(email, password);

        // Step 2: Save customer profile in Firestore
        await saveCustomerProfile({
            localId: userData.localId,
            idToken: userData.idToken,
            fullName: fullName,
            email: email
        });

        // Display success message
        message.textContent =
            "Account created successfully! You can now log in.";

        message.style.color = "green";

        // Clear form
        registerForm.reset();

    } catch (error) {

        console.error("Registration error:", error);

        message.textContent =
            error.message || "Registration failed. Please try again.";

        message.style.color = "red";
    }

});
