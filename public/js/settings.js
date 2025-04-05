// Wait for the DOM to be ready (good practice, even with defer)
document.addEventListener('DOMContentLoaded', () => {

    console.log("Settings page loaded.");

    // --- Element Getters ---
    // Preferences Form
    const preferencesForm = document.getElementById('preferences-form');
    const themeOptionsDiv = document.getElementById('theme-options'); // Container for theme radios
    const layoutOptionsDiv = document.getElementById('layout-options'); // Container for layout radios
    const prefsMessageArea = document.getElementById('prefs-message-area');
    // Subscriptions Form
    const subscriptionsForm = document.getElementById('subscriptions-form');
    const divisionSubsDiv = document.getElementById('division-subscriptions'); // Div to populate checkboxes
    const yeargroupSubsDiv = document.getElementById('yeargroup-subscriptions'); // Div to populate checkboxes
    const classSubsDiv = document.getElementById('class-subscriptions'); // Div to populate checkboxes
    const subsMessageArea = document.getElementById('subs-message-area');
    // Common (Navbar - assumes same IDs as drops.html)
    const userEmailDisplay = document.getElementById('user-email-display');
    const logoutButton = document.getElementById('logout-button');
    // Add getters for create drop button if keeping it in nav:
    // const showCreateModalButton = document.getElementById('show-create-modal-btn');

    // --- Utility Functions (Can move to common.js later) ---
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // Get the correct display name based on item type
    function getItemName(item, type) {
        // Use PascalCase ID (based on previous findings) for fallback name construction
        const itemId = item.ID;
        const fallbackName = `${type} ID: ${itemId !== undefined ? itemId : 'Unknown'}`;

        // *** VERIFY these property names match your actual API JSON response ***
        if (type === 'Division') {
            return item.DivisionName || fallbackName; // Expects DivisionName
        } else if (type === 'YearGroup') {
            return item.YearGroupName || fallbackName; // Expects YearGroupName
        } else if (type === 'Class') {
            return item.ClassName || fallbackName; // Expects ClassName (or maybe just Name?)
        } else if (type === 'Pupil') { // Included for completeness if ever needed
            const surname = item.Surname || '';     // Expects Surname
            const firstName = item.FirstName || ''; // Expects FirstName
            const name = `${surname}, ${firstName}`.trim();
            return (name === ',') ? `Pupil (ID: ${itemId !== undefined ? itemId : 'Unknown'})` : name;
        } else {
            // Fallback for any other types, potentially looks for a generic 'Name' field
            return item.Name || fallbackName; // Expects Name? Or should this error?
        }
    }

   // --- Implementation for Populating Preferences Form ---
   function populatePreferencesForm(preferences) {
       console.log("Populating preferences form with:", preferences);

       // Use default values if preferences object is null/undefined or fields are missing
       // Ensure these defaults match your backend/CSS defaults
       const themeValue = preferences?.color_theme || 'default';
       const layoutValue = preferences?.layout_pref || '2 columns'; // Match your default layout pref

       // Select theme radio button
       try {
           // Find the radio button with the correct name and value
           const themeRadio = document.querySelector(`input[name="colorTheme"][value="${themeValue}"]`);
           if (themeRadio) {
               themeRadio.checked = true; // Check the corresponding radio button
                console.log(`Set theme radio to: ${themeValue}`);
           } else {
               console.warn(`Could not find radio button for theme value: ${themeValue}. Checking default.`);
               // Fallback: ensure the default radio is checked if the saved value is somehow invalid
               const defaultThemeRadio = document.querySelector('input[name="colorTheme"][value="default"]');
               if (defaultThemeRadio) defaultThemeRadio.checked = true;
           }
       } catch (e) { console.error("Error setting theme radio:", e); }

       // Select layout radio button
       try {
           const layoutRadio = document.querySelector(`input[name="layoutPref"][value="${layoutValue}"]`);
           if (layoutRadio) {
               layoutRadio.checked = true;
                console.log(`Set layout radio to: ${layoutValue}`);
           } else {
               console.warn(`Could not find radio button for layout value: ${layoutValue}. Checking default.`);
               // Fallback: Check your default layout value here
                const defaultLayoutRadio = document.querySelector('input[name="layoutPref"][value="2 columns"]'); // Match default
                if (defaultLayoutRadio) defaultLayoutRadio.checked = true;
           }
       } catch (e) { console.error("Error setting layout radio:", e); }
   }


   // --- Implementation for Populating Subscription Checkboxes ---
   function populateSubscriptionCheckboxes(type, items, currentSubscriptions, containerDiv) {
       console.log(`Populating checkboxes for ${type} in`, containerDiv?.id);
       if (!containerDiv) {
           console.error(`Container div not found for type ${type}`);
           return; // Exit if container doesn't exist
       }
       containerDiv.innerHTML = ''; // Clear loading message or previous content

       if (!items || items.length === 0) {
           // Display message if no items of this type are available
           containerDiv.innerHTML = `<p>No ${type}s available to subscribe to.</p>`;
           return;
       }

       // Create a Set of currently subscribed keys ("Type-ID") for efficient lookup
       const subscribedSet = new Set();
       if (currentSubscriptions) {
           currentSubscriptions.forEach(sub => {
               // Ensure both type and id exist before adding to set
               if (sub && sub.type !== undefined && sub.id !== undefined) {
                    subscribedSet.add(`${sub.type}-${sub.id}`);
               }
           });
       }
       // console.log(`Current Subscriptions Set for check (${type}):`, subscribedSet); // Useful for debugging

       // Create checkboxes for all available items of this type
       items.forEach(item => {
           // Ensure item has an ID before proceeding
           const itemId = item.ID; // Assuming 'id' is the consistent key from backend lookup APIs
           if (itemId === undefined || itemId === null) {
               console.warn(`Item of type ${type} missing 'id':`, item);
               return; // Skip items without an ID
           }

           const checkboxId = `${type}-${itemId}`; // Unique ID for label/input pairing
           const subscriptionKey = `${type}-${itemId}`; // Key to check against the Set
           const isChecked = subscribedSet.has(subscriptionKey); // Check if currently subscribed

           const displayName = getItemName(item, type); // Use helper to get name

           const label = document.createElement('label');
           const checkbox = document.createElement('input');

           checkbox.type = 'checkbox';
           checkbox.id = checkboxId;
           checkbox.value = itemId; // Store ID in value
           checkbox.checked = isChecked; // Set checked state based on current subscriptions
           checkbox.dataset.targetType = type; // Store type for saving later
           checkbox.classList.add('subscription-checkbox'); // Add class for easier selection during save

           label.htmlFor = checkboxId; // Link label to checkbox for better accessibility/UX
           label.appendChild(checkbox);
           label.appendChild(document.createTextNode(` ${escapeHtml(displayName)}`)); // Add space before name

           containerDiv.appendChild(label); // Add label (containing checkbox and text) to the div
       });
   }

    // --- Preferences Form Submission Logic ---
    if (preferencesForm) {
        preferencesForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Stop default form submission
            const submitButton = preferencesForm.querySelector('button[type="submit"]');
            const messageArea = document.getElementById('prefs-message-area'); // Get message area
            if (!messageArea) return; // Exit if message area not found

            messageArea.textContent = ''; // Clear previous messages
            messageArea.classList.remove('success-message', 'error-message'); // Clear styling
            if (submitButton) submitButton.disabled = true; // Disable button while processing

            try {
                // 1. Get selected values from radio buttons
                const selectedThemeRadio = document.querySelector('input[name="colorTheme"]:checked');
                const selectedLayoutRadio = document.querySelector('input[name="layoutPref"]:checked');

                // Basic validation: Ensure something is selected (shouldn't happen if defaults are set)
                if (!selectedThemeRadio || !selectedLayoutRadio) {
                    throw new Error("Please ensure both a theme and a layout are selected.");
                }

                const themeValue = selectedThemeRadio.value;
                const layoutValue = selectedLayoutRadio.value;

                console.log(`Saving preferences: Theme=${themeValue}, Layout=${layoutValue}`);

                // 2. Prepare payload object (keys must match JSON tags in Go request struct)
                const payload = {
                    color_theme: themeValue,
                    layout_pref: layoutValue
                };

                // 3. Call the API using our fetchApi helper
                // The helper automatically adds the Authorization header
                await fetchApi('/api/settings/me/preferences', { // Ensure path is correct
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });

                // 4. Handle Success (fetchApi throws error on non-ok status)
                messageArea.textContent = 'Preferences saved successfully!';
                messageArea.classList.add('success-message');

                // Optional: Automatically clear success message after a few seconds
                setTimeout(() => {
                     // Check if the message is still the success one before clearing
                     if(messageArea.textContent === 'Preferences saved successfully!') {
                         messageArea.textContent = '';
                         messageArea.classList.remove('success-message');
                     }
                }, 3000); // 3 seconds

            } catch (error) {
                // 5. Handle Errors (from validation or API call)
                console.error("Error saving preferences:", error);
                messageArea.textContent = `Error saving preferences: ${error.message}`;
                messageArea.classList.add('error-message');
            } finally {
                // 6. Always re-enable the button
                if (submitButton) submitButton.disabled = false;
            }
        });
    } else {
         console.warn("Preferences form (#preferences-form) not found.");
    }
    // --- End Preferences Form Submission Logic ---

    // --- Subscriptions Form Submission Logic ---
    if (subscriptionsForm) {
        subscriptionsForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Stop default form submission
            const submitButton = subscriptionsForm.querySelector('button[type="submit"]');
            const messageArea = document.getElementById('subs-message-area'); // Message area specific to subscriptions
            if (!messageArea) return;

            messageArea.textContent = ''; // Clear previous messages
            messageArea.classList.remove('success-message', 'error-message');
            if (submitButton) submitButton.disabled = true; // Disable button

            try {
                // 1. Find all CHECKED checkboxes within the form
                // We added the 'subscription-checkbox' class to them earlier
                const checkedCheckboxes = subscriptionsForm.querySelectorAll('.subscription-checkbox:checked');

                // 2. Build the array of target objects to send
                const updatedSubscriptions = [];
                checkedCheckboxes.forEach(checkbox => {
                    const type = checkbox.dataset.targetType; // Get type from data attribute
                    const idValue = checkbox.value;          // Get ID from value attribute

                    // Basic validation just in case
                    if (type && idValue !== undefined && idValue !== null && idValue !== "") {
                         updatedSubscriptions.push({
                            type: type,
                            id: parseInt(idValue, 10) // Ensure ID is a number
                        });
                    } else {
                        // Should not happen if checkboxes are generated correctly
                        console.warn("Skipping checked checkbox with missing type or id:", checkbox);
                    }
                });

                console.log("Saving subscriptions payload:", { targets: updatedSubscriptions });

                // 3. Get Auth Token (redundant if fetchApi handles it, but good practice)
                const token = sessionStorage.getItem('accessToken');
                if (!token) { throw new Error('Authentication error. Please log in again.'); }

                // 4. Prepare final payload for the API
                const payload = {
                    targets: updatedSubscriptions // Backend expects {"targets": [...]}
                };

                // 5. Call the API endpoint using fetchApi helper
                await fetchApi('/api/settings/me/subscriptions', { // Ensure this path matches your backend route
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });

                // 6. Handle Success
                messageArea.textContent = 'Subscriptions saved successfully!';
                messageArea.classList.add('success-message');

                // Optional: Clear success message after a few seconds
                setTimeout(() => {
                     if(messageArea.textContent === 'Subscriptions saved successfully!') {
                         messageArea.textContent = '';
                         messageArea.classList.remove('success-message');
                     }
                }, 3000);

            } catch (error) {
                // 7. Handle Errors
                console.error("Error saving subscriptions:", error);
                messageArea.textContent = `Error saving subscriptions: ${error.message}`;
                messageArea.classList.add('error-message');
            } finally {
                // 8. Always re-enable button
                if (submitButton) submitButton.disabled = false;
            }
        });
    } else {
         console.warn("Subscriptions form (#subscriptions-form) not found.");
    }
    // --- End Subscriptions Form Submission Logic ---

    // --- API Fetch Function (Helper) ---
    // Simple wrapper around fetch to include Auth header and basic error check
    async function fetchApi(url, options = {}) {
        const token = sessionStorage.getItem('accessToken');
        if (!token) {
            console.error("No auth token found, redirecting to login.");
            window.location.href = '/'; // Redirect if no token
            throw new Error("Not authenticated"); // Prevent further execution
        }

        const defaultHeaders = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };

        const config = {
            ...options, // Merge options passed in (e.g., method, body)
            headers: {
                ...defaultHeaders,
                ...options.headers, // Allow overriding headers
            },
        };

        console.log(`Workspaceing API: ${url} with config:`, {method: config.method || 'GET'}); // Log request without body/headers for brevity

        const response = await fetch(url, config);

        if (response.status === 401) {
            // Handle expired token / force login
            sessionStorage.removeItem('accessToken');
            sessionStorage.removeItem('userInfo');
            console.error("API request failed with 401 (Unauthorized). Redirecting to login.");
            window.location.href = '/';
            throw new Error("Unauthorized"); // Prevent further execution
        }

        if (!response.ok) {
            // Try to get error details from body
            let errorDetail = `API request failed (Status: ${response.status})`;
            try {
                const errData = await response.json();
                if (errData && errData.error) { errorDetail += `: ${errData.error}`; }
            } catch (e) { /* Ignore if response is not JSON */ }
            throw new Error(errorDetail);
        }

        // Check content type before parsing JSON for potentially empty responses (e.g., 204)
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return response.json(); // Return parsed JSON data
        } else {
            return; // Return undefined for non-JSON or empty responses
        }
    }


    // --- Main Function to Load Initial Settings Data ---
    async function loadInitialSettings() {
        console.log("Loading initial settings data...");
        // Clear any previous messages
        prefsMessageArea.textContent = '';
        subsMessageArea.textContent = '';
        // Show loading states
        divisionSubsDiv.innerHTML = '<p>Loading divisions...</p>';
        yeargroupSubsDiv.innerHTML = '<p>Loading year groups...</p>';
        classSubsDiv.innerHTML = '<p>Loading classes...</p>';

        try {
            // Fetch all required data concurrently
            const [settingsData, divisions, yearGroups, classes] = await Promise.all([
                fetchApi('/api/settings/me'), // Fetch combined prefs and subs
                fetchApi('/api/divisions'),
                fetchApi('/api/yeargroups'),
                fetchApi('/api/classes')
            ]);

            console.log("Fetched Settings:", settingsData);
            console.log("Fetched Divisions:", divisions);
            console.log("Fetched Year Groups:", yearGroups);
            console.log("Fetched Classes:", classes);

            // TODO: Populate Preferences UI (using settingsData.preferences)
            populatePreferencesForm(settingsData?.preferences); // Use ?. for safety

            // TODO: Populate Subscription Checkboxes (using settingsData.subscriptions and the fetched lists)
            populateSubscriptionCheckboxes('Division', divisions, settingsData?.subscriptions, divisionSubsDiv);
            populateSubscriptionCheckboxes('YearGroup', yearGroups, settingsData?.subscriptions, yeargroupSubsDiv);
            populateSubscriptionCheckboxes('Class', classes, settingsData?.subscriptions, classSubsDiv);


        } catch (error) {
            console.error("Failed to load initial settings:", error);
            // Display error prominently
             if (errorMessageDiv) { // Use main page error div? Or specific ones?
                 errorMessageDiv.textContent = `Error loading settings: ${error.message}. Please try reloading.`;
             } else { // Fallback if main error div isn't on settings page
                 prefsMessageArea.textContent = `Error loading settings.`;
                 subsMessageArea.textContent = `Error loading settings.`;
             }
             // Clear loading states with error message
             divisionSubsDiv.innerHTML = '<p style="color: red;">Error loading divisions.</p>';
             yeargroupSubsDiv.innerHTML = '<p style="color: red;">Error loading year groups.</p>';
             classSubsDiv.innerHTML = '<p style="color: red;">Error loading classes.</p>';
        }
    }

    // --- Placeholder Functions for Populating UI (To be implemented next) ---
    function populatePreferencesForm(preferences) {
        console.log("Populating preferences form with:", preferences);
        const themeValue = preferences?.color_theme || 'default'; // Assuming 'default' is the value for the default theme radio

        // Ensure this string EXACTLY matches the 'value' attribute of your default layout radio button in settings.html
        const defaultLayout = '2 columns';
        // ---

        const layoutValue = preferences?.layout_pref || defaultLayout;

        // Set Theme Radio (Error handling included for robustness)
        try {
            const themeRadio = document.querySelector(`input[name="colorTheme"][value="${themeValue}"]`);
            if (themeRadio) themeRadio.checked = true;
            else { // Fallback to default if saved value is invalid/not found
                console.warn(`Could not find radio for theme: ${themeValue}. Setting default.`);
                document.querySelector('input[name="colorTheme"][value="default"]').checked = true;
            }
        } catch (e) { console.error("Error setting theme radio:", e); }

        // Set Layout Radio (Error handling included for robustness)
        try {
            // Use the variable 'layoutValue' which holds either the saved pref or the defaultLayout
            const layoutRadio = document.querySelector(`input[name="layoutPref"][value="${layoutValue}"]`);
            if (layoutRadio) {
                layoutRadio.checked = true;
            } else {
                // Fallback to the defined defaultLayout if saved value is invalid/not found
                console.warn(`Could not find radio for layout: ${layoutValue}. Setting default: ${defaultLayout}`);
                const defaultLayoutRadio = document.querySelector(`input[name="layoutPref"][value="${defaultLayout}"]`);
                if (defaultLayoutRadio) defaultLayoutRadio.checked = true;
                else { console.error(`Default layout radio button with value "${defaultLayout}" not found!`); }
            }
        } catch (e) { console.error("Error setting layout radio:", e); }
    }

    function populateSubscriptionCheckboxes(type, items, currentSubscriptions, containerDiv) {
        console.log(`Populating checkboxes for ${type} in`, containerDiv?.id);
        if (!containerDiv) return;
        containerDiv.innerHTML = ''; // Clear loading message
    
        if (!items || items.length === 0) {
            containerDiv.innerHTML = `<p>No ${type}s available.</p>`;
            return;
        }
    
        // Create a Set of currently subscribed keys ("Type-ID") for efficient lookup
        // **NOTE:** Assumes the 'currentSubscriptions' array from GET /api/settings/me
        // also uses consistent keys (e.g., lowercase 'type' and 'id'). Adjust if necessary.
        const subscribedSet = new Set();
        if (currentSubscriptions) {
            currentSubscriptions.forEach(sub => {
                if (sub && sub.type !== undefined && sub.id !== undefined) {
                     // Key uses lowercase type from backend response, and lowercase id from backend response
                     subscribedSet.add(`${sub.type}-${sub.id}`);
                }
            });
        }
        // console.log("Current Subscriptions Set:", subscribedSet); // Debug log
    
        // Create checkboxes for all available items of this type
        items.forEach(item => {
            // --- Use PascalCase 'ID' from the fetched item list ---
            const itemId = item.ID; // <-- Use PascalCase
            if (itemId === undefined || itemId === null) {
                console.warn(`Item of type ${type} missing 'ID':`, item);
                return; // Skip items without an ID
            }
            // ---
    
            // Use type name passed into function and PascalCase ID for DOM ID
            const itemType = type;
            const checkboxId = `${itemType}-${itemId}`;
    
            // --- Create key for checking subscription state ---
            // Uses itemType (e.g., "Class") and itemId (e.g., 101)
            // This MUST match the format used when creating subscribedSet above.
            // If subscribedSet uses lowercase 'type' and 'id', we need consistency.
            // Let's assume TargetInfo uses lowercase tags, matching subscribedSet.
            const subscriptionKey = `${itemType}-${itemId}`; // Does this match subscribedSet keys? Needs verification.
            // SAFER: Assume TargetInfo uses { type: "Class", id: 101 }
            // const subscriptionKey = `${itemType}-${itemId}`; // Let's stick with this, assuming TargetInfo matches item.ID type
    
            const isChecked = subscribedSet.has(subscriptionKey);
            // ---
    
            const displayName = getItemName(item, itemType); // getItemName already expects PascalCase item fields
    
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
    
            checkbox.type = 'checkbox';
            checkbox.id = checkboxId;
            checkbox.value = itemId; // <-- Set checkbox value using PascalCase itemId
            checkbox.checked = isChecked;
            checkbox.dataset.targetType = itemType; // Store type for saving later
            checkbox.classList.add('subscription-checkbox');
    
            label.htmlFor = checkboxId;
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(` ${escapeHtml(displayName)}`));
    
            containerDiv.appendChild(label);
        });
    }

    // --- Event Listeners Setup ---
    // Navbar listeners
    if (logoutButton) { logoutButton.addEventListener('click', async () => { /* ... logout logic ... */ }); }
    // Add listener for create drop button if it exists on this page

    // Settings Form listeners (To be implemented next)
    if (preferencesForm) { preferencesForm.addEventListener('submit', handleSavePreferences); }
    if (subscriptionsForm) { subscriptionsForm.addEventListener('submit', handleSaveSubscriptions); }


    // --- Initial Page Load Actions ---
    displayUserInfo();      // Display user email in navbar
    loadInitialSettings(); // Fetch data and populate the form

}); // <-- End of DOMContentLoaded listener


// --- Handler Functions (To be implemented next) ---
async function handleSavePreferences(event) {
    event.preventDefault();
    console.log("Save Preferences clicked");
    // TODO: Get selected theme/layout values
    // TODO: PUT data to /api/settings/me/preferences
    // TODO: Show success/error message in prefsMessageArea
}

async function handleSaveSubscriptions(event) {
    event.preventDefault();
    console.log("Save Subscriptions clicked");
    // TODO: Find all checked subscription checkboxes
    // TODO: Build targets array [{type, id}, ...]
    // TODO: PUT data to /api/settings/me/subscriptions
    // TODO: Show success/error message in subsMessageArea
}