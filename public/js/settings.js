// Wait for the DOM to be ready
document.addEventListener('DOMContentLoaded', () => {

    console.log("Settings page loaded.");

    // --- Element Getters for Settings Page ---
    const preferencesForm = document.getElementById('preferences-form');
    const themeOptionsDiv = document.getElementById('theme-options'); // Container for theme radios
    const layoutOptionsDiv = document.getElementById('layout-options'); // Container for layout radios
    const prefsMessageArea = document.getElementById('prefs-message-area');
    // Subscriptions Form
    const subscriptionsForm = document.getElementById('subscriptions-form');
    const divisionSubsDiv = document.getElementById('division-subscriptions');
    const yeargroupSubsDiv = document.getElementById('yeargroup-subscriptions');
    const classSubsDiv = document.getElementById('class-subscriptions');
    const subsMessageArea = document.getElementById('subs-message-area');
    // Common Navbar Elements (if needed here, but displayUserInfo/logout handled by common.js)
    // const userEmailDisplay = document.getElementById('user-email-display');
    // const logoutButton = document.getElementById('logout-button');

    // Change password elements
    // Get references to the DOM elements
    const changePasswordForm = document.getElementById('changePasswordForm');
    const oldPasswordInput = document.getElementById('oldPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const retypeNewPasswordInput = document.getElementById('retypeNewPassword');
    const requirementsText = document.getElementById('passwordRequirements');
    const errorDiv = document.getElementById('passwordError');
    const successDiv = document.getElementById('passwordSuccess');

    // --- Utility Functions ---
    // Assuming escapeHtml is in common.js, otherwise define it here
    // function escapeHtml(unsafe) { /* ... */ }

    // Helper to get the correct name field based on item type
    function getItemName(item, type) {
        const itemId = item.id;
        const fallbackName = `${type} ID: ${itemId !== undefined ? itemId : 'Unknown'}`;

        if (type === 'Division') return item.division_name || fallbackName;
        if (type === 'YearGroup') return item.year_group_name || fallbackName;
        if (type === 'Class') return item.class_name || fallbackName;
        return item.name || fallbackName; // Use snake_case name field
    }

    // --- Functions to Populate UI ---
    function populatePreferencesForm(preferences) {
        console.log("Populating preferences form with:", preferences);
        const themeValue = preferences?.color_theme || 'default';
        const defaultLayout = '2 columns'; // Check HTML value attribute
        const layoutValue = preferences?.layout_pref || defaultLayout;
        try {
            const themeRadio = document.querySelector(`input[name="colorTheme"][value="${themeValue}"]`);
            if (themeRadio) themeRadio.checked = true;
            else document.querySelector('input[name="colorTheme"][value="default"]').checked = true;
        } catch (e) { console.error("Error setting theme radio:", e); }
        try {
            const layoutRadio = document.querySelector(`input[name="layoutPref"][value="${layoutValue}"]`);
            if (layoutRadio) layoutRadio.checked = true;
            else document.querySelector(`input[name="layoutPref"][value="${defaultLayout}"]`).checked = true;
        } catch (e) { console.error("Error setting layout radio:", e); }
    }

    function populateSubscriptionCheckboxes(type, items, currentSubscriptions, containerDiv) {
        // console.log(`Populating checkboxes for ${type}`); // Keep console logs minimal unless debugging
        if (!containerDiv) return;
        containerDiv.innerHTML = '';
        if (!items || items.length === 0) { containerDiv.innerHTML = `<p>No ${type}s available.</p>`; return; }

        const subscribedSet = new Set();
        if (currentSubscriptions) {
            currentSubscriptions.forEach(sub => {
                if (sub && sub.type !== undefined && sub.id !== undefined) { subscribedSet.add(`${sub.type}-${sub.id}`); }
            });
        }

        items.forEach(item => {
            const itemId = item.id;
            if (itemId === undefined || itemId === null) return;
            const itemType = type; // Use the type passed to the function
            const checkboxId = `${itemType}-${itemId}`;
            const subscriptionKey = `${itemType}-${itemId}`; // Assumes currentSubscriptions uses same casing/format
            const isChecked = subscribedSet.has(subscriptionKey);
            const displayName = getItemName(item, itemType);
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = checkboxId;
            checkbox.value = itemId;
            checkbox.checked = isChecked;
            checkbox.dataset.targetType = itemType;
            checkbox.classList.add('subscription-checkbox');
            label.htmlFor = checkboxId;
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(` ${escapeHtml(displayName)}`));
            containerDiv.appendChild(label);
        });
    }

    // --- Function to Load All Initial Data for Settings Form ---
    async function loadInitialSettingsDataForForm() {
        console.log("Settings Page: Loading initial data...");
        // Clear messages and show loading states (optional refinement)
        if(prefsMessageArea) prefsMessageArea.textContent = '';
        if(subsMessageArea) subsMessageArea.textContent = '';
        if(divisionSubsDiv) divisionSubsDiv.innerHTML = '<p>Loading...</p>';
        if(yeargroupSubsDiv) yeargroupSubsDiv.innerHTML = '<p>Loading...</p>';
        if(classSubsDiv) classSubsDiv.innerHTML = '<p>Loading...</p>';

        try {
            // Assumes fetchApi helper is in common.js
            const [settingsData, divisions, yearGroups, classes] = await Promise.all([
                fetchApi('/api/settings/me'),
                fetchApi('/api/divisions'),
                fetchApi('/api/yeargroups'),
                fetchApi('/api/classes')
            ]);

            populatePreferencesForm(settingsData?.preferences);
            populateSubscriptionCheckboxes('Division', divisions, settingsData?.subscriptions, divisionSubsDiv);
            populateSubscriptionCheckboxes('YearGroup', yearGroups, settingsData?.subscriptions, yeargroupSubsDiv);
            populateSubscriptionCheckboxes('Class', classes, settingsData?.subscriptions, classSubsDiv);

        } catch (error) {
            console.error("Failed to load initial settings page data:", error);
            const mainErrorDiv = document.getElementById('error-message'); // Use main error div if available
             if (mainErrorDiv) mainErrorDiv.textContent = `Error loading settings page data: ${error.message}.`;
             else if(prefsMessageArea) prefsMessageArea.textContent = `Error loading settings data.`; // Fallback
            // Update loading placeholders
             if(divSubs) divSubs.innerHTML = '<p style="color: red;">Error loading.</p>';
             if(ygSubs) ygSubs.innerHTML = '<p style="color: red;">Error loading.</p>';
             if(clsSubs) clsSubs.innerHTML = '<p style="color: red;">Error loading.</p>';
        }
    }

    // --- Handler Functions for Saving ---
    async function handleSavePreferences(event) {
        event.preventDefault();
        const submitButton = preferencesForm?.querySelector('button[type="submit"]');
        if (!prefsMessageArea) return;
        prefsMessageArea.textContent = '';
        prefsMessageArea.classList.remove('success-message', 'error-message');
        if (submitButton) submitButton.disabled = true;

        try {
            const selectedThemeRadio = document.querySelector('input[name="colorTheme"]:checked');
            const selectedLayoutRadio = document.querySelector('input[name="layoutPref"]:checked');
            if (!selectedThemeRadio || !selectedLayoutRadio) throw new Error("Please select options.");

            const payload = {
                color_theme: selectedThemeRadio.value,
                layout_pref: selectedLayoutRadio.value
            };
            console.log("Saving preferences:", payload);
            await fetchApi('/api/settings/me/preferences', { method: 'PUT', body: JSON.stringify(payload) });
            prefsMessageArea.textContent = 'Preferences saved!';
            prefsMessageArea.classList.add('success-message');
            setTimeout(() => { /* clear message */ }, 3000);
             // Also apply settings immediately to the current page
             applySettings({ preferences: payload }); // Assuming applySettings is in common.js

        } catch (error) {
            console.error("Error saving preferences:", error);
            prefsMessageArea.textContent = `Error: ${error.message}`;
            prefsMessageArea.classList.add('error-message');
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    }

    async function handleSaveSubscriptions(event) {
        event.preventDefault();
        const submitButton = subscriptionsForm?.querySelector('button[type="submit"]');
        if (!subsMessageArea) return;
        subsMessageArea.textContent = '';
        subsMessageArea.classList.remove('success-message', 'error-message');
        if (submitButton) submitButton.disabled = true;

        try {
            const checkedCheckboxes = subscriptionsForm.querySelectorAll('.subscription-checkbox:checked');
            const updatedSubscriptions = [];
            checkedCheckboxes.forEach(checkbox => {
                const type = checkbox.dataset.targetType;
                const idValue = checkbox.value;
                if (type && idValue !== undefined && idValue !== null && idValue !== "") {
                    updatedSubscriptions.push({ type: type, id: parseInt(idValue, 10) });
                }
            });

            const payload = { targets: updatedSubscriptions };
            console.log("Saving subscriptions:", payload);
            await fetchApi('/api/settings/me/subscriptions', { method: 'PUT', body: JSON.stringify(payload) });
            subsMessageArea.textContent = 'Subscriptions saved!';
            subsMessageArea.classList.add('success-message');
            setTimeout(() => { /* clear message */ }, 3000);

        } catch (error) {
            console.error("Error saving subscriptions:", error);
            subsMessageArea.textContent = `Error: ${error.message}`;
            subsMessageArea.classList.add('error-message');
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    }

    // --- 1. Define Password Requirements (Mirror Backend) ---
    // Adjust these values based on auth.ValidatePassword function
    const minPasswordLength = 8;
    const requiresUppercase = true;
    const requiresLowercase = true;
    const requiresDigit = true;
    // Build the requirements string
    let requirementsString = `Password must be at least ${minPasswordLength} characters long`;
    const requirementsParts = [];
    if (requiresUppercase) requirementsParts.push("uppercase letters");
    if (requiresLowercase) requirementsParts.push("lowercase letters");
    if (requiresDigit) requirementsParts.push("numbers");
    if (requirementsParts.length > 0) {
        requirementsString += `, including ${requirementsParts.join(', ')}.`;
    }
    // Display the requirements
    requirementsText.textContent = requirementsString;

    // Helper function to display errors
    function showError(message) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        successDiv.style.display = 'none'; // Hide success message if error occurs
    }

    // Helper function to display success
    function showSuccess(message) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        errorDiv.style.display = 'none'; // Hide error message on success
    }

    // --- 2. Add Form Submit Event Listener ---
    changePasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default HTML form submission

        // Clear previous messages
        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';

        // Get current values
        const oldPassword = oldPasswordInput.value;
        const newPassword = newPasswordInput.value;
        const retypeNewPassword = retypeNewPasswordInput.value;

        // --- 3. Client-Side Validation ---
        if (!oldPassword || !newPassword || !retypeNewPassword) {
            showError('Please fill in all password fields.');
            return;
        }

        if (newPassword !== retypeNewPassword) {
            showError('New passwords do not match.');
            return;
        }

        // Basic complexity/policy checks (mirror backend auth.ValidatePassword)
        let policyError = null;
        if (newPassword.length < minPasswordLength) {
            policyError = `Password must be at least ${minPasswordLength} characters long.`;
        } else if (requiresUppercase && !/[A-Z]/.test(newPassword)) {
            policyError = 'Password must contain at least one uppercase letter.';
        } else if (requiresLowercase && !/[a-z]/.test(newPassword)) {
            policyError = 'Password must contain at least one lowercase letter.';
        } else if (requiresDigit && !/\d/.test(newPassword)) {
            policyError = 'Password must contain at least one number.';
        }
        // Add checks for special characters here if implemented later

        if (policyError) {
            showError(`New password does not meet requirements: ${policyError}`);
            return;
        }

        function getAuthToken() {
            return sessionStorage.getItem('accessToken'); // Use the same key 'accessToken'
        }

        // --- 4. Prepare and Send API Request ---
        const requestBody = {
            "current_password": oldPassword, 
            "new_password": newPassword
        };

        try {
            // Use fetchApi helper - it handles Auth header and non-ok responses
            // Expecting 204, fetchApi returns undefined for that
            await fetchApi('/api/users/me/password', {
                method: 'PUT',
                body: JSON.stringify(requestBody)
                // No need to set Content-Type/Authorization headers, fetchApi does it
            });
     
            // If fetchApi didn't throw an error, it was successful (2xx)
            showSuccess('Password updated successfully!');
            changePasswordForm.reset(); // Clear the form fields
     
        } catch (error) {
            // fetchApi throws an error for non-ok responses (already formatted)
            // or network errors. It handles 401 redirect already.
            console.error('Password change failed:', error);
     
            // Customize error message based on status code if needed,
            // although fetchApi might already provide a decent message in error.message
            let displayMessage = error.message; // Use message from fetchApi's error
            if (error.message.includes("400")) { // Basic check, might need refinement
                 displayMessage = 'Incorrect old password, or new password does not meet requirements.';
            } else if (error.message.includes("403")) { // Should not happen for /me/ path usually
                 displayMessage = 'Authorization error.';
            } else if (error.message.includes("500")) {
                 displayMessage = 'An unexpected server error occurred.';
            }
            // You might not need these specific checks if fetchApi provides good error messages
     
            showError(displayMessage);
        }
    });

    // --- Event Listeners Setup ---
    if (preferencesForm) { preferencesForm.addEventListener('submit', handleSavePreferences); }
    if (subscriptionsForm) { subscriptionsForm.addEventListener('submit', handleSaveSubscriptions); }
    // Note: Logout listener should be handled by common.js

    // --- Initial Page Load Actions ---
    loadInitialSettingsDataForForm(); // Fetch data and populate the settings form

}); // <-- End of DOMContentLoaded listener