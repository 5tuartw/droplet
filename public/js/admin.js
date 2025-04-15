// --- public/js/admin.js ---

const minPasswordLength = 8;
const requiresUppercase = true;
const requiresLowercase = true;
const requiresDigit = true;

let isDemoMode = false;

// Wait for the DOM and common.js stuff (like getUserInfo) to be ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Admin page DOM loaded, verifying access...");

    // --- Verify DemoMode status ---
    try {
        const statusData = await fetchApi('/api/status');
        if (typeof statusData?.isDemoMode === 'boolean') {
            isDemoMode = statusData.isDemoMode;
            console.log(`Demo Mode Status: ${isDemoMode}`);
        } else {
            console.warn("Could not determine demo mode from /api/status response. Proceeding as non-demo.");
        }
    } catch (statusError) {
        console.error("Failed to fetch /api/status:", statusError);
        alert("Warning: Could not fetch server status. Some features might behave unexpectedly.");
    }

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

            // --- Edit Button (Icon) ---
            const editButton = document.createElement('button');
            editButton.innerHTML = '✏️'; 
            editButton.className = 'edit-btn'; 
            editButton.dataset.userId = user.ID;
            editButton.title = `Edit user ${fullName || user.Email}`; // Accessibility title

            // --- Password Reset Button (Icon) --- // <<< NEW
            const resetButton = document.createElement('button');
            resetButton.innerHTML = '🔑'; // Key emoji
            resetButton.className = 'reset-pwd-btn'; // New class for targeting
            resetButton.dataset.userId = user.ID; // Need the user ID
            resetButton.dataset.userEmail = user.Email; // <<< Add email for display in modal
            resetButton.title = `Reset password for ${fullName || user.Email}`;

            // --- Delete Button (Icon) ---
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = '🗑️';
            deleteButton.className = 'delete-btn';
            deleteButton.dataset.userId = user.ID;
            deleteButton.title = `Delete user ${fullName || user.Email}`;

            actionsCell.appendChild(editButton);
            actionsCell.appendChild(resetButton);
            actionsCell.appendChild(deleteButton);
        });

        container.appendChild(table);
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
    if (!tableContainer) {
        console.error("setupTableActionListeners: tableContainer is null or undefined!");
        return;
    }
    // --- Log listener attachment ---
    console.log("Attaching click listener to element:", tableContainer);

    tableContainer.addEventListener('click', (event) => {
        // Find the closest buttons
        const editButton = event.target.closest('.edit-btn');
        const deleteButton = event.target.closest('.delete-btn');
        const resetButton = event.target.closest('.reset-pwd-btn'); // <<< Check for reset button

        if (editButton) {
            console.log("Edit button found");
            event.preventDefault();
            handleEditUserClick(editButton.dataset.userId);
        } else if (deleteButton) {
            console.log("Delete button found");
            event.preventDefault();
            handleDeleteUserClick(deleteButton.dataset.userId);
        } else if (resetButton) {
            console.log("Reset Password button found");
            event.preventDefault();
            handleResetPasswordClick(resetButton.dataset.userId, resetButton.dataset.userEmail); // Pass ID and Email
        } else {
            // console.log("No action button found for this click.");
        }
    });
}

// --- Action Handlers ---
function handleAddTeacherClick() {
    console.log("Add Teacher button clicked");
    const modal = document.getElementById('add-teacher-modal');
    const form = document.getElementById('add-teacher-form');
    const errorDiv = document.getElementById('add-teacher-error');

    if (modal && form && errorDiv) {
        // Reset form and clear previous errors when opening
        form.reset();
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';

        modal.style.display = 'flex'; // Show modal

        // Setup close button listener (only needs to be done once, maybe move to initializeAdminPanel?)
        const closeButton = modal.querySelector('.close-modal-button');
        if (closeButton) {
            // Use .onclick or remove existing listener before adding a new one
            closeButton.onclick = () => { modal.style.display = 'none'; };
        }
        // Setup cancel button listener
         const cancelButton = modal.querySelector('.cancel-button');
         if (cancelButton) {
            cancelButton.onclick = () => { modal.style.display = 'none'; };
         }

        // Assign submit handler (ensure it's not added multiple times if modal opens often)
        form.onsubmit = handleAddTeacherSubmit; // Use the async function below
    } else {
        console.error("Add teacher modal elements not found!");
    }
}

// --- Implement Form Submission Logic ---
async function handleAddTeacherSubmit(event) {
    event.preventDefault(); // Prevent default form submission
    const form = event.target; // Get the form element
    const submitButton = form.querySelector('button[type="submit"]');
    const errorDiv = document.getElementById('add-teacher-error');

    // Clear previous errors and disable button
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
    if (submitButton) submitButton.disabled = true;
    if (submitButton) submitButton.textContent = 'Adding...'; // Optional: indicate loading

    // --- 1. Get Form Data ---
    // Use element IDs defined in your admin.html modal
    const email = document.getElementById('add-teacher-email').value;
    const role = document.getElementById('add-teacher-role').value;
    const title = document.getElementById('add-teacher-title').value;
    const firstName = document.getElementById('add-teacher-firstname').value;
    const surname = document.getElementById('add-teacher-surname').value;
    const password = document.getElementById('add-teacher-password').value;

    // --- 2. Client-Side Validation (Basic) ---
    if (!email || !role || !title || !firstName || !surname || !password) {
        showModalError("Please fill in all required fields.", errorDiv, submitButton);
        return;
    }
    // Validate password complexity (mirror backend)
    let policyError = null;
    if (password.length < minPasswordLength) {
        policyError = `Password must be at least ${minPasswordLength} characters long.`;
    } else if (requiresUppercase && !/[A-Z]/.test(password)) {
        policyError = 'Password must contain at least one uppercase letter.';
    } else if (requiresLowercase && !/[a-z]/.test(password)) {
        policyError = 'Password must contain at least one lowercase letter.';
    } else if (requiresDigit && !/\d/.test(password)) {
        policyError = 'Password must contain at least one number.';
    }
    if (policyError) {
        showModalError(`Invalid Password: ${policyError}`, errorDiv, submitButton);
        return;
    }

    // --- 3. Prepare Request Body ---
    // Ensure keys match the expected JSON structure for POST /api/users backend
    const requestBody = {
        email: email,
        password: password, // Send plaintext, backend will hash
        role: role,
        title: title,
        first_name: firstName, // Use snake_case if backend expects it
        surname: surname     // Use snake_case if backend expects it
    };

    // --- 4. API Call using fetchApi ---
    try {
        console.log("Sending create user request:", requestBody);
        // Assumes fetchApi is available globally from common.js
        const newUser = await fetchApi('/api/users', {
            method: 'POST',
            body: JSON.stringify(requestBody)
            // fetchApi adds Content-Type and Authorization headers
        });

        console.log("User created successfully:", newUser);

        // --- 5. Handle Success ---
        const modal = document.getElementById('add-teacher-modal');
        if (modal) modal.style.display = 'none'; // Close modal
        form.reset(); // Reset form fields

        // Optional: Show a temporary success message somewhere on the main page
        // showMainPageSuccess("Teacher added successfully!");

        loadTeachers(); // Refresh the teacher list table

    } catch (error) {
        // --- 6. Handle Errors ---
        console.error("Error adding teacher:", error);
        // Display error inside the modal
        showModalError(error.message || "An unknown error occurred.", errorDiv, submitButton);
    } finally {
         // Re-enable button regardless of success/failure
         if (submitButton) submitButton.disabled = false;
         if (submitButton) submitButton.textContent = 'Add Teacher'; // Reset button text
    }
}

// Helper for showing errors within the add modal
function showModalError(message, errorDivElement, submitButtonElement) {
    if (errorDivElement) {
        errorDivElement.textContent = message;
        errorDivElement.style.display = 'block';
    }
    // Re-enable button if passed
    if (submitButtonElement) {
       submitButtonElement.disabled = false;
       submitButtonElement.textContent = 'Add Teacher';
    }
}

// Function called when Edit button in table is clicked
async function handleEditUserClick(userId) {
    console.log(`Edit button clicked for user ID: ${userId}`);
    const modal = document.getElementById('edit-teacher-modal');
    const form = document.getElementById('edit-teacher-form');
    const errorDiv = document.getElementById('edit-teacher-error');
    const modalTitle = modal ? modal.querySelector('h2') : null; // Get modal title element

    if (!modal || !form || !errorDiv || !modalTitle) {
        console.error("Edit modal elements not found! Ensure modal HTML exists with correct IDs.");
        alert("Error: Could not initialize edit form.");
        return;
    }

    // Clear previous errors and potentially reset form (might cause flicker)
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
    form.reset(); // Clear previous data before loading new

    // Show loading state or indicate loading
    modalTitle.textContent = "Loading User Data..."; // Update title temporarily
    modal.style.display = 'flex'; // Show modal early

    try {
        // --- Fetch the specific user's data ---
        console.log(`Workspaceing data for user ${userId}...`);
        // fetchApi should handle auth header and errors like 401/404/500
        const userData = await fetchApi(`/api/users/${userId}`);
        console.log("User data received:", userData);

        if (!userData) {
            throw new Error("User data not found or invalid response.");
        }

        // --- Populate the modal form ---
        modalTitle.textContent = "Edit Teacher"; // Restore title
        document.getElementById('edit-user-id').value = userData.id; // Store ID

        const emailInput = document.getElementById('edit-teacher-email');
        emailInput.value = userData.email || '';
        emailInput.readOnly = true; // Make email read-only
        emailInput.disabled = true; // Visually indicate it's read-only

        document.getElementById('edit-teacher-role').value = userData.role || 'user'; // Set role
        document.getElementById('edit-teacher-title').value = userData.title || '';       // Set names
        document.getElementById('edit-teacher-firstname').value = userData.first_name || '';
        document.getElementById('edit-teacher-surname').value = userData.surname || '';

        // Attach the submit handler to the form for this specific edit instance
        form.onsubmit = handleEditTeacherSubmit;

        // Setup close/cancel buttons (if not already globally handled)
        modal.querySelector('.close-modal-button').onclick = () => { modal.style.display = 'none'; };
        modal.querySelector('.cancel-button').onclick = () => { modal.style.display = 'none'; };

    } catch (error) {
        console.error(`Error fetching user data for edit (${userId}):`, error);
        // Display error inside the modal before hiding it, or use main page alert
        showEditModalError(`Failed to load user data: ${error.message}`, errorDiv, form.querySelector('button[type="submit"]'));
        modalTitle.textContent = "Error Loading Data";
        // Optionally hide modal after a delay or keep it open with error
        // setTimeout(() => { modal.style.display = 'none'; }, 3000);
    }
}

// Function called when the Edit Teacher modal form is submitted
async function handleEditTeacherSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const errorDiv = document.getElementById('edit-teacher-error');
    const userId = document.getElementById('edit-user-id').value;

    if (!userId) {
        showEditModalError("Error: User ID missing. Cannot save.", errorDiv, submitButton);
        return;
    }

    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
    if (submitButton) submitButton.disabled = true;
    if (submitButton) submitButton.textContent = 'Saving...';

    // --- 1. Get Updated Form Data ---
    const newRole = document.getElementById('edit-teacher-role').value;
    const newTitle = document.getElementById('edit-teacher-title').value;
    const newFirstName = document.getElementById('edit-teacher-firstname').value;
    const newSurname = document.getElementById('edit-teacher-surname').value;

    // --- 2. Client-Side Validation ---
    if (!newRole || !newTitle || !newFirstName || !newSurname) {
         showEditModalError("Name fields and role cannot be empty.", errorDiv, submitButton);
         return;
    }
    // Add any other specific validation if needed (e.g., check if role is valid)

    // --- 3. Prepare Payloads ---
    const namePayload = {
        title: newTitle,
        first_name: newFirstName, // Use keys expected by PATCH .../name
        surname: newSurname
    };
    const rolePayload = {
        role: newRole // Use key expected by PATCH .../role
    };

    // --- 4. API Calls (Sequential) ---
    let nameUpdateError = null;
    let roleUpdateError = null;

    try {
        // --- Call 1: Update Name ---
        console.log(`Sending PATCH update for name user ${userId}:`, namePayload);
        await fetchApi(`/api/users/${userId}/name`, { // <<< Use specific /name endpoint
            method: 'PATCH',
            body: JSON.stringify(namePayload)
        });
        console.log(`User ${userId} name updated successfully.`);

        // --- Call 2: Update Role (only if name update succeeded) ---
        console.log(`Sending PATCH update for role user ${userId}:`, rolePayload);
        await fetchApi(`/api/users/${userId}/role`, { // <<< Use specific /role endpoint
            method: 'PATCH',
            body: JSON.stringify(rolePayload)
        });
        console.log(`User ${userId} role updated successfully.`);

        // --- 5. Handle Overall Success ---
        console.log(`User ${userId} updated successfully (Name & Role).`);
        const modal = document.getElementById('edit-teacher-modal');
        if (modal) modal.style.display = 'none'; // Close modal
        loadTeachers(); // Refresh the teacher list

    } catch (error) {
        // --- 6. Handle Errors ---
        // Error could be from either fetchApi call
        console.error(`Error updating user ${userId}:`, error);
        // Show the error message inside the modal
        showEditModalError(error.message || "An unknown error occurred during update.", errorDiv, submitButton);
        // Do not close modal or refresh list on error
    } finally {
         // Re-enable button regardless of overall success/failure
         if (submitButton) submitButton.disabled = false;
         if (submitButton) submitButton.textContent = 'Save Changes';
    }
}

// --- Helper function for showing errors within the edit modal ---
function showEditModalError(message, errorDivElement, submitButtonElement) {
     if (errorDivElement) {
         errorDivElement.textContent = message;
         errorDivElement.style.display = 'block';
     }
     // Re-enable button if passed and exists
     if (submitButtonElement) {
        submitButtonElement.disabled = false;
        submitButtonElement.textContent = 'Save Changes';
     }
}

async function handleDeleteUserClick(userId) { // Make async
    console.log(`Delete button clicked for user ID: ${userId}`);

    // --- Check the isDemoMode variable ---
    if (isDemoMode === true) {
        alert("User deletion is disabled in demo mode.");
        return; // Stop execution
    }
    // --- End Demo Mode Check ---

    if (confirm(`Are you sure you want to permanently delete user ${userId}?`)) {
        console.log(`Proceeding with delete for user ID: ${userId}`);
        try {
            await fetchApi(`/api/users/${userId}`, { method: 'DELETE' });
            console.log(`User ${userId} deleted successfully.`);
            loadTeachers(); // Refresh the list
        } catch (error) {
            console.error(`Failed to delete user ${userId}:`, error);
            alert(`Error deleting user: ${error.message}`); // Show error
        }
    } else {
        console.log(`Deletion cancelled for user ID: ${userId}`);
    }
}

// --- Add handleResetPasswordClick ---
function handleResetPasswordClick(userId, userEmail) {
    console.log(`Reset Password button clicked for user ID: ${userId}, email: ${userEmail}`);
    // --- Add Demo Mode Check --- //
    if (isDemoMode === true) {
        alert("Password reset is disabled in demo mode.");
        return; // Stop execution
    }
    const modal = document.getElementById('reset-password-modal');
    const form = document.getElementById('reset-password-form');
    const errorDiv = document.getElementById('reset-password-error');
    const emailSpan = document.getElementById('reset-user-email');
    const reqsText = document.getElementById('reset-password-reqs'); // Get requirements P tag

    if (!modal || !form || !errorDiv || !emailSpan || !reqsText) {
        console.error("Reset password modal elements not found!");
        alert("Error: Could not initialize reset password form.");
        return;
    }

    // Reset form and clear errors
    form.reset();
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';

    // Populate user info
    document.getElementById('reset-user-id').value = userId; // Store ID in hidden field
    emailSpan.textContent = userEmail || 'N/A'; // Display email

    // Populate requirements text (could also fetch from common config/API)
    let requirementsString = `Must be at least ${minPasswordLength} characters`;
    const parts = [];
    if(requiresUppercase) parts.push("uppercase");
    if(requiresLowercase) parts.push("lowercase");
    if(requiresDigit) parts.push("number");
    if(parts.length > 0) requirementsString += `, including ${parts.join(', ')}.`;
    reqsText.textContent = requirementsString;


    // Attach submit handler
    form.onsubmit = handleResetPasswordSubmit;

    // Attach close/cancel listeners
    modal.querySelector('.close-modal-button').onclick = () => { modal.style.display = 'none'; };
    modal.querySelector('.cancel-button').onclick = () => { modal.style.display = 'none'; };

    // Show the modal
    modal.style.display = 'flex';
}


// --- Add handleResetPasswordSubmit ---
async function handleResetPasswordSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const errorDiv = document.getElementById('reset-password-error');
    const userId = document.getElementById('reset-user-id').value;

    if (!userId) {
        showResetModalError("Error: User ID missing. Cannot save.", errorDiv, submitButton);
        return;
    }

    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
    if (submitButton) submitButton.disabled = true;
    if (submitButton) submitButton.textContent = 'Setting Password...';

    // Get passwords
    const newPassword = document.getElementById('reset-new-password').value;
    const retypePassword = document.getElementById('reset-retype-password').value;

    // Client-side validation
    if (!newPassword || !retypePassword) {
        showResetModalError("Please enter and retype the new password.", errorDiv, submitButton);
        return;
    }
    if (newPassword !== retypePassword) {
        showResetModalError("Passwords do not match.", errorDiv, submitButton);
        return;
    }
    // Complexity validation
    let policyError = null;
    if (newPassword.length < minPasswordLength) { policyError = `Password must be at least ${minPasswordLength} characters long.`; }
    else if (requiresUppercase && !/[A-Z]/.test(newPassword)) { policyError = 'Password must contain at least one uppercase letter.'; }
    else if (requiresLowercase && !/[a-z]/.test(newPassword)) { policyError = 'Password must contain at least one lowercase letter.'; }
    else if (requiresDigit && !/\d/.test(newPassword)) { policyError = 'Password must contain at least one number.'; }

    if (policyError) {
        showResetModalError(`Invalid Password: ${policyError}`, errorDiv, submitButton);
        return;
    }

    // Prepare request body for PUT /api/users/{userID}/password
    const requestBody = {
        password: newPassword // Backend expects 'password' key
    };

    // API Call
    try {
        console.log(`Sending password reset for user ${userId}`);
        // Use fetchApi helper
        await fetchApi(`/api/users/${userId}/password`, {
            method: 'PUT', // Matches your route definition
            body: JSON.stringify(requestBody)
        });

        // Handle Success
        console.log(`Password for user ${userId} reset successfully.`);
        const modal = document.getElementById('reset-password-modal');
        if (modal) modal.style.display = 'none'; // Close modal
        alert(`Password for user ${userId} has been reset successfully.`); // Simple feedback

    } catch (error) {
        // Handle Error
        console.error(`Error resetting password for user ${userId}:`, error);
        showResetModalError(error.message || "An unknown error occurred.", errorDiv, submitButton);
    } finally {
        // Re-enable button
        if (submitButton) submitButton.disabled = false;
        if (submitButton) submitButton.textContent = 'Set New Password';
    }
}

// --- Helper for showing errors in reset modal ---
function showResetModalError(message, errorDivElement, submitButtonElement) {
     if (errorDivElement) {
         errorDivElement.textContent = message;
         errorDivElement.style.display = 'block';
     }
     if (submitButtonElement) {
        submitButtonElement.disabled = false;
        submitButtonElement.textContent = 'Set New Password';
     }
}