// --- public/js/admin.js ---

// Wait for the DOM and common.js stuff (like getUserInfo) to be ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Admin page DOM loaded, verifying access...");

    // --- 1. Verify Admin Access ---
    // (Assumes getUserInfo is available globally from common.js)
    try {
        const userInfo = getUserInfo();
        if (!userInfo || userInfo.role !== 'admin') {
             console.error("Access Denied: User is not an admin or not logged in.");
             window.location.href = '/'; // Redirect non-admins or logged-out users
             return; // Stop execution
        }
        console.log("Admin access verified via stored userInfo.");

        // Alternative: Make an API call to be absolutely sure
        // console.log("Verifying admin status with API...");
        // await fetchApi('/api/users/me'); // fetchApi handles 401/403 redirect if needed
        // console.log("Admin access verified via API.");

        // --- 2. Initialize Admin Panel ---
        initializeAdminPanel();

    } catch (error) {
        // fetchApi might throw errors for non-OK statuses (other than 401 which it redirects)
        console.error("Failed to verify admin access:", error);
        // If the error wasn't a redirect one from fetchApi, redirect manually
        if (!error.message || !error.message.includes("Unauthorized")) {
            window.location.href = '/';
        }
    }
});

// --- Main Initialization Function ---
function initializeAdminPanel() {
    console.log("Initializing admin panel...");
    setupTabNavigation();
    setupActionButtons(); // Setup listeners for Add buttons etc.
    loadTeachers(); // Load data for the default active tab
}

// --- Tab Navigation Logic ---
function setupTabNavigation() {
    const tabContainer = document.querySelector('.view-toggle'); // Use the container class
    const tabPanes = document.querySelectorAll('.tab-pane');
    const tabButtons = document.querySelectorAll('.view-toggle .toggle-button'); // Select buttons within container

    if (!tabContainer) {
        console.error("Tab navigation container (.view-toggle) not found!");
        return;
    }

    tabContainer.addEventListener('click', (event) => {
        const clickedButton = event.target.closest('.toggle-button'); // Ensure we get the button even if clicking inside it
        if (!clickedButton) return; // Click wasn't on a button

        const targetId = clickedButton.dataset.tabTarget; // Get target pane ID (e.g., "#tab-teachers")
        if (!targetId) return;

        // Update button active states
        tabButtons.forEach(button => {
            button.classList.remove('active');
        });
        clickedButton.classList.add('active');

        // Update pane active states
        tabPanes.forEach(pane => {
            if (`#${pane.id}` === targetId) {
                pane.classList.add('active');
                // Optional: Load data for this tab if it wasn't loaded initially
                // Example: if (targetId === '#tab-pupils') loadPupils();
            } else {
                pane.classList.remove('active');
            }
        });
    });
}

// --- Load and Display Teachers ---
async function loadTeachers() {
    const container = document.getElementById('teachers-list-container');
    if (!container) return;

    container.innerHTML = '<p>Loading teachers...</p>'; // Show loading state

    try {
        // Assumes fetchApi is available globally from common.js
        const users = await fetchApi('/api/users'); // Fetch user list

        if (!users || !Array.isArray(users)) {
            throw new Error("Invalid response received for user list.");
        }

        if (users.length === 0) {
            container.innerHTML = '<p>No teachers found.</p>';
            return;
        }

        // Clear loading state
        container.innerHTML = '';

        // Create table
        const table = document.createElement('table');
        table.className = 'admin-table'; // Add class for potential styling

        // Create table header
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        const headers = ['Name', 'Email', 'Role', 'Actions'];
        headers.forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });

        // Create table body
        const tbody = table.createTBody();
        users.forEach(user => {
            const row = tbody.insertRow();

            // Combine name fields (using escapeHtml from common.js if available)
            const title = typeof escapeHtml === 'function' ? escapeHtml(user.Title) : user.Title;
            const firstName = typeof escapeHtml === 'function' ? escapeHtml(user.FirstName) : user.FirstName;
            const surname = typeof escapeHtml === 'function' ? escapeHtml(user.Surname) : user.Surname;
            const fullName = `${title || ''} ${firstName || ''} ${surname || ''}`.trim();

            row.insertCell().textContent = fullName || 'N/A';
            // Use PascalCase for these too:
            row.insertCell().textContent = typeof escapeHtml === 'function' ? escapeHtml(user.Email) : user.Email;
            row.insertCell().textContent = typeof escapeHtml === 'function' ? escapeHtml(user.Role) : user.Role;

            // Actions cell
            const actionsCell = row.insertCell();
            actionsCell.style.whiteSpace = 'nowrap';

            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.className = 'edit-btn action-button-small';
            editButton.dataset.userId = user.ID; // Use PascalCase ID
            editButton.style.marginRight = '5px';

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.className = 'delete-btn action-button-small delete';
            deleteButton.dataset.userId = user.ID; // Use PascalCase ID

            actionsCell.appendChild(editButton);
            actionsCell.appendChild(deleteButton);
        });

        container.appendChild(table);

        // Add event listeners for the newly created buttons (using delegation)
        setupTableActionListeners(container);

    } catch (error) {
        console.error("Failed to load teachers:", error);
        container.innerHTML = `<p class="error-message">Error loading teachers: ${error.message}</p>`;
    }
}

// --- Setup Event Listeners ---
function setupActionButtons() {
    const addTeacherButton = document.getElementById('add-teacher-button');
    if (addTeacherButton) {
        addTeacherButton.addEventListener('click', handleAddTeacherClick);
    }
    // Add listeners for other main action buttons if needed (e.g., Add Pupil)
    // const addPupilButton = document.getElementById('add-pupil-button');
    // if (addPupilButton) { addPupilButton.addEventListener('click', handleAddPupilClick); }
}

function setupTableActionListeners(tableContainer) {
    tableContainer.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('edit-btn')) {
            handleEditUserClick(target.dataset.userId);
        } else if (target.classList.contains('delete-btn')) {
            handleDeleteUserClick(target.dataset.userId);
        }
    });
}

// --- Action Handlers (Placeholders) ---
function handleAddTeacherClick() {
    console.log("Add Teacher button clicked");
    // TODO: Implement modal opening logic
    const modal = document.getElementById('add-teacher-modal');
    if (modal) {
        // Reset form fields potentially
        // document.getElementById('add-teacher-form').reset();
        modal.style.display = 'flex'; // Show modal (assuming flex for centering)

        // Add listener for close button within the modal
         const closeButton = modal.querySelector('.close-modal-button');
         if (closeButton) {
            closeButton.onclick = () => { modal.style.display = 'none'; };
         }
         // Add listener for modal form submission
         const addForm = document.getElementById('add-teacher-form');
         if (addForm) {
             addForm.onsubmit = handleAddTeacherSubmit; // Assign named function
         }
    }
}

async function handleAddTeacherSubmit(event) {
    event.preventDefault();
    console.log("Add teacher form submitted");
    // TODO: Get data from modal form, call POST /api/users using fetchApi
    // On success: close modal, show success message, call loadTeachers() to refresh list
    // On error: show error message in modal
    alert("Add Teacher Submit - Not Implemented Yet");
    // Example: Close modal on submit attempt for now
    const modal = document.getElementById('add-teacher-modal');
    if (modal) modal.style.display = 'none';
}


function handleEditUserClick(userId) {
    console.log(`Edit button clicked for user ID: ${userId}`);
    // TODO: Implement opening an edit modal/page, pre-filled with user data
    alert(`Edit User ${userId} - Not Implemented Yet`);
}

function handleDeleteUserClick(userId) {
    console.log(`Delete button clicked for user ID: ${userId}`);
    // TODO: Implement confirmation dialog
    if (confirm(`Are you sure you want to delete user ${userId}? This cannot be undone.`)) {
        console.log(`Proceeding with delete for user ID: ${userId}`);
        // TODO: Call DELETE /api/users/{userID} using fetchApi
        // On success: call loadTeachers() to refresh the list
        alert(`Delete User ${userId} - API Call Not Implemented Yet`);
    } else {
        console.log(`Deletion cancelled for user ID: ${userId}`);
    }
}

// Make sure common.js provides:
// - getUserInfo()
// - fetchApi()
// - escapeHtml() (optional, but good practice)