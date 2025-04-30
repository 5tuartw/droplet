// --- public/js/admin.js ---

// --- Constants / State ---
const minPasswordLength = 8;
const requiresUppercase = true;
const requiresLowercase = true;
const requiresDigit = true;
// Add requiresSymbol if implemented

let isDemoMode = false; // Fetched on load
let availableClasses = [];

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
            if (typeof statusData?.is_demo_mode === 'boolean') {
                isDemoMode = statusData.is_demo_mode;
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
async function initializeAdminPanel() {
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

    try {
        console.log("Fetching available classes for school...");
        // Assumes GET /api/classes returns [{id: INT/UUID, class_name: STR, school_id: UUID}, ...]
        // And is already scoped by school via RequireAuth middleware
        const classesData = await fetchApi('/api/classes'); // Ensure this endpoint exists and works

        if (classesData && Array.isArray(classesData)) {
            // Map to simpler structure {id, name} needed for dropdowns
            availableClasses = classesData.map(c => ({
                id: c.id,
                name: c.class_name
            }));
            console.log(`Stored ${availableClasses.length} classes.`);
        } else {
            console.warn("No classes data received or invalid format. Class dropdowns may be empty.");
            availableClasses = []; // Ensure it's an empty array
        }
    } catch (error) {
        console.error("Failed to fetch initial class list:", error);
        // Proceeding without class list, dropdowns will show 'no classes' message
        alert("Warning: Could not load class list for pupil assignment.");
        availableClasses = []; // Ensure it's an empty array on error
    }

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
                editButton.innerHTML = '✏️';
                editButton.className = 'edit-btn';
                editButton.dataset.userId = userId;
                editButton.dataset.userName = fullName;
                editButton.title = `Edit user ${fullName}`;
                // Reset Button
                const resetButton = document.createElement('button');
                resetButton.innerHTML = '🔑';
                resetButton.className = 'reset-pwd-btn';
                resetButton.dataset.userId = userId;
                resetButton.dataset.userEmail = userEmail;
                resetButton.title = `Reset password for ${fullName}`;
                // Delete Button
                const deleteButton = document.createElement('button');
                deleteButton.innerHTML = '🗑️';
                deleteButton.className = 'delete-btn';
                deleteButton.dataset.userId = userId;
                deleteButton.dataset.userName = fullName;
                deleteButton.title = `Delete user ${fullName}`;

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
                editButton.dataset.pupilId = pupilId; editButton.title = `Edit ${fullName || 'ID: ' + pupilId}`;
                // Delete Button
                const deleteButton = document.createElement('button');
                deleteButton.innerHTML = '🗑️'; deleteButton.className = 'delete-pupil-btn';
                deleteButton.dataset.pupilId = pupilId;
                deleteButton.dataset.pupilName = fullName;

                if (isDemoMode) {
                    deleteButton.disabled = true; deleteButton.title = 'Deletion disabled in demo mode'; deleteButton.classList.add('disabled-demo');
                } else { deleteButton.title = `Delete ${fullName || 'ID: ' + pupilId}`; }
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
    if (!tableContainer) { return; }
    if (tableContainer.dataset.listenerAttached === 'true') return; // Prevent multiple listeners
    console.log("Attaching action listener to container:", tableContainer);

    tableContainer.addEventListener('click', (event) => {
        // Use closest to find the relevant button ONCE
        const editUserButton = event.target.closest('.edit-btn');
        const deleteUserButton = event.target.closest('.delete-btn');
        const resetPwdButton = event.target.closest('.reset-pwd-btn');
        const editPupilButton = event.target.closest('.edit-pupil-btn');
        const deletePupilButton = event.target.closest('.delete-pupil-btn');
    
        // Handle based on which button was found (only one block will execute)
        if (editUserButton) {
            event.preventDefault();
            console.log("Edit TEACHER button clicked");
            // Pass name if needed by handler (current doesn't strictly need it here)
            handleEditUserClick(editUserButton.dataset.userId);
        } else if (deleteUserButton) {
            event.preventDefault();
            console.log("Delete TEACHER button clicked");
            const userId = deleteUserButton.dataset.userId;
            const userName = deleteUserButton.dataset.userName; // Get name
            handleDeleteUserClick(userId, userName);         // Pass name
        } else if (resetPwdButton) {
            event.preventDefault();
            console.log("Reset Password button clicked");
            const userId = resetPwdButton.dataset.userId;
            const userEmail = resetPwdButton.dataset.userEmail;
            const userName = resetPwdButton.dataset.userName; // Get name
            handleResetPasswordClick(userId, userEmail, userName); // Pass name
        } else if (editPupilButton) {
            event.preventDefault();
            console.log("Edit PUPIL button clicked");
             // Pass name if needed by handler (current placeholder doesn't)
            handleEditPupilClick(editPupilButton.dataset.pupilId);
        } else if (deletePupilButton) {
            event.preventDefault();
            console.log("Delete PUPIL button clicked");
            const pupilId = deletePupilButton.dataset.pupilId;
            const pupilName = deletePupilButton.dataset.pupilName; // Get name
            handleDeletePupilClick(pupilId, pupilName);      // Pass name
        }
    });
    tableContainer.dataset.listenerAttached = 'true';
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

        const firstName = esc(userData.first_name)
        const surname = esc(userData.surname)
        const fullName = `${firstName} ${surname}`.trim() || `User ${userId}`
        modalTitle.textContent = `Editing ${fullName}`;
        form.dataset.editingUserName = fullName;

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
    const editingName = form.dataset.editingUserName || `User ${userId}`;
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
    } catch (error) { showEditModalError(error.message || `Error updating user ${editingName}.`, errorDiv, submitButton); }
      finally { if(submitButton){ submitButton.disabled = false; submitButton.textContent = 'Save Changes'; } }
}

function showEditModalError(message, errorDivElement, submitButtonElement) { /* ... Helper to show error in Edit Teacher modal ... */
    if (errorDivElement) { errorDivElement.textContent = message; errorDivElement.style.display = 'block'; }
    if (submitButtonElement) { submitButtonElement.disabled = false; submitButtonElement.textContent = 'Save Changes'; }
}

async function handleDeleteUserClick(userId, userName) { 
    console.log(`Delete Teacher button clicked for ID: ${userId}`);
    if (isDemoMode) { alert("User deletion is disabled in demo mode."); return; }
    if (confirm(`Are you sure you want to permanently delete user ${userName}?`)) {
        try {
            await fetchApi(`/api/users/${userId}`, { method: 'DELETE' });
            console.log(`User ${userId} deleted successfully.`);
            loadTeachers();
        } catch (error) { console.error(`Failed to delete user ${userId}:`, error); alert(`Error deleting user: ${error.message}`); }
    } else { console.log(`Deletion cancelled for user ID: ${userId}`); }
}

function handleResetPasswordClick(userId, userEmail, userName) {
    const nameToDisplay = userName || userEmail || `user ${userId}`; 
    console.log(`Reset Password button clicked for ID: ${userId}, Name: ${nameToDisplay}`);

    if (isDemoMode) { alert("Password reset is disabled in demo mode."); return; }

    const modal = document.getElementById('reset-password-modal');
    const form = document.getElementById('reset-password-form');
    const errorDiv = document.getElementById('reset-password-error');
    const emailSpan = document.getElementById('reset-user-email'); 
    const reqsText = document.getElementById('reset-password-reqs');
    if (!modal || !form || !errorDiv || !emailSpan || !reqsText) { return; }

    form.reset(); errorDiv.textContent=''; errorDiv.style.display='none';
    document.getElementById('reset-user-id').value = userId;
    emailSpan.textContent = nameToDisplay;

    // --- Store name on form dataset for submit handler ---
    form.dataset.editingUserName = nameToDisplay; // 

    // Populate requirements text
    let requirementsString = `Must be at least ${minPasswordLength} characters`;
    const parts = [];
    if(requiresUppercase) parts.push("uppercase");
    if(requiresLowercase) parts.push("lowercase");
    if(requiresDigit) parts.push("number");
    if(parts.length > 0) requirementsString += `, including ${parts.join(', ')}.`;
    reqsText.textContent = requirementsString;

    // Attach submit handler
    form.onsubmit = handleResetPasswordSubmit;

    // Attach close/cancel listeners (include dataset cleanup)
    const closeHandler = () => { modal.style.display = 'none'; delete form.dataset.editingUserName; };
    modal.querySelector('.close-modal-button').onclick = closeHandler;
    modal.querySelector('.cancel-button').onclick = closeHandler;

    // Show the modal
    modal.style.display = 'flex';
}

async function handleResetPasswordSubmit(event) {
    event.preventDefault();
    const form = event.target; const submitButton = form.querySelector('button[type="submit"]'); const errorDiv = document.getElementById('reset-password-error'); const userId = document.getElementById('reset-user-id').value;
    if(!userId || !errorDiv || !submitButton) return;
    errorDiv.textContent = ''; errorDiv.style.display = 'none'; submitButton.disabled = true; submitButton.textContent = 'Setting Password...';
    const editingName = form.dataset.editingUserName || `User ${userId}`;
    try {
        const newPassword = document.getElementById('reset-new-password').value;
        const retypePassword = document.getElementById('reset-retype-password').value;
        if (!newPassword || !retypePassword) { throw new Error("Please enter and retype the new password."); }
        if (newPassword !== retypePassword) { throw new Error("Passwords do not match."); }
        let policyError = null;
        if (policyError) { throw new Error(`Invalid Password: ${policyError}`); }
        const requestBody = { password: newPassword };
        await fetchApi(`/api/users/${userId}/password`, { method: 'PUT', body: JSON.stringify(requestBody) });
        const modal = document.getElementById('reset-password-modal');
        if (modal) modal.style.display = 'none';
        alert(`Password for user ${editingName} has been reset successfully.`);
    } catch (error) { showResetModalError(error.message || "Error resetting password.", errorDiv, submitButton); }
      finally { if(submitButton){ submitButton.disabled = false; submitButton.textContent = 'Set New Password'; } }
}

function showResetModalError(message, errorDivElement, submitButtonElement) { /* ... Helper to show error in Reset Pwd modal ... */
    if (errorDivElement) { errorDivElement.textContent = message; errorDivElement.style.display = 'block'; }
    if (submitButtonElement) { submitButtonElement.disabled = false; submitButtonElement.textContent = 'Set New Password'; }
}


// --- PUPIL Action Handlers ---

// Add/Edit Pupil Modal Form Submission Handler
async function handlePupilFormSubmit(event) {
    event.preventDefault(); // Prevent default form submission
    const form = event.target; // Should be the form#add-pupil-form (or #pupil-form)
    const submitButton = form.querySelector('button[type="submit"]');
    const errorDiv = document.getElementById('add-pupil-error'); // Use the correct error div ID
    // Get pupilId from hidden input ONLY if in edit mode
    const pupilId = isEditMode ? document.getElementById('pupil-id').value : null;

    // Basic check for necessary elements
    if (!submitButton || !errorDiv) {
        console.error("Pupil modal submit button or error div not found!");
        // If we can't show errors, maybe alert?
        alert("A form error occurred.");
        return;
    }
    // Check if pupilId is missing when it should be present (edit mode)
     if (isEditMode && !pupilId) {
         showPupilModalError("Error: Pupil ID is missing for update.", errorDiv, submitButton);
         return;
     }

    // --- Prepare UI for Submission ---
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
    submitButton.disabled = true;
    const originalButtonText = submitButton.textContent; // Store original text
    submitButton.textContent = isEditMode ? 'Saving...' : 'Adding...';

    try {
        // --- 1. Gather Form Data ---
        const firstName = document.getElementById('add-pupil-firstname').value.trim();
        const surname = document.getElementById('add-pupil-surname').value.trim();
        const classIdValue = document.getElementById('add-pupil-class-id').value;

        // --- 2. Client-Side Validation ---
        if (!firstName || !surname) {
            throw new Error('First name and surname cannot be empty.');
        }
        if (!classIdValue || classIdValue === "") {
            throw new Error('Please select a class.');
        }
        const classId = parseInt(classIdValue, 10);
        if (isNaN(classId) || classId <= 0) {
             throw new Error('Invalid class selected.');
        }
        // Reminder: Backend MUST validate that this classId belongs to the school

        // --- 3. Prepare Request Body ---
        const payload = {
            first_name: firstName,
            surname: surname,
            class_id: classId // Send numeric ID
        };
        console.log("Submitting pupil data payload:", payload);

        // --- 4. Determine Method and URL ---
        let method = 'POST';
        let apiUrl = '/api/pupils';
        if (isEditMode) {
            method = 'PUT'; // Or PATCH if your backend uses PATCH for updates
            apiUrl = `/api/pupils/${pupilId}`;
        }
        console.log(`Submitting ${method} request to ${apiUrl}`);

        // --- 5. Make the API Call ---
        await fetchApi(apiUrl, {
            method: method,
            body: JSON.stringify(payload)
        });

        // --- 6. Handle Success ---
        const action = isEditMode ? 'updated' : 'added';
        console.log(`Pupil ${firstName} ${surname} ${action} successfully!`);
        closePupilModal();    // Close the modal (also resets form and flags)

        // Provide feedback on main page
        const messageDiv = document.getElementById('admin-message-area'); // Optional main message area
        if (messageDiv) {
             messageDiv.textContent = `Pupil ${firstName} ${surname} ${action} successfully.`;
             messageDiv.className = 'message-area success-message';
             setTimeout(() => { if(messageDiv) messageDiv.textContent = ''; messageDiv.className = 'message-area'; }, 3000);
        } else {
             alert(`Pupil ${firstName} ${surname} ${action} successfully.`);
        }

        loadPupils(); // Refresh the pupil list table

    } catch (error) {
        // --- 7. Handle Errors ---
        console.error(`Error ${isEditMode ? 'updating' : 'adding'} pupil:`, error);
        // Display error inside the modal's error div
        showPupilModalError(error.message || "An unknown error occurred.", errorDiv, submitButton, originalButtonText);

    } finally {
        // --- 8. Always Re-enable Button (unless error handler does it) ---
        // Error handler now resets button, so maybe only needed if no error handler exists?
        // Let's leave it commented out if showPupilModalError handles it.
        // if (submitButton) {
        //     submitButton.disabled = false;
        //     submitButton.textContent = originalButtonText;
        // }
    }
}

// Update Add Pupil button click handler
function handleAddPupilClick() {
    console.log("Add Pupil button clicked");
    showPupilModal(); // Call the new function with no arguments for Create mode
}

// Update Edit Pupil button click handler
async function handleEditPupilClick(pupilId) {
    console.log(`Edit Pupil button clicked for ID: ${pupilId}`);
    const messageDiv = document.getElementById('admin-message-area');
    if(messageDiv) messageDiv.textContent = '';

    try {
        // Fetch the specific pupil's data
        // Ensure you have a GET /api/pupils/{pupilID} endpoint
        console.log(`Workspaceing data for pupil ${pupilId}...`);
        const pupilData = await fetchApi(`/api/pupils/${pupilId}`);
        if (!pupilData) throw new Error("Pupil data not found.");

        // Call the new function WITH data for Edit mode
        showPupilModal(pupilData);

    } catch (error) {
        console.error(`Error fetching pupil data for edit (${pupilId}):`, error);
        if(messageDiv) messageDiv.textContent = `Error loading pupil for edit: ${error.message}`;
        else alert(`Error loading pupil for edit: ${error.message}`);
    }
}

async function handleDeletePupilClick(pupilId, nameToDisplay) {
    // = pupilName || `pupil ${pupilId}`;
    console.log(`Delete Pupil button clicked for ${nameToDisplay}`);
    if (isDemoMode === true) {
        alert("Pupil deletion is disabled in demo mode.");
        return;
    }
    // Using the pupil ID in the confirmation message
    if (!confirm(`Are you sure you want to permanently delete pupil ${nameToDisplay}? This cannot be undone.`)) {
        console.log(`Deletion cancelled.`);
        return; // Stop if user clicks Cancel
    }

    console.log(`Proceeding with delete for pupil: ${nameToDisplay}`);
    const messageDiv = document.getElementById('admin-message-area'); // Or use a specific one for pupils?
    if (messageDiv) messageDiv.textContent = ''; // Clear previous messages

    try {
        await fetchApi(`/api/pupils/${pupilId}`, {
            method: 'DELETE'
        });

        console.log(`${nameToDisplay} deleted successfully.`);

        if (messageDiv) {
             messageDiv.textContent = `Pupil ${nameToDisplay} deleted successfully.`;
             messageDiv.className = 'message-area success-message';
             setTimeout(() => { if(messageDiv) messageDiv.textContent = ''; messageDiv.className = 'message-area'; }, 3000); // Clear after 3s
        } else {
            alert(`Pupil ${pupilId} deleted successfully.`);
        }

        // Refresh the pupil list to remove the deleted item
        loadPupils();

    } catch (error) {
        console.error(`Failed to delete pupil ${nameToDisplay}:`, error);
        if (messageDiv) {
            messageDiv.textContent = `Error deleting pupil: ${error.message}`;
            messageDiv.className = 'message-area error-message'; 
        } else {
            alert(`Error deleting pupil: ${error.message}`); 
        }
    }
}

function showPupilModal(pupilDataToEdit = null) {
    console.log("showPupilModal called. Edit data:", pupilDataToEdit);

    // --- Get Modal Elements (Assuming generic IDs or #add-pupil-modal structure) ---
    // Use the IDs from the HTML you added/confirmed
    const modal = document.getElementById('pupil-form-modal'); // Or #pupil-form-modal if renamed
    const form = document.getElementById('add-pupil-form');   // Or #pupil-form
    const errorDiv = document.getElementById('add-pupil-error');
    const modalTitle = modal ? modal.querySelector('h2') : null;
    const submitButton = form ? form.querySelector('button[type="submit"]') : null;
    const idInput = document.getElementById('pupil-id');
    const firstNameInput = document.getElementById('add-pupil-firstname');
    const surnameInput = document.getElementById('add-pupil-surname');
    const classSelect = document.getElementById('add-pupil-class-id');

    // Check required elements
    if (!modal || !form || !errorDiv || !modalTitle || !submitButton || !idInput || !firstNameInput || !surnameInput || !classSelect) {
        console.error("Cannot show pupil modal, one or more essential elements are missing in the HTML.");
        alert("Error: Could not display the pupil form correctly.");
        return;
    }

    // --- Reset Form and State ---
    form.reset(); // Clear visible input fields
    idInput.value = ''; // Clear hidden ID field
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
    isEditMode = false; // Default to Create mode
    currentlyEditingPupilId = null;

    // --- Populate Class Dropdown ---
    classSelect.innerHTML = ''; // Clear existing options
    // Add the default disabled/prompt option
    const defaultOption = document.createElement('option');
    defaultOption.value = ""; // Empty value represents no selection
    defaultOption.textContent = "-- Select Class --";
    defaultOption.disabled = true;
    defaultOption.selected = true;
    classSelect.appendChild(defaultOption);

    // Add classes from the globally stored availableClasses array
    if (availableClasses && availableClasses.length > 0) {
        availableClasses.forEach(cls => {
            const option = document.createElement('option');
            // Assuming class IDs are numbers (int32) based on previous context
            option.value = cls.id;
            option.textContent = esc(cls.name); // Use escape function
            classSelect.appendChild(option);
        });
        classSelect.disabled = false;
    } else {
        // Handle case where no classes loaded
        console.warn("No available classes found to populate dropdown in pupil modal.");
        const noClassOption = document.createElement('option');
        noClassOption.value = "";
        noClassOption.textContent = "-- No classes available --";
        noClassOption.disabled = true;
        classSelect.appendChild(noClassOption);
        classSelect.disabled = true;
    }

    // --- Configure for Edit or Create Mode ---
    if (pupilDataToEdit && pupilDataToEdit.id) {
        // --- EDIT MODE ---
        console.log(`Populating modal for EDIT pupil ID: ${pupilDataToEdit.id}`);
        isEditMode = true;
        currentlyEditingPupilId = pupilDataToEdit.id; // Store the ID being edited

        modalTitle.textContent = 'Edit Pupil';
        submitButton.textContent = 'Save Changes';
        idInput.value = pupilDataToEdit.id; // Set hidden ID input

        // Populate form fields (use lowercase/snake_case matching API response)
        firstNameInput.value = pupilDataToEdit.first_name || '';
        surnameInput.value = pupilDataToEdit.surname || '';
        // Set dropdown selection (ensure pupilDataToEdit.class_id type matches option values)
        classSelect.value = String(pupilDataToEdit.class_id || "");

    } else {
        // --- CREATE MODE ---
        console.log("Opening modal for CREATE pupil.");
        // State variables already set to Create defaults
        modalTitle.textContent = 'Add New Pupil';
        submitButton.textContent = 'Add Pupil';
    }

    // --- Attach Submit Handler ---
    // Point the form's submit event to the single handler function
    form.onsubmit = handlePupilFormSubmit; // We will define this next

    // --- Attach Close/Cancel Handlers ---
    const closeButton = modal.querySelector('.close-modal-button');
    const cancelButton = modal.querySelector('.cancel-button');
    // Use simple .onclick assignment (overwrites previous if any)
    if (closeButton) closeButton.onclick = closePupilModal;
    if (cancelButton) cancelButton.onclick = closePupilModal;

    // --- Show Modal and Set Focus ---
    modal.style.display = 'flex';
    firstNameInput?.focus(); // Focus the first input field
}

// Helper function to close and reset the pupil modal
function closePupilModal() {
    const modal = document.getElementById('pupil-form-modal'); // Or #pupil-form-modal
    if (modal) modal.style.display = 'none';
    // Optional: Reset form here too for belt-and-braces, though showPupilModal also resets
    // const form = document.getElementById('add-pupil-form');
    // if (form) form.reset();
    isEditMode = false;
    currentlyEditingPupilId = null;
    console.log("Pupil modal closed, edit state reset.");
}

async function handlePupilFormSubmit(event) {
    event.preventDefault(); // Prevent default HTML form submission behaviour
    const form = event.target; // Should be the form#add-pupil-form (or #pupil-form)
    const submitButton = form.querySelector('button[type="submit"]');
    const errorDiv = document.getElementById('add-pupil-error'); // Use the correct error div ID
    // Get pupilId from hidden input ONLY if in edit mode
    const pupilId = isEditMode ? document.getElementById('pupil-id').value : null;

    // Basic check for necessary elements
    if (!submitButton || !errorDiv) {
        console.error("Pupil modal submit button or error div not found!");
        alert("A form error occurred."); // Fallback alert
        return;
    }
    // Check if pupilId is missing when it should be present (edit mode)
     if (isEditMode && !pupilId) {
         // Use the specific error helper for this modal
         showPupilModalError("Error: Pupil ID is missing for update.", errorDiv, submitButton);
         return;
     }

    // --- Prepare UI for Submission ---
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
    submitButton.disabled = true;
    const originalButtonText = isEditMode ? 'Save Changes' : 'Add Pupil'; // Get correct original text
    submitButton.textContent = isEditMode ? 'Saving...' : 'Adding...';

    try {
        // --- 1. Gather Form Data ---
        const firstName = document.getElementById('add-pupil-firstname').value.trim();
        const surname = document.getElementById('add-pupil-surname').value.trim();
        const classIdValue = document.getElementById('add-pupil-class-id').value; // Value is string ID

        // --- 2. Client-Side Validation ---
        if (!firstName || !surname) {
            throw new Error('First name and surname cannot be empty.');
        }
        if (!classIdValue || classIdValue === "") { // Check if a class was selected
            throw new Error('Please select a class for the pupil.');
        }
        const classId = parseInt(classIdValue, 10); // Convert to number
        if (isNaN(classId) || classId <= 0) {
             throw new Error('Invalid class selected.'); // Ensure it's a valid positive ID
        }
        // Reminder: Backend MUST also validate that this classId belongs to the school

        // --- 3. Prepare Request Body ---
        // Keys must match what the backend CreatePupil and UpdatePupil handlers expect
        const payload = {
            first_name: firstName,
            surname: surname,
            class_id: classId // Send the numeric ID
        };
        console.log("Submitting pupil data payload:", payload);

        // --- 4. Determine Method and URL based on isEditMode flag ---
        let method = 'POST';
        let apiUrl = '/api/pupils';
        if (isEditMode) {
            method = 'PUT'; // Or PATCH if your backend uses PATCH
            apiUrl = `/api/pupils/${pupilId}`; // Use the stored pupilId
        }
        console.log(`Submitting ${method} request to ${apiUrl}`);

        // --- 5. Make the API Call ---
        // Use fetchApi which handles auth header and basic error responses
        await fetchApi(apiUrl, {
            method: method,
            body: JSON.stringify(payload)
            // fetchApi should set Content-Type
        });

        // --- 6. Handle Success ---
        const action = isEditMode ? 'updated' : 'added';
        console.log(`Pupil ${firstName} ${surname} ${action} successfully!`);
        closePupilModal(); // Close the modal (also resets form and flags)

        // Provide feedback on main page (optional)
        const messageDiv = document.getElementById('admin-message-area');
        if (messageDiv) {
            messageDiv.textContent = `Pupil ${firstName} ${surname} ${action} successfully.`;
            messageDiv.className = 'message-area success-message';
            setTimeout(() => { if(messageDiv) messageDiv.textContent = ''; messageDiv.className = 'message-area'; }, 3000);
        } else {
             alert(`Pupil ${firstName} ${surname} ${action} successfully.`); // Fallback
        }

        loadPupils(); // Refresh the pupil list table

    } catch (error) {
        // --- 7. Handle Errors (Validation or API) ---
        console.error(`Error ${isEditMode ? 'updating' : 'adding'} pupil:`, error);
        // Display error inside the modal's specific error div
        showPupilModalError(error.message || "An unknown error occurred.", errorDiv, submitButton, originalButtonText);

    } finally {
        // --- 8. Always Re-enable Button ---
         // The error helper function (showPupilModalError) now handles re-enabling the button
         // if (submitButton) {
         //    submitButton.disabled = false;
         //    submitButton.textContent = originalButtonText;
         // }
    }
}

// Helper function for showing errors within the add/edit pupil modal
function showPupilModalError(message, errorDivElement, submitButtonElement, btnText = 'Submit') {
    if (errorDivElement) {
        errorDivElement.textContent = message;
        errorDivElement.style.display = 'block';
    }
    if (submitButtonElement) {
        const originalText = btnText === 'Submit' ? (isEditMode ? 'Save Changes' : 'Add Pupil') : btnText;
        submitButtonElement.disabled = false;
        submitButtonElement.textContent = originalText;
    }
}