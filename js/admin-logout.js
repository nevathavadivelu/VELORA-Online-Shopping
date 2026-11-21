
document.addEventListener("click", function (event) {

    const logoutButton = event.target.closest("#adminLogout");

    if (!logoutButton) return;

    event.preventDefault();

    const confirmLogout = confirm(
        "Are you sure you want to logout?"
    );

    if (!confirmLogout) return;

    // Clear the logged-in session
    sessionStorage.removeItem("customerId");
    sessionStorage.removeItem("customerEmail");
    sessionStorage.removeItem("customerToken");
    sessionStorage.removeItem("customerRefreshToken");

    // Redirect to customer login page
    window.location.replace("../customer/login.html");

});
