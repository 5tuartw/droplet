// --- Element Getters ---
const dropsListDiv = document.getElementById('drops-list');
const errorMessageDiv = document.getElementById('error-message');
const userEmailDisplay = document.getElementById('user-email-display');
const logoutButton = document.getElementById('logout-button');
const viewMyDropsBtn = document.getElementById('view-my-drops-btn');
const viewAllDropsBtn = document.getElementById('view-all-drops-btn');
const mainTitle = document.querySelector('.main-content h1'); // Get the H1 title element

// --- State variable ---
let currentView = 'my'; // Default to 'my' drops

// --- Utility to prevent basic HTML injection ---
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return ''; // Ensure input is a string
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// --- Display User Email from Session Storage ---
function displayUserInfo() {
     const userInfoString = sessionStorage.getItem('userInfo');
     if (userInfoString) {
         try {
             const userInfo = JSON.parse(userInfoString);
             if (userEmailDisplay && userInfo.email) {
                 userEmailDisplay.textContent = `Logged in as: ${userInfo.email}`;
             }
         } catch(e) { console.error("Error parsing userInfo from sessionStorage", e); }
     } else {
         if (userEmailDisplay) userEmailDisplay.textContent = '';
     }
}

// --- Function to set active button/state and Title ---
function setActiveView(view) {
    currentView = view; // Update the state
    if (!viewMyDropsBtn || !viewAllDropsBtn || !mainTitle) {
        console.error("Required elements for view toggle not found!");
        return; // Avoid errors if elements are missing
    }
    if (view === 'my') {
        viewMyDropsBtn.classList.add('active');
        viewAllDropsBtn.classList.remove('active');
        mainTitle.textContent = 'Drops for Me'; // Update title
    } else {
        viewMyDropsBtn.classList.remove('active');
        viewAllDropsBtn.classList.add('active');
        mainTitle.textContent = 'Drops for Anyone'; // Update title
    }
}

// --- Main Fetch and Display Function ---
async function fetchAndDisplayDrops() {
    errorMessageDiv.textContent = ''; // Clear previous errors
    dropsListDiv.innerHTML = '<p>Loading drops...</p>'; // Show loading message
    const token = sessionStorage.getItem('accessToken');

    // 1. Check for Authentication Token
    if (!token) {
         errorMessageDiv.textContent = 'Authentication token not found. Redirecting to login...';
         console.log('No token found in sessionStorage, redirecting.');
         window.location.href = '/'; return;
    }

    // 2. Determine API endpoint
    const apiUrl = (currentView === 'my') ? '/api/mydrops' : '/api/drops';
    console.log(`Workspaceing ${apiUrl} (View: ${currentView})...`);

    try {
        // 3. Fetch data
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // 4. Handle Auth Errors
        if (response.status === 401) {
            console.log('Token invalid (401). Redirecting...');
            sessionStorage.removeItem('accessToken'); sessionStorage.removeItem('userInfo');
            errorMessageDiv.textContent = 'Session expired. Please log in again.';
            window.location.href = '/'; return;
        }

        // 5. Handle other HTTP errors
        if (!response.ok) {
            let errorDetail = `HTTP error! status: ${response.status}`;
             try { const errorData = await response.json(); if (errorData && errorData.error) { errorDetail += `: ${errorData.error}`; } } catch(e) {}
             throw new Error(errorDetail);
        }

        // 6. Parse JSON
        const drops = await response.json();

        // --- 7. Display Logic ---
        dropsListDiv.innerHTML = ''; // Clear loading/previous content
        if (drops && drops.length > 0) {
            const ul = document.createElement('ul');
            const userInfoString = sessionStorage.getItem('userInfo');
            let currentUser = null;
            if (userInfoString) { try { currentUser = JSON.parse(userInfoString); } catch(e){ console.error("Error parsing user info", e); } }

            drops.forEach(drop => {
                const li = document.createElement('li');

                // Extract data using lowercase JSON keys
                const title = drop.title || 'Untitled Drop';
                const content = drop.content || '';
                const postDate = (drop.post_date && !drop.post_date.startsWith('0001-01-01')) ? new Date(drop.post_date).toLocaleDateString() : 'N/A';
                const expireDate = (drop.expire_date && !drop.expire_date.startsWith('0001-01-01')) ? new Date(drop.expire_date).toLocaleDateString() : 'Never';

                // Generate Target Badges HTML
                let targetsHtml = '';
                if (drop.targets && drop.targets.length > 0) { // Use lowercase 'targets'
                    targetsHtml = drop.targets.map(target => {
                        let badgeClass = 'target-general';
                        const typeLower = target.type ? target.type.toLowerCase() : 'general'; // Use lowercase 'type'
                        if (typeLower === 'division') badgeClass = 'target-division';
                        else if (typeLower === 'yeargroup') badgeClass = 'target-yeargroup';
                        else if (typeLower === 'class') badgeClass = 'target-class';
                        else if (typeLower === 'student') badgeClass = 'target-student';
                        else if (typeLower === 'custom') badgeClass = 'target-custom';
                        else if (typeLower === 'general') badgeClass = 'target-general';
                        const targetDisplay = target.name || target.type || 'Target'; // Use lowercase 'name', 'type'
                        return `<span class="target-badge ${badgeClass}">${escapeHtml(targetDisplay)}</span>`;
                    }).join('');
                }

                // Determine if Action Buttons should be shown (Author or Admin)
                let showActions = false;
                if (currentUser) {
                    if (currentUser.role && currentUser.role.toLowerCase() === 'admin') {
                        showActions = true;
                    } else if (currentUser.id === drop.user_id) { // Use lowercase 'user_id'
                         showActions = true;
                    }
                }
                const actionsHtml = showActions ? `
                    <div class="drop-actions">
                        <button class="edit-btn" onclick="editDrop('${escapeHtml(drop.id)}')" title="Edit Drop">✏️</button>
                        <button class="delete-btn" onclick="deleteDrop('${escapeHtml(drop.id)}')" title="Delete Drop">🗑️</button>
                    </div>` : '';

                // Optionally get Creator Info (requires backend sending user_email)
                const creatorInfo = (currentView === 'all' && drop.user_email) ? ` | By: ${escapeHtml(drop.user_email)}` : ''; // Use lowercase 'user_email'

                // Construct List Item HTML **(Ensuring creatorInfo is defined)**
                li.innerHTML = `
                    <div class="drop-header">
                        <div>
                            <span class="drop-title">${escapeHtml(title)}</span>
                            ${targetsHtml}
                        </div>
                        ${actionsHtml}
                    </div>
                    <div class="drop-content">${escapeHtml(content)}</div>
                    <div class="drop-meta">Posted: ${postDate} | Expires: ${expireDate}${creatorInfo}</div>
                `;
                ul.appendChild(li);
            }); // End drops.forEach

            dropsListDiv.appendChild(ul); // Add list to DOM
        } else {
            // Handle empty drops list
            dropsListDiv.innerHTML = `<p>${(currentView === 'my') ? 'You have no drops yet. Click "+ New Drop" to create one!' : 'There are no active drops.'}</p>`;
        }
        // --- End Display Logic ---

    } catch (error) {
        // 8. Handle Fetch/Processing Errors
        console.error(`Error fetching ${currentView} drops:`, error);
        errorMessageDiv.textContent = `Failed to load ${currentView} drops: ${error.message}`;
        dropsListDiv.innerHTML = `<p style="color: red;">Could not load ${currentView} drops.</p>`;
    }
} // <-- End of fetchAndDisplayDrops


// --- Add Event Listeners to Toggle Buttons ---
if (viewMyDropsBtn) {
    viewMyDropsBtn.addEventListener('click', () => {
        if (currentView !== 'my') { setActiveView('my'); fetchAndDisplayDrops(); }
    });
}
 if (viewAllDropsBtn) {
    viewAllDropsBtn.addEventListener('click', () => {
        if (currentView !== 'all') { setActiveView('all'); fetchAndDisplayDrops(); }
    });
}

// --- Add Logout Functionality ---
if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        console.log('Logging out...');
        try {
            await fetch('/api/token/revoke', { method: 'POST' });
        } catch(error) { console.error("Revoke call failed:", error); }
        finally { // Ensure cleanup happens regardless of revoke success
            sessionStorage.removeItem('accessToken');
            sessionStorage.removeItem('userInfo');
            window.location.href = '/';
        }
    });
}

// --- Placeholder functions for Edit/Create (Assign to window) ---
 window.editDrop = function(dropId) {
    alert(`Edit functionality for drop ${dropId} not implemented yet.`);
    console.log("Edit drop:", dropId);
}
 window.showCreateDropForm = function() {
     alert("Create new drop functionality not implemented yet.");
     console.log("Show create drop form");
}

// --- Add Delete Functionality (Assign to window) ---
 window.deleteDrop = async function(dropId) {
    if (!confirm('Are you sure you want to delete this drop?')) return;
    const token = sessionStorage.getItem('accessToken');
    if (!token) { window.location.href = '/'; return; }
    errorMessageDiv.textContent = '';
    try {
        const response = await fetch(`/api/drops/${dropId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401) { throw new Error('Session expired. Please log in again.'); }
        if (response.status === 403) { throw new Error('You do not have permission to delete this drop.'); }
        if (!response.ok && response.status !== 204) {
             let errorDetail = `Failed to delete (Status: ${response.status})`;
             try { const errorData = await response.json(); if (errorData && errorData.error) { errorDetail += `: ${errorData.error}`; } } catch(e){}
             throw new Error(errorDetail);
         }
         console.log(`Drop ${dropId} deleted successfully.`);
         fetchAndDisplayDrops(); // Refresh list
    } catch(error) {
         console.error('Error deleting drop:', error);
         errorMessageDiv.textContent = error.message;
    }
} // <-- End of deleteDrop


// --- Initial Page Load Actions ---
displayUserInfo();          // Show user email
setActiveView(currentView); // Set initial button state and title ('my')
fetchAndDisplayDrops();     // Fetch initial data ('my' drops)