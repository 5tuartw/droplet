// --- public/js/admin.js ---

// --- Constants / State ---
const minPasswordLength = 8;
const requiresUppercase = true;
const requiresLowercase = true;
const requiresDigit = true;
// Add requiresSymbol if implemented

let isDemoMode = false; // Fetched on load

// Fallback escape function if common.js doesn't provide it globally
const esc = typeof escapeHtml === 'function' ? escapeHtml : (s => s || '');

// --- DOMContentLoaded Listener: Handles Auth Check then Initializes ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Admin page DOM loaded, verifying admin access via API...");

    try {
        // --- Initial Auth & Admin Check ---
        // Call an ADMIN-ONLY endpoint. fetchApi handles tokens & 401.
        // GET /api/users handler should return 403 if user is authenticated but not admin.
        await fetchApi('/api/users');
        console.log("Admin access verified via API.");

        // --- Fetch Demo Mode Status (only if admin access verified) ---
        try {
            const statusData = await fetchApi('/api/status');
            if (typeof statusData?.isDemoMode === 'boolean') {
                isDemoMode = statusData.isDemoMode;
                console.log(`Demo Mode Status: ${isDemoMode}`);
            } else {
                 console.warn("Could not determine demo mode from /api/status response. Assuming non-demo.");
            }
        } catch (statusError) {
             console.error("Failed to fetch /api/status:", statusError);
             alert("Warning: Could not fetch server status. Some features might behave unexpectedly.");
             // Proceeding anyway, assuming non-demo
        }

        // --- Initialize the admin panel UI ---
        initializeAdminPanel();

    } catch (error) {
        // This catch handles errors from fetchApi (401 Unauthorized, 403 Forbidden, 500, network errors etc.)
        console.error("Admin access check failed or error during setup:", error);
        // Redirect non-admins, unauthenticated users, or on critical errors
        alert(`Access Denied or Error: ${error.message}. Redirecting to login.`); // Give user feedback
        window.location.href = '/'; // Redirect to login
    }
});


// --- PAGE INITIALIZATION (called AFTER auth check) ---
function initializeAdminPanel() {
    console.log("===> START Initializing admin panel UI and listeners... ===");

    // --- Element Getters (Ensure these IDs exist in admin.html) ---
    console.log("Getting elements...");
    const teachersListContainer = document.getElementById('teachers-list-container');
    const pupilsListContainer = document.getElementById('pupils-list-container');
    const structureContainer = document.getElementById('structure-management-container');
    // Tab Buttons/Panes
    const tabContainer = document.querySelector('.view-toggle');
    const tabPanes = document.querySelectorAll('.tab-pane');
    // Add Buttons
    const addTeacherButton = document.getElementById('add-teacher-button');
    const addPupilButton = document.getElementById('add-pupil-button');
    // Teacher Modals & Forms
    const addTeacherModal = document.getElementById('add-teacher-modal');
    const addTeacherForm = document.getElementById('add-teacher-form');
    const addTeacherErrorDiv = document.getElementById('add-teacher-error');
    const editTeacherModal = document.getElementById('edit-teacher-modal');
    const editTeacherForm = document.getElementById('edit-teacher-form');
    const editTeacherErrorDiv = document.getElementById('edit-teacher-error');
    const resetPasswordModal = document.getElementById('reset-password-modal');
    const resetPasswordForm = document.getElementById('reset-password-form');
    const resetPasswordErrorDiv = document.getElementById('reset-password-error');

    // --- Basic check if essential containers/tabs exist ---
     if (!teachersListContainer || !pupilsListContainer || !structureContainer || !tabContainer || tabPanes.length === 0) {
        console.error("Essential admin panel containers or tabs missing, stopping initialization.");
        // Maybe display a generic error on the page
        document.body.innerHTML = '<h1>Error initializing admin panel interface.</h1>';
        return;
     }
     console.log("Essential elements found.");

    // --- Setup Event Listeners ---
    console.log("Setting up listeners...");
    setupTabNavigation(tabContainer, tabPanes); // Pass elements
    setupActionButtons(addTeacherButton, addPupilButton);
    setupModalEventListeners(); // Let this find modals internally for simplicity now
    setupTableActionListeners(teachersListContainer); // Attach listener to teacher container
    setupTableActionListeners(pupilsListContainer);   // Attach listener to pupil container
    console.log("Listeners setup called.");

    // --- Initial Page State & Data Load ---
    console.log("Loading initial teacher data...");
    loadTeachers(); // Load data for the default active tab ('Teachers')

    console.log("===> END Initializing admin panel UI and listeners. ===");
}

// --- Tab Navigation Logic ---
function setupTabNavigation(tabContainer, tabPanesNodeList) {
    // Convert NodeList to Array for easier processing if needed, or check directly
    const tabButtons = tabContainer ? tabContainer.querySelectorAll('.toggle-button') : [];
    const tabPanes = Array.from(tabPanesNodeList || []); // Convert NodeList to Array

    if (!tabContainer || tabButtons.length === 0 || tabPanes.length === 0) {
        console.error("Tab navigation elements missing!");
        return;
    }

    tabContainer.addEventListener('click', (event) => {
        const clickedButton = event.target.closest('.toggle-button');
        if (!clickedButton) return;
        event.preventDefault();

        const targetIdSelector = clickedButton.dataset.tabTarget; // e.g., "#tab-teachers"
        if (!targetIdSelector) return;
        const targetPane = document.querySelector(targetIdSelector);
        if (!targetPane) return;

        // Load data if needed
        if (targetPane.dataset.loaded !== 'true') {
            console.log(`Tab ${targetIdSelector} clicked, data not loaded yet. Loading...`);
            switch (targetIdSelector) {
                case '#tab-pupils': loadPupils(); break;
                case '#tab-structure': loadSchoolStructure(); break;
            }
        } else { console.log(`Tab ${targetIdSelector} clicked, data already loaded.`); }

        // Update UI
        tabButtons.forEach(button => button.classList.remove('active'));
        clickedButton.classList.add('active');
        tabPanes.forEach(pane => pane.classList.remove('active'));
        targetPane.classList.add('active');
    });
}

// --- Load and Display Teachers ---
async function loadTeachers() {
    const container = document.getElementById('teachers-list-container');
    const targetPane = document.getElementById('tab-teachers'); // Needed to mark loaded
    if (!container || !targetPane) { console.error("Teacher container/pane missing"); return; }

    // Don't reload if already loaded (relevant if called manually later)
    if (targetPane.dataset.loaded === 'true' && container.querySelector('.admin-table')) {
        console.log("loadTeachers: Data already loaded.");
        return;
    }

    container.innerHTML = '<p>Loading teachers...</p>';
    try {
        const users = await fetchApi('/api/users');
        if (!users || !Array.isArray(users)) throw new Error("Invalid user list response.");

        container.innerHTML = ''; // Clear loading/previous content

        if (users.length === 0) {
            container.innerHTML = '<p>No teachers found.</p>';
        } else {
            const table = document.createElement('table');
            table.className = 'admin-table teacher-table';
            const thead = table.createTHead();
            const headerRow = thead.insertRow();
            ['Name', 'Email', 'Role', 'Actions'].forEach(text => {
                const th = document.createElement('th'); th.textContent = text; headerRow.appendChild(th);
            });
            const tbody = table.createTBody();
            users.forEach(user => {
                const row = tbody.insertRow();
                const title = esc(user.title);
                const firstName = esc(user.first_name);
                const surname = esc(user.surname);
                const fullName = `${title || ''} ${firstName || ''} ${surname || ''}`.trim();
                const userEmail = esc(user.email);
                const userRole = esc(user.role);
                const userId = user.id; // Use lowercase id

                row.insertCell().textContent = fullName || 'N/A';
                row.insertCell().textContent = userEmail;
                row.insertCell().textContent = userRole;

                const actionsCell = row.insertCell(); actionsCell.style.whiteSpace = 'nowrap';
                // Edit Button
                const editButton = document.createElement('button');
                editButton.innerHTML = '✏️'; editButton.className = 'edit-btn';
                editButton.dataset.userId = userId; editButton.title = `Edit user ${fullName || userEmail}`;
                // Reset Button
                const resetButton = document.createElement('button');
                resetButton.innerHTML = '🔑'; resetButton.className = 'reset-pwd-btn';
                resetButton.dataset.userId = userId; resetButton.dataset.userEmail = userEmail;
                // Delete Button
                const deleteButton = document.createElement('button');
                deleteButton.innerHTML = '🗑️'; deleteButton.className = 'delete-btn';
                deleteButton.dataset.userId = userId;

                // Set titles/disabled state AFTER creating buttons
                if (isDemoMode) {
                    resetButton.disabled = true; resetButton.title = 'Password reset disabled in demo mode'; resetButton.classList.add('disabled-demo');
                    deleteButton.disabled = true; deleteButton.title = 'Deletion disabled in demo mode'; deleteButton.classList.add('disabled-demo');
                } else {
                    resetButton.title = `Reset password for ${fullName || userEmail}`;
                    deleteButton.title = `Delete user ${fullName || userEmail}`;
                }
                actionsCell.appendChild(editButton); actionsCell.appendChild(resetButton); actionsCell.appendChild(deleteButton);
            });
            container.appendChild(table);
            // Listeners are attached by initializeAdminPanel via setupTableActionListeners
        }
        targetPane.dataset.loaded = 'true'; // Mark as loaded (even if empty)
        console.log("Teacher data loaded and rendered.");
    } catch (error) {
        console.error("Failed to load teachers:", error);
        container.innerHTML = `<p class="error-message">Error loading teachers: ${error.message}</p>`;
        // Don't mark as loaded on error
    }
}

// Setup Main Modal Button Listeners (Add Teacher, Edit Teacher, Reset Password)
function setupModalEventListeners() {
    // Get references INSIDE this function or ensure they are passed/globally accessible
    // Let's assume modal elements need querying here if not passed.
    const addTeacherModal = document.getElementById('add-teacher-modal');
    const addTeacherForm = document.getElementById('add-teacher-form');
    const addTeacherButton = document.getElementById('add-teacher-button'); // The button that OPENS the modal

    const editTeacherModal = document.getElementById('edit-teacher-modal');
    const editTeacherForm = document.getElementById('edit-teacher-form');

    const resetPasswordModal = document.getElementById('reset-password-modal');
    const resetPasswordForm = document.getElementById('reset-password-form');

    // --- Add Teacher Modal Listeners ---
    if (addTeacherButton && addTeacherModal) {
        addTeacherButton.addEventListener('click', handleAddTeacherClick); // Use specific handler
    } else { console.warn("Add Teacher button or modal not found for listener setup."); }

    if(addTeacherModal) {
        const closeBtn = addTeacherModal.querySelector('.close-modal-button');
        const cancelBtn = addTeacherModal.querySelector('.cancel-button');
        if(closeBtn) closeBtn.onclick = () => addTeacherModal.style.display = 'none';
        if(cancelBtn) cancelBtn.onclick = () => addTeacherModal.style.display = 'none';
        // Submit listener is attached dynamically in handleAddTeacherClick
    }

    // --- Edit Teacher Modal Listeners ---
     if(editTeacherModal) {
        const closeBtn = editTeacherModal.querySelector('.close-modal-button');
        const cancelBtn = editTeacherModal.querySelector('.cancel-button');
        if(closeBtn) closeBtn.onclick = () => editTeacherModal.style.display = 'none';
        if(cancelBtn) cancelBtn.onclick = () => editTeacherModal.style.display = 'none';
         // Submit listener is attached dynamically in handleEditUserClick
    }

    // --- Reset Password Modal Listeners ---
    if(resetPasswordModal) {
        const closeBtn = resetPasswordModal.querySelector('.close-modal-button');
        const cancelBtn = resetPasswordModal.querySelector('.cancel-button');
        if(closeBtn) closeBtn.onclick = () => resetPasswordModal.style.display = 'none';
        if(cancelBtn) cancelBtn.onclick = () => resetPasswordModal.style.display = 'none';
         // Submit listener is attached dynamically in handleResetPasswordClick
    }

     // Add setup for Add/Edit Pupil modals here when created
     const addPupilButton = document.getElementById('add-pupil-button');
     if(addPupilButton){
         addPupilButton.addEventListener('click', handleAddPupilClick);
     } else { console.warn("Add Pupil button not found for listener setup."); }

     console.log("Modal-related event listeners configured.");
}

// --- Load and Display Pupils ---
async function loadPupils() {
    const container = document.getElementById('pupils-list-container');
    const targetPane = document.getElementById('tab-pupils');
    if (!container || !targetPane) { console.error("Pupil container/pane missing"); return; }
    if (targetPane.dataset.loaded === 'true') { console.log("loadPupils: Data already loaded."); return; }

    container.innerHTML = '<p>Loading pupils...</p>';
    try {
        const pupils = await fetchApi('/api/pupils');
        if (!pupils || !Array.isArray(pupils)) throw new Error("Invalid pupil list response.");

        container.innerHTML = ''; // Clear loading

        if (pupils.length === 0) {
            container.innerHTML = '<p>No pupils found for this school.</p>';
        } else {
            const table = document.createElement('table');
            table.className = 'admin-table pupil-table';
            const thead = table.createTHead();
            const headerRow = thead.insertRow();
            ['Name', 'Class', 'Actions'].forEach(text => {
                 const th = document.createElement('th'); th.textContent = text; headerRow.appendChild(th);
            });
            const tbody = table.createTBody();
            pupils.forEach(pupil => {
                const row = tbody.insertRow();
                const firstName = esc(pupil.first_name);
                const surname = esc(pupil.surname);
                const fullName = `${firstName || ''} ${surname || ''}`.trim();
                const className = esc(pupil.class_name);
                const pupilId = pupil.id; // Assuming int32/SERIAL from API

                row.insertCell().textContent = fullName || 'N/A';
                row.insertCell().textContent = className || 'N/A';

                const actionsCell = row.insertCell(); actionsCell.style.whiteSpace = 'nowrap';
                // Edit Button
                const editButton = document.createElement('button');
                editButton.innerHTML = '✏️'; editButton.className = 'edit-pupil-btn';
                editButton.dataset.pupilId = pupilId; editButton.title = `Edit pupil ${fullName || 'ID: ' + pupilId}`;
                // Delete Button
                const deleteButton = document.createElement('button');
                deleteButton.innerHTML = '🗑️'; deleteButton.className = 'delete-pupil-btn';
                deleteButton.dataset.pupilId = pupilId;

                if (isDemoMode) {
                    deleteButton.disabled = true; deleteButton.title = 'Deletion disabled in demo mode'; deleteButton.classList.add('disabled-demo');
                } else { deleteButton.title = `Delete pupil ${fullName || 'ID: ' + pupilId}`; }
                actionsCell.appendChild(editButton); actionsCell.appendChild(deleteButton);
            });
            container.appendChild(table);
            // Listeners are attached by initializeAdminPanel via setupTableActionListeners
        }
        targetPane.dataset.loaded = 'true'; // Mark as loaded
        console.log("Pupil data loaded and rendered.");
    } catch (error) {
        console.error("Failed to load pupils:", error);
        container.innerHTML = `<p class="error-message">Error loading pupils: ${error.message}</p>`;
    }
}

// --- Load School Structure (Placeholder) ---
async function loadSchoolStructure() {
    const container = document.getElementById('structure-management-container');
    const targetPane = document.getElementById('tab-structure');
    if (!container || !targetPane) return;
    if (targetPane.dataset.loaded === 'true') return;
    container.innerHTML = '<p>Loading school structure...</p>';
    console.log("loadSchoolStructure called - Not Implemented Yet");
    // TODO: Implement API call and rendering for school structure
    container.innerHTML = '<p>School structure management coming soon...</p>';
    targetPane.dataset.loaded = 'true'; // Mark loaded
}

// --- Setup Event Listeners ---
function setupActionButtons(addTeacherBtn, addPupilBtn) { // Accept button elements
    if (addTeacherBtn) {
        addTeacherBtn.addEventListener('click', handleAddTeacherClick);
    } else { console.warn("#add-teacher-button not found for listener."); }

    if (addPupilBtn) {
        addPupilBtn.addEventListener('click', handleAddPupilClick); // Use placeholder handler
    } else { console.warn("#add-pupil-button not found for listener."); }
}

function setupTableActionListeners(tableContainer) {
    // This function now correctly handles both teacher and pupil buttons
    // using event delegation and closest() - kept from previous version
     if (!tableContainer) { return; }
     console.log("Attaching action listener to container:", tableContainer);

     // Check if listener already exists (simple check, might need more robust if called many times)
     if(tableContainer.dataset.listenerAttached === 'true') return;

     tableContainer.addEventListener('click', (event) => {
         const editUserButton = event.target.closest('.edit-btn');
         const deleteUserButton = event.target.closest('.delete-btn');
         const resetPwdButton = event.target.closest('.reset-pwd-btn');
         const editPupilButton = event.target.closest('.edit-pupil-btn');
         const deletePupilButton = event.target.closest('.delete-pupil-btn');

         if (editUserButton) { event.preventDefault(); handleEditUserClick(editUserButton.dataset.userId); }
         else if (deleteUserButton) { event.preventDefault(); handleDeleteUserClick(deleteUserButton.dataset.userId); }
         else if (resetPwdButton) { event.preventDefault(); handleResetPasswordClick(resetPwdButton.dataset.userId, resetPwdButton.dataset.userEmail); }
         else if (editPupilButton) { event.preventDefault(); handleEditPupilClick(editPupilButton.dataset.pupilId); }
         else if (deletePupilButton) { event.preventDefault(); handleDeletePupilClick(deletePupilButton.dataset.pupilId); }
     });
     tableContainer.dataset.listenerAttached = 'true'; // Mark as attached
}

// --- TEACHER Action Handlers ---
function handleAddTeacherClick() { /* ... Logic to show/reset add teacher modal ... */
    const modal = document.getElementById('add-teacher-modal');
    const form = document.getElementById('add-teacher-form');
    const errorDiv = document.getElementById('add-teacher-error');
    if (!modal || !form || !errorDiv) { console.error("Add teacher modal elements missing."); return; }
    form.reset();
    errorDiv.textContent=''; errorDiv.style.display='none';
    modal.style.display = 'flex';
    // Populate requirements text if needed
    const reqsText = document.getElementById('add-password-reqs');
    if(reqsText) { /* ... build and set requirements string ... */ }
    // Set up close/cancel/submit listeners specific to this modal instance
    modal.querySelector('.close-modal-button').onclick = () => modal.style.display = 'none';
    modal.querySelector('.cancel-button').onclick = () => modal.style.display = 'none';
    form.onsubmit = handleAddTeacherSubmit;
}

async function handleAddTeacherSubmit(event) { /* ... Logic to validate, call POST /api/users, close modal, loadTeachers() ... */
    event.preventDefault();
    const form = event.target; const submitButton = form.querySelector('button[type="submit"]'); const errorDiv = document.getElementById('add-teacher-error');
    if(!errorDiv || !submitButton) return;
    errorDiv.textContent = ''; errorDiv.style.display = 'none'; submitButton.disabled = true; submitButton.textContent = 'Adding...';
    try {
        const email = document.getElementById('add-teacher-email').value; /* ... get other fields ... */
        const password = document.getElementById('add-teacher-password').value;
        const role = document.getElementById('add-teacher-role').value;
        const title = document.getElementById('add-teacher-title').value;
        const firstName = document.getElementById('add-teacher-firstname').value;
        const surname = document.getElementById('add-teacher-surname').value;
        if (!email || !role || !title || !firstName || !surname || !password) { throw new Error("Please fill in all required fields."); }
        // Password complexity check...
        let policyError = null; /* ... perform checks using constants ... */
        if (policyError) { throw new Error(`Invalid Password: ${policyError}`); }
        const requestBody = { email, password, role, title, first_name: firstName, surname };
        await fetchApi('/api/users', { method: 'POST', body: JSON.stringify(requestBody) });
        const modal = document.getElementById('add-teacher-modal');
        if (modal) modal.style.display = 'none';
        loadTeachers(); // Refresh list
    } catch (error) { showModalError(error.message || "Error adding teacher.", errorDiv, submitButton); }
      finally { if(submitButton){ submitButton.disabled = false; submitButton.textContent = 'Add Teacher'; } }
}

function showModalError(message, errorDivElement, submitButtonElement) { /* ... Helper to show error in Add Teacher modal ... */
     if (errorDivElement) { errorDivElement.textContent = message; errorDivElement.style.display = 'block'; }
     if (submitButtonElement) { submitButtonElement.disabled = false; submitButtonElement.textContent = 'Add Teacher'; }
}

async function handleEditUserClick(userId) { /* ... Logic to fetch user, populate/show edit teacher modal ... */
    const modal = document.getElementById('edit-teacher-modal'); /* ... get other modal elements ... */
    const form = document.getElementById('edit-teacher-form');
    const errorDiv = document.getElementById('edit-teacher-error');
    const modalTitle = modal ? modal.querySelector('h2') : null;
    if (!modal || !form || !errorDiv || !modalTitle) return;
    form.reset(); errorDiv.textContent=''; errorDiv.style.display='none';
    modalTitle.textContent = "Loading User Data..."; modal.style.display = 'flex';
    try {
        const userData = await fetchApi(`/api/users/${userId}`);
        if (!userData) throw new Error("User data not found.");
        modalTitle.textContent = "Edit Teacher";
        document.getElementById('edit-user-id').value = userData.id;
        const emailInput = document.getElementById('edit-teacher-email');
        emailInput.value = userData.email || ''; emailInput.readOnly = true; emailInput.disabled = true;
        document.getElementById('edit-teacher-role').value = userData.role || 'user';
        document.getElementById('edit-teacher-title').value = userData.title || '';
        document.getElementById('edit-teacher-firstname').value = userData.first_name || '';
        document.getElementById('edit-teacher-surname').value = userData.surname || '';
        form.onsubmit = handleEditTeacherSubmit;
        modal.querySelector('.close-modal-button').onclick = () => modal.style.display = 'none';
        modal.querySelector('.cancel-button').onclick = () => modal.style.display = 'none';
    } catch (error) { /* ... handle error, show in modal ... */
        showEditModalError(`Failed to load user data: ${error.message}`, errorDiv, form.querySelector('button[type="submit"]'));
        modalTitle.textContent = "Error Loading Data";
    }
}

async function handleEditTeacherSubmit(event) { /* ... Logic to validate, call PATCH /name and /role, close modal, loadTeachers() ... */
    event.preventDefault();
    const form = event.target; const submitButton = form.querySelector('button[type="submit"]'); const errorDiv = document.getElementById('edit-teacher-error'); const userId = document.getElementById('edit-user-id').value;
    if (!userId || !errorDiv || !submitButton) return;
    errorDiv.textContent = ''; errorDiv.style.display = 'none'; submitButton.disabled = true; submitButton.textContent = 'Saving...';
    try {
        const newRole = document.getElementById('edit-teacher-role').value; /* ... get name fields ... */
        const newTitle = document.getElementById('edit-teacher-title').value;
        const newFirstName = document.getElementById('edit-teacher-firstname').value;
        const newSurname = document.getElementById('edit-teacher-surname').value;
        if (!newRole || !newTitle || !newFirstName || !newSurname) { throw new Error("Name fields and role cannot be empty."); }
        const namePayload = { title: newTitle, first_name: newFirstName, surname: newSurname };
        const rolePayload = { role: newRole };
        await fetchApi(`/api/users/${userId}/name`, { method: 'PATCH', body: JSON.stringify(namePayload) });
        await fetchApi(`/api/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify(rolePayload) });
        const modal = document.getElementById('edit-teacher-modal');
        if (modal) modal.style.display = 'none';
        loadTeachers();
    } catch (error) { showEditModalError(error.message || "Error updating user.", errorDiv, submitButton); }
      finally { if(submitButton){ submitButton.disabled = false; submitButton.textContent = 'Save Changes'; } }
}

function showEditModalError(message, errorDivElement, submitButtonElement) { /* ... Helper to show error in Edit Teacher modal ... */
    if (errorDivElement) { errorDivElement.textContent = message; errorDivElement.style.display = 'block'; }
    if (submitButtonElement) { submitButtonElement.disabled = false; submitButtonElement.textContent = 'Save Changes'; }
}

async function handleDeleteUserClick(userId) { /* ... Logic for demo check, confirm(), call DELETE /api/users/{userID}, loadTeachers() ... */
    console.log(`Delete Teacher button clicked for ID: ${userId}`);
    if (isDemoMode) { alert("User deletion is disabled in demo mode."); return; }
    if (confirm(`Are you sure you want to permanently delete user ${userId}?`)) {
        try {
            await fetchApi(`/api/users/${userId}`, { method: 'DELETE' });
            console.log(`User ${userId} deleted successfully.`);
            loadTeachers();
        } catch (error) { console.error(`Failed to delete user ${userId}:`, error); alert(`Error deleting user: ${error.message}`); }
    } else { console.log(`Deletion cancelled for user ID: ${userId}`); }
}

function handleResetPasswordClick(userId, userEmail) { /* ... Logic for demo check, populate/show reset password modal ... */
    console.log(`Reset Password button clicked for user ID: ${userId}`);
    if (isDemoMode) { alert("Password reset is disabled in demo mode."); return; }
    const modal = document.getElementById('reset-password-modal'); /* get other elements */
    const form = document.getElementById('reset-password-form');
    const errorDiv = document.getElementById('reset-password-error');
    const emailSpan = document.getElementById('reset-user-email');
    const reqsText = document.getElementById('reset-password-reqs');
    if (!modal || !form || !errorDiv || !emailSpan || !reqsText) { return; }
    form.reset(); errorDiv.textContent=''; errorDiv.style.display='none';
    document.getElementById('reset-user-id').value = userId;
    emailSpan.textContent = userEmail || 'N/A';
    let requirementsString = `Must be at least ${minPasswordLength} characters`; /* ... build reqs string ... */
    reqsText.textContent = requirementsString;
    form.onsubmit = handleResetPasswordSubmit;
    modal.querySelector('.close-modal-button').onclick = () => modal.style.display = 'none';
    modal.querySelector('.cancel-button').onclick = () => modal.style.display = 'none';
    modal.style.display = 'flex';
}

async function handleResetPasswordSubmit(event) { /* ... Logic to validate, call PUT /api/users/{userID}/password, close modal ... */
    event.preventDefault();
    const form = event.target; const submitButton = form.querySelector('button[type="submit"]'); const errorDiv = document.getElementById('reset-password-error'); const userId = document.getElementById('reset-user-id').value;
    if(!userId || !errorDiv || !submitButton) return;
    errorDiv.textContent = ''; errorDiv.style.display = 'none'; submitButton.disabled = true; submitButton.textContent = 'Setting Password...';
    try {
        const newPassword = document.getElementById('reset-new-password').value; /* get retype */
        const retypePassword = document.getElementById('reset-retype-password').value;
        if (!newPassword || !retypePassword) { throw new Error("Please enter and retype the new password."); }
        if (newPassword !== retypePassword) { throw new Error("Passwords do not match."); }
        let policyError = null; /* ... validate complexity ... */
        if (policyError) { throw new Error(`Invalid Password: ${policyError}`); }
        const requestBody = { password: newPassword };
        await fetchApi(`/api/users/${userId}/password`, { method: 'PUT', body: JSON.stringify(requestBody) });
        const modal = document.getElementById('reset-password-modal');
        if (modal) modal.style.display = 'none';
        alert(`Password for user ${userId} has been reset successfully.`);
    } catch (error) { showResetModalError(error.message || "Error resetting password.", errorDiv, submitButton); }
      finally { if(submitButton){ submitButton.disabled = false; submitButton.textContent = 'Set New Password'; } }
}

function showResetModalError(message, errorDivElement, submitButtonElement) { /* ... Helper to show error in Reset Pwd modal ... */
    if (errorDivElement) { errorDivElement.textContent = message; errorDivElement.style.display = 'block'; }
    if (submitButtonElement) { submitButtonElement.disabled = false; submitButtonElement.textContent = 'Set New Password'; }
}


// --- PUPIL Action Handlers (Placeholders) ---
function handleAddPupilClick() {
    console.log("Add Pupil button clicked - Not Implemented");
    alert("Add Pupil - Not Implemented Yet");
    // TODO: Implement modal opening logic for adding pupils
}

function handleEditPupilClick(pupilId) {
    console.log(`Edit Pupil button clicked for ID: ${pupilId}`);
    alert(`Edit Pupil ${pupilId} - Not Implemented Yet`);
    // TODO: Implement opening an edit pupil modal/page
}

function handleDeletePupilClick(pupilId) {
    console.log(`Delete Pupil button clicked for ID: ${pupilId}`);
    if (isDemoMode === true) {
        alert("Pupil deletion is disabled in demo mode.");
        return;
    }
    if (confirm(`Are you sure you want to delete pupil ${pupilId}?`)) {
         alert(`Delete Pupil ${pupilId} - API Call Not Implemented Yet`);
         // TODO: Implement call to DELETE /api/pupils/{pupilId} using fetchApi
         // On success: call loadPupils() to refresh the list
    } else {
        console.log(`Deletion cancelled for pupil ID: ${pupilId}`);
    }
}