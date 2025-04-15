// --- public/js/common.js ---

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Helper to get and parse user info from sessionStorage
function getUserInfo() {
    const userInfoString = sessionStorage.getItem('userInfo');
    if (!userInfoString) {
      return null; // Not logged in or info not stored
    }
    try {
      return JSON.parse(userInfoString); // Parse the stored JSON string
    } catch (error) {
      console.error("Error parsing user info from sessionStorage:", error);
      return null; // Handle potential JSON parsing errors
    }
}

function displayUserInfo() {
    const userEmailDisplay = document.getElementById('user-email-display');
    const userInfo = getUserInfo(); // Use the helper function

    if (userEmailDisplay) { // Check element exists first
        if (userInfo && userInfo.email) {
            // Use escapeHtml just in case email contains special characters
            userEmailDisplay.textContent = `Logged in as: ${escapeHtml(userInfo.email)}`;
        } else {
            userEmailDisplay.textContent = ''; // Clear if no info/email
        }
    }
}

function displayAdminControls() {
    console.log("--- DisplayAdminControls called ---");
    const userInfo = getUserInfo();
    const adminLinkId = 'admin-link'; // The ID we will GIVE the admin link
  
    // Check if the admin link we intend to add already exists (idempotency)
    if (document.getElementById(adminLinkId)) {
        console.log(`Admin link (${adminLinkId}) already exists, skipping add.`);
        return;
    }
  
    const isAdmin = userInfo && userInfo.role === 'admin';
    console.log(`Is Admin Check (userInfo && userInfo.role === 'admin'):`, isAdmin);
  
    if (isAdmin) {
      // Find the container where nav links reside
      const navLinksContainer = document.querySelector('.nav-links'); // Find the parent div
  
      if (navLinksContainer) {
        // Create the new admin link element
        const adminLink = document.createElement('a');
        adminLink.id = adminLinkId; // Assign the unique ID
        adminLink.href = '/admin'; // <<< Set the correct URL for your admin page
        adminLink.title = 'Admin Panel';
        adminLink.innerHTML = '🏫'; // The school emoji
        adminLink.classList.add('nav-icon-button'); // Match style? Add other classes as needed
        adminLink.classList.add('admin-panel-link');
        adminLink.style.marginLeft = '0.5rem'; // Match style? Add other styles
  
        // Append the admin link to the container (e.g., before the logout button)
        const logoutButton = document.getElementById('logout-button');
        if(logoutButton) {
            navLinksContainer.insertBefore(adminLink, logoutButton); // Insert before logout
        } else {
            navLinksContainer.appendChild(adminLink); // Fallback: append to end
        }
  
        console.log("Admin Panel link ADDED to header.");
  
      } else {
        // Log a warning if we can't find the container
        console.warn("Could not find element with class '.nav-links' to insert Admin Panel link into.");
      }
    } else {
       console.log("User is not admin OR userInfo is null, Admin Panel link NOT added.");
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

// Function to apply fetched settings to the page (Move this here from drops.js)
function applySettings(settings) {
    const prefs = settings?.preferences;
    console.log("Common: Applying settings:", prefs);
    // Define defaults clearly
    const defaultTheme = 'default';
    const defaultLayout = '2 columns'; // Default layout value from your settings options

    // --- Apply Theme ---
    const theme = prefs?.color_theme || defaultTheme;
    document.body.dataset.theme = theme;
    console.log(`Common: Theme set to data-theme="${theme}"`);

    // --- Apply Layout ---
    const layout = prefs?.layout_pref || defaultLayout;
    const bodyElement = document.body;

    if (bodyElement) {
         // Generate class name from layout preference value
         // Replace spaces with hyphens, make lowercase, prefix with 'layout-'
        const layoutClassName = `layout-${layout.replace(/\s+/g, '-').toLowerCase()}`;
        // e.g., "list" -> "layout-list", "2 columns" -> "layout-2-columns"

        // List of possible layout classes to manage
        const possibleLayoutClasses = ['layout-list', 'layout-2-columns', 'layout-3-columns'];

        // Remove any existing layout classes first
        bodyElement.classList.remove(...possibleLayoutClasses); // Use spread syntax to remove all

        // Add the new class if it's one of the known valid ones
        if (possibleLayoutClasses.includes(layoutClassName)) {
            bodyElement.classList.add(layoutClassName);
            console.log(`Common: Layout class added to body: ${layoutClassName}`);
        } else {
            // Apply default if saved layout is somehow invalid
             const defaultLayoutClassName = `layout-${defaultLayout.replace(/\s+/g, '-').toLowerCase()}`;
             bodyElement.classList.add(defaultLayoutClassName);
             console.warn(`Invalid layout preference "${layout}", applied default: ${defaultLayoutClassName}`);
        }
    }  
}

// --- Fetch Settings and Apply on Load ---

// API Fetch Function Helper
// Automatically adds Authorization header and handles common responses/errors
async function fetchApi(url, options = {}) {
    const token = sessionStorage.getItem('accessToken');

    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    // Add Authorization header only if token exists
    const headers = { ...defaultHeaders, ...options.headers };
    if (token) {
         headers['Authorization'] = `Bearer ${token}`;
    } else {
         // If auth is strictly required for the endpoint, the server will return 401 anyway.
         // Log warning if calling protected endpoint without token.
         if (!url.includes('/api/login')) { // Don't warn for login attempt
             console.warn(`WorkspaceApi: No access token found for request to ${url}`);
         }
    }

    const config = {
        ...options, // Add/override method, body etc.
        headers: headers,
    };

    // console.log(`Workspaceing API: ${url} with method: ${config.method || 'GET'}`); // Optional debug log

    const response = await fetch(url, config);

    // Handle 401 Unauthorized specifically - redirect to login
    if (response.status === 401) {
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('userInfo');
        console.error("API request failed with 401 (Unauthorized). Redirecting to login.");
        window.location.href = '/'; // Force login
        // Throw error to stop the calling function from proceeding
        throw new Error("Unauthorized session, redirected to login.");
    }

    // Handle other non-successful responses
    if (!response.ok) {
        let errorDetail = `API request failed (Status: ${response.status})`;
        try {
            // Try to parse JSON error body from backend
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const errData = await response.json();
                if (errData && errData.error) {
                     errorDetail += `: ${errData.error}`; // Add backend error message
                }
            } else {
                 // If no JSON, maybe get text? But often status is enough.
                 // errorDetail += `: ${await response.text()}`;
            }
        } catch (e) { /* Ignore parsing errors on top of HTTP error */ }
        throw new Error(errorDetail); // Throw error to be caught by caller
    }

    // Handle successful responses with no content
    if (response.status === 204) {
        return undefined; // Indicate success with no data
    }

    // Try to parse JSON body for successful responses with content
    try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return response.json(); // Return parsed JSON data
        } else {
            return undefined; // Return undefined for non-JSON success responses
        }
    } catch (e) {
         console.error(`Error parsing JSON response from ${url}:`, e);
         throw new Error(`Invalid JSON response received from server.`); // Throw error if JSON parsing fails on success response
    }
}
// --- End of fetchApi function definition ---

// This function runs automatically when common.js loads (via initializeCommon)
async function loadAndApplySettings() {
    console.log("Common: Attempting to load settings...");
    // Only try to fetch if an access token exists
    if (!sessionStorage.getItem('accessToken')) {
         console.log("Common: No access token, applying default settings.");
         applySettings(null); // Apply default styles if not logged in
         return;
    }

    try {
        // fetchApi should be defined in this file or included before it
        const settingsData = await fetchApi('/api/settings/me'); // Fetch combined settings
        applySettings(settingsData); // Apply fetched settings (or defaults if fetch returns nothing)

    } catch (error) {
        // Handle errors fetching settings (fetchApi might redirect on 401)
        // We don't want to break page load, just log error & apply defaults
        console.error("Common: Error fetching settings:", error);
        applySettings(null); // Apply default styles if fetch fails
    }
}

// --- Run Initialization ---
// (Keep the existing initializeCommon function and its call via DOMContentLoaded)
function initializeCommon() {
    console.log("InitializeCommon called at:", new Date().toLocaleTimeString()); //debug
    displayUserInfo(); // Display user info if available
    setupCommonEventListeners(); // Set up logout etc.
    loadAndApplySettings();
    displayAdminControls(); 

}

if (document.readyState === 'loading') {
   document.addEventListener('DOMContentLoaded', initializeCommon);
} else {
   initializeCommon();
}