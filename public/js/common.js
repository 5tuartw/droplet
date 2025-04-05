// --- public/js/common.js ---

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function displayUserInfo() {
    const userEmailDisplay = document.getElementById('user-email-display'); // Get element inside function
    const userInfoString = sessionStorage.getItem('userInfo');
    if (userInfoString) {
        try {
            const userInfo = JSON.parse(userInfoString);
            if (userEmailDisplay && userInfo.email) {
                userEmailDisplay.textContent = `Logged in as: ${userInfo.email}`;
            } else if (userEmailDisplay) {
                userEmailDisplay.textContent = ''; // Clear if email missing
            }
        } catch(e) {
            console.error("Error parsing userInfo", e);
            if (userEmailDisplay) userEmailDisplay.textContent = ''; // Clear on error
        }
    } else {
        if (userEmailDisplay) userEmailDisplay.textContent = ''; // Clear if no info
    }
}

function setupCommonEventListeners() {
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            console.log('Logging out...');
            try { await fetch('/api/token/revoke', { method: 'POST' }); }
            catch(error) { console.error("Revoke call failed:", error); }
            finally {
                sessionStorage.removeItem('accessToken');
                sessionStorage.removeItem('userInfo');
                window.location.href = '/';
            }
        });
    } else {
         console.warn("Logout button not found on this page.");
    }

    // Add other common listeners here if needed later
}

// Call setup function when DOM is ready
if (document.readyState === 'loading') { // Loading hasn't finished yet
    document.addEventListener('DOMContentLoaded', setupCommonEventListeners);
} else { // `DOMContentLoaded` has already fired
    setupCommonEventListeners();
}

// Note: displayUserInfo() needs to be called separately by each page's script
// after potentially getting userInfo during login/page load.