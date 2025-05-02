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
        console.log("Fetching initial lookup data (Classes, Year Groups, Divisions)...");

        // Use Promise.all to fetch concurrently
        // Add .catch to individual fetches to prevent one failure stopping others
        const [classesData, yearGroupsData, divisionsData] = await Promise.all([
            fetchApi('/api/classes').catch(err => { console.error("Failed to fetch classes:", err); return null; }), // Return null on error
            fetchApi('/api/yeargroups').catch(err => { console.error("Failed to fetch year groups:", err); return null; }),
            fetchApi('/api/divisions').catch(err => { console.error("Failed to fetch divisions:", err); return null; })
        ]);

        // Map and store Classes (ensure keys match API response)
        if (classesData && Array.isArray(classesData)) {
             // VERIFY: Does GET /api/classes return 'id' and 'class_name'?
            availableClasses = classesData.map(c => ({ id: c.id, name: c.class_name }));
            console.log(`Stored ${availableClasses.length} classes.`);
        } else {
            console.warn("No classes data received or invalid format.");
            availableClasses = []; // Ensure it's an empty array
        }

        // Map and store Year Groups (ensure keys match API response)
        if (yearGroupsData && Array.isArray(yearGroupsData)) {
             // VERIFY: Does GET /api/yeargroups return 'id' and 'year_group_name'?
            availableYearGroups = yearGroupsData.map(yg => ({ id: yg.id, name: yg.year_group_name }));
            console.log(`Stored ${availableYearGroups.length} year groups.`);
        } else {
            console.warn("No year groups data received or invalid format.");
            availableYearGroups = [];
        }

        // Map and store Divisions (ensure keys match API response)
        if (divisionsData && Array.isArray(divisionsData)) {
            // VERIFY: Does GET /api/divisions return 'id' and 'division_name'?
            availableDivisions = divisionsData.map(div => ({ id: div.id, name: div.division_name }));
            console.log(`Stored ${availableDivisions.length} divisions.`);
        } else {
            console.warn("No divisions data received or invalid format.");
            availableDivisions = [];
        }

    } catch (error) {
        // This catch might not be strictly needed if individual catches handle errors,
        // but can catch broader Promise.all issues if any occur outside fetchApi.
        console.error("Error during initial data fetching:", error);
        alert("Warning: Could not load all necessary data for editing structure.");
        // Ensure arrays are empty on failure
        availableClasses = []; availableYearGroups = []; availableDivisions = [];
    }

    // --- Setup Event Listeners ---
    console.log("Setting up listeners...");
    setupTabNavigation(tabContainer, tabPanes); // Pass elements
    setupActionButtons(addTeacherButton, addPupilButton);
    setupModalEventListeners(); // Let this find modals internally for simplicity now
    setupTableActionListeners(teachersListContainer); // Attach listener to teacher container
    setupTableActionListeners(pupilsListContainer);   // Attach listener to pupil container
    setupStructureTreeListeners(structureContainer); // For expandable tree

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

// --- Load School Structure ---
async function loadSchoolStructure() {
    const container = document.getElementById('structure-management-container');
    const targetPane = document.getElementById('tab-structure'); // The tab content pane

    if (!container || !targetPane) {
        console.error("School structure container or tab pane not found");
        return;
    }

    // Prevent multiple loads if already loaded
    /*if (targetPane.dataset.loaded === 'true') {
        console.log("loadSchoolStructure: Data already loaded.");
        return;
    }*/

    container.innerHTML = '<p>Loading school structure...</p>'; // Set loading state

    try {
        // --- Fetch the Nested Data ---
        console.log("Fetching /api/school-structure...");
        // fetchApi handles auth and errors like 401, 403 (if admin check fails)
        const structureData = await fetchApi('/api/school-structure'); // Ensure this endpoint exists and is admin-only

        if (!structureData || !structureData.divisions) { // Basic check on response structure
             console.error("Invalid structure data received:", structureData);
             throw new Error("Invalid response received for school structure.");
        }

        console.log("Received structure data:", structureData);

        // --- Render the Tree ---
        container.innerHTML = ''; // Clear loading message
        // Call a dedicated function to build the HTML tree
        const treeElement = buildStructureTreeHtml(structureData);
        container.appendChild(treeElement);

        // --- Mark as Loaded ---
        targetPane.dataset.loaded = 'true';
        console.log("School structure loaded and rendered.");

    } catch (error) {
        console.error("Failed to load school structure:", error);
        container.innerHTML = `<p class="error-message">Error loading school structure: ${error.message}</p>`;
        // Do NOT mark as loaded if there was an error
    }
}

/**
 * Finds all expanded parent nodes within the tree and returns a Set of their unique IDs.
 * We use "type-id" as the key to handle potential ID overlaps between types (e.g., Class 1, Division 1).
 * @param {string} treeContainerSelector - CSS selector for the main tree container (e.g., '#structure-management-container').
 * @returns {Set<string>} A Set containing strings like "Division-1", "YearGroup-3".
 */
function getExpandedNodeIDs(treeContainerSelector) {
    const expandedNodes = document.querySelectorAll(`${treeContainerSelector} .tree-parent-node:not(.collapsed)`);
    const expandedIDs = new Set();
    expandedNodes.forEach(node => {
        if (node.dataset.id && node.dataset.type) {
            expandedIDs.add(`${node.dataset.type}-${node.dataset.id}`);
        }
    });
    return expandedIDs;
}

/**
 * Finds nodes matching the stored IDs and re-expands them.
 * @param {string} treeContainerSelector - CSS selector for the main tree container.
 * @param {Set<string>} idsToExpand - A Set of "type-id" strings from getExpandedNodeIDs.
 */
function reExpandNodes(treeContainerSelector, idsToExpand) {
    if (!idsToExpand || idsToExpand.size === 0) return; // Nothing to expand

    idsToExpand.forEach(typeIdKey => {
        const [type, id] = typeIdKey.split('-'); // Split "Type-ID" back
        if (!type || !id) return;

        // Find the corresponding LI element in the newly rendered tree
        const nodeToExpand = document.querySelector(`${treeContainerSelector} li.tree-parent-node[data-type='${type}'][data-id='${id}']`);

        if (nodeToExpand && nodeToExpand.classList.contains('collapsed')) { // Check if it exists and is collapsed
            nodeToExpand.classList.remove('collapsed'); // Expand it

            // Also update the toggle button icon inside this node
            const toggleButton = nodeToExpand.querySelector('button.toggle');
            if (toggleButton) {
                toggleButton.innerHTML = '−'; // Minus Sign
                toggleButton.setAttribute('aria-label', 'Collapse');
            }
        }
    });
}

// --- Helper function to build the HTML tree structure ---
// (Version ensures Add buttons are always within an expandable list)
function buildStructureTreeHtml(data) {
    console.log("Building structure tree HTML (Always Expandable Parents)...");
    const rootUl = document.createElement('ul');
    rootUl.className = 'structure-tree';

    // --- Top-level Add Division Button (defined once, appended at end) ---
    const addDivisionLi = document.createElement('li');
    addDivisionLi.className = 'add-item-control';
    addDivisionLi.innerHTML = `<button type="button" class="add-structure-btn action-button action-button-small" data-parent-id="null" data-parent-type="School" data-child-type="Division" title="Add New Division">+ Add Division</button>`;

    // --- Handle Divisions ---
    if (!data.divisions || data.divisions.length === 0) {
        const noDivisionsLi = document.createElement('li');
        noDivisionsLi.textContent = 'No divisions defined for this school.';
        noDivisionsLi.style.fontStyle = 'italic';
        noDivisionsLi.style.marginLeft = '20px'; // Indent slightly
        rootUl.appendChild(noDivisionsLi);
    } else {
        // Loop through existing Divisions
        data.divisions.forEach(division => {
            const divisionLi = document.createElement('li');
            divisionLi.className = 'tree-node division-node tree-parent-node collapsed'; // <<< Always parent & collapsed
            divisionLi.dataset.id = division.id;
            divisionLi.dataset.type = 'Division';
            divisionLi.dataset.name = division.name;

            // --- Always Add Toggle Button ---
            const toggleButtonDiv = document.createElement('button');
            toggleButtonDiv.type = 'button'; toggleButtonDiv.className = 'toggle';
            toggleButtonDiv.innerHTML = '+'; toggleButtonDiv.setAttribute('aria-label', 'Expand');
            divisionLi.appendChild(toggleButtonDiv);
            // --- End Toggle ---

            // Add Name Span
            const divisionSpan = document.createElement('span');
            divisionSpan.className = 'node-name';
            divisionSpan.textContent = esc(division.name);
            divisionLi.appendChild(divisionSpan);

            // Add Action Buttons Span (Rename/Delete for Division)
            const actionsSpan = document.createElement('span'); actionsSpan.className = 'node-actions';
            const renameDivButton = document.createElement('button'); /* ... */
            renameDivButton.type = 'button'; renameDivButton.className = 'rename-structure-btn'; renameDivButton.innerHTML = '✏️'; renameDivButton.title = `Rename Division ${esc(division.name)}`; renameDivButton.dataset.id = division.id; renameDivButton.dataset.type = 'Division'; renameDivButton.dataset.name = division.name;
            actionsSpan.appendChild(renameDivButton);
            const deleteDivButton = document.createElement('button'); /* ... */
            deleteDivButton.type = 'button'; deleteDivButton.className = 'delete-structure-btn'; deleteDivButton.innerHTML = '🗑️'; deleteDivButton.dataset.id = division.id; deleteDivButton.dataset.type = 'Division'; deleteDivButton.dataset.name = division.name;
            if (isDemoMode) { deleteDivButton.disabled = true; deleteDivButton.title='Deletion disabled'; deleteDivButton.classList.add('disabled-demo'); }
            else { deleteDivButton.title = `Delete Division ${esc(division.name)}`; }
            actionsSpan.appendChild(deleteDivButton);
            divisionLi.appendChild(actionsSpan);

            // --- Always create the UL for Year Groups ---
            const yearGroupUl = document.createElement('ul');
            yearGroupUl.className = 'tree-children'; // CSS handles hiding based on parent 'collapsed' class

            // Populate with existing Year Groups ONLY if they exist
            const hasYearGroups = division.year_groups && division.year_groups.length > 0;
            if (hasYearGroups) {
                division.year_groups.forEach(yearGroup => {
                    const yearGroupLi = document.createElement('li');
                    yearGroupLi.className = 'tree-node yeargroup-node tree-parent-node collapsed'; // <<< Always parent & collapsed
                    yearGroupLi.dataset.id = yearGroup.id; yearGroupLi.dataset.type = 'YearGroup'; yearGroupLi.dataset.name = yearGroup.name; yearGroupLi.dataset.parentId = division.id;

                    const hasClasses = yearGroup.classes && yearGroup.classes.length > 0;

                    // --- Always Add Toggle Button ---
                    const toggleButtonYg = document.createElement('button');
                    toggleButtonYg.type = 'button'; toggleButtonYg.className = 'toggle'; toggleButtonYg.innerHTML = '+'; toggleButtonYg.setAttribute('aria-label', 'Expand');
                    yearGroupLi.appendChild(toggleButtonYg);
                    // --- End Toggle ---

                    const yearGroupSpan = document.createElement('span'); yearGroupSpan.className = 'node-name'; yearGroupSpan.textContent = esc(yearGroup.name);
                    yearGroupLi.appendChild(yearGroupSpan);

                    // Actions for Year Group (Rename/Move/Delete)
                    const ygActionsSpan = document.createElement('span'); ygActionsSpan.className = 'node-actions';
                    const renameYgButton = document.createElement('button'); /* ... */
                    renameYgButton.type = 'button'; renameYgButton.className = 'rename-structure-btn'; renameYgButton.innerHTML = '✏️'; renameYgButton.title = `Rename Year Group ${esc(yearGroup.name)}`; renameYgButton.dataset.id = yearGroup.id; renameYgButton.dataset.type = 'YearGroup'; renameYgButton.dataset.name = yearGroup.name;
                    ygActionsSpan.appendChild(renameYgButton);
                    const moveYgButton = document.createElement('button'); /* ... */
                    moveYgButton.type = 'button'; moveYgButton.className = 'move-structure-btn'; moveYgButton.innerHTML = '➡️'; moveYgButton.title = `Move Year Group ${esc(yearGroup.name)}`; moveYgButton.dataset.id = yearGroup.id; moveYgButton.dataset.type = 'YearGroup'; moveYgButton.dataset.parentId = division.id;
                    ygActionsSpan.appendChild(moveYgButton);
                    const deleteYgButton = document.createElement('button'); /* ... */
                    deleteYgButton.type = 'button'; deleteYgButton.className = 'delete-structure-btn'; deleteYgButton.innerHTML = '🗑️'; deleteYgButton.dataset.id = yearGroup.id; deleteYgButton.dataset.type = 'YearGroup'; deleteYgButton.dataset.name = yearGroup.name;
                    if (isDemoMode) { deleteYgButton.disabled = true; deleteYgButton.title='Deletion disabled'; deleteYgButton.classList.add('disabled-demo'); }
                    else { deleteYgButton.title = `Delete Year Group ${esc(yearGroup.name)}`; }
                    ygActionsSpan.appendChild(deleteYgButton);
                    yearGroupLi.appendChild(ygActionsSpan);
                    // --- End Year Group Actions ---

                    // --- Always create the UL for Classes ---
                    const classUl = document.createElement('ul');
                    classUl.className = 'tree-children';

                    // Populate with existing Classes ONLY if they exist
                    if (hasClasses) {
                        yearGroup.classes.forEach(cls => {
                            const classLi = document.createElement('li');
                            classLi.className = 'tree-node class-node'; // Classes are leaves, not parents
                            classLi.dataset.id = cls.id; classLi.dataset.type = 'Class'; classLi.dataset.name = cls.name; classLi.dataset.parentId = yearGroup.id;

                            // Indent Placeholder (no toggle for classes)
                            const indentSpan = document.createElement('span'); indentSpan.className='toggle-placeholder'; classLi.appendChild(indentSpan);
                            // Name + Pupil Count
                            const classSpan = document.createElement('span'); classSpan.className = 'node-name';
                            classSpan.textContent = `${esc(cls.name)} (${cls.pupil_count} pupils)`;
                            classLi.appendChild(classSpan);

                            // Actions for Class (Rename/Move/Delete)
                            const clsActionsSpan = document.createElement('span'); clsActionsSpan.className = 'node-actions';
                            const renameClsButton = document.createElement('button'); /* ... */
                            renameClsButton.type = 'button'; renameClsButton.className = 'rename-structure-btn'; renameClsButton.innerHTML = '✏️'; renameClsButton.title = `Rename Class ${esc(cls.name)}`; renameClsButton.dataset.id = cls.id; renameClsButton.dataset.type = 'Class'; renameClsButton.dataset.name = cls.name;
                            clsActionsSpan.appendChild(renameClsButton);
                            const moveClsButton = document.createElement('button'); /* ... */
                             moveClsButton.type = 'button'; moveClsButton.className = 'move-structure-btn'; moveClsButton.innerHTML = '➡️'; moveClsButton.title = `Move Class ${esc(cls.name)}`; moveClsButton.dataset.id = cls.id; moveClsButton.dataset.type = 'Class'; moveClsButton.dataset.parentId = yearGroup.id;
                            clsActionsSpan.appendChild(moveClsButton);
                            const deleteClsButton = document.createElement('button'); /* ... */
                            deleteClsButton.type = 'button'; deleteClsButton.className = 'delete-structure-btn'; deleteClsButton.innerHTML = '🗑️'; deleteClsButton.dataset.id = cls.id; deleteClsButton.dataset.type = 'Class'; deleteClsButton.dataset.name = cls.name;
                            if (isDemoMode) { deleteClsButton.disabled = true; deleteClsButton.title='Deletion disabled'; deleteClsButton.classList.add('disabled-demo'); }
                            else { deleteClsButton.title = `Delete Class ${esc(cls.name)}`; }
                            clsActionsSpan.appendChild(deleteClsButton);
                            classLi.appendChild(clsActionsSpan);
                            // --- End Class Actions ---

                            classUl.appendChild(classLi); // Add Class LI to Class UL
                        }); // End classes.forEach
                    } // End if hasClasses

                    // --- Always Add "+ Add Class" button to the Class UL ---
                    const addClassLi = document.createElement('li');
                    addClassLi.className = 'add-item-control';
                    addClassLi.innerHTML = `<button type="button" class="add-structure-btn action-button action-button-small" data-parent-id="${yearGroup.id}" data-parent-type="YearGroup" data-child-type="Class" title="Add New Class to ${esc(yearGroup.name)}">+ Add Class</button>`;
                    classUl.appendChild(addClassLi);
                    // --- End Add Class ---

                    // Append class UL to Year Group LI
                    yearGroupLi.appendChild(classUl);
                    // --- End Class Handling ---

                    yearGroupUl.appendChild(yearGroupLi); // Append year group LI to year group UL
                }); // End yearGroups.forEach
            } // --- End if hasYearGroups ---

            // --- Always Add "+ Add Year Group" button to the Year Group UL ---
            const addYearGroupLi = document.createElement('li');
            addYearGroupLi.className = 'add-item-control';
            addYearGroupLi.innerHTML = `<button type="button" class="add-structure-btn action-button action-button-small" data-parent-id="${division.id}" data-parent-type="Division" data-child-type="YearGroup" title="Add New Year Group to ${esc(division.name)}">+ Add Year Group</button>`;
            yearGroupUl.appendChild(addYearGroupLi);
            // --- End Add Year Group ---

            // Append year group UL to Division LI
            divisionLi.appendChild(yearGroupUl);
            // --- End Year Group Handling ---

            rootUl.appendChild(divisionLi); // Append Division LI to Root UL
        }); // End divisions.forEach
    } // End if divisions exist

    // Append the top-level "+ Add Division" button LI
    rootUl.appendChild(addDivisionLi);

    console.log("Finished building structure tree HTML (always expandable parents).");
    return rootUl;
}

// Setup Listeners for Tree View Actions (Toggle, Add, Rename, Move, Delete)
function setupStructureTreeListeners(treeContainer) {
    if (!treeContainer) {
        console.error("setupStructureTreeListeners: treeContainer is null or undefined!");
        return;
    }
    // Prevent adding multiple listeners if function is called again accidentally
    if (treeContainer.dataset.treeListenerAttached === 'true') {
        console.warn("Tree listener already attached to:", treeContainer);
        return;
    }
    console.log("Attaching click listener for tree actions to:", treeContainer);

    treeContainer.addEventListener('click', (event) => {
        // Use closest() to find the relevant button from the clicked element
        const toggleButton = event.target.closest('button.toggle');
        const renameButton = event.target.closest('button.rename-structure-btn');
        const moveButton = event.target.closest('button.move-structure-btn');
        const deleteButton = event.target.closest('button.delete-structure-btn');
        const addButton = event.target.closest('button.add-structure-btn');

        // Handle based on which button was found (only one block should execute)
        if (toggleButton) {
            event.preventDefault();
            const parentLi = toggleButton.closest('.tree-parent-node');
            if (parentLi) {
                parentLi.classList.toggle('collapsed');
                const isCollapsed = parentLi.classList.contains('collapsed');
                toggleButton.innerHTML = isCollapsed ? '+' : '−';
                toggleButton.setAttribute('aria-label', isCollapsed ? 'Expand' : 'Collapse');
            }
        } else if (renameButton) {
            event.preventDefault();
            const id = renameButton.dataset.id;
            const type = renameButton.dataset.type;
            const name = renameButton.dataset.name;
            console.log(`Rename button clicked: Type=${type}, ID=${id}, Name=${name}`);
            handleRenameStructureClick(id, type, name); // Call rename handler
        } else if (moveButton) {
            event.preventDefault();
            const id = moveButton.dataset.id;
            const type = moveButton.dataset.type;
            const parentId = moveButton.dataset.parentId;
            console.log(`Move button clicked: Type=${type}, ID=${id}, CurrentParentID=${parentId}`);
            handleMoveStructureClick(id, type, parentId); // Call move handler
        } else if (deleteButton) {
            event.preventDefault();
            const id = deleteButton.dataset.id;
            const type = deleteButton.dataset.type;
            const name = deleteButton.dataset.name;
            console.log(`Delete button clicked: Type=${type}, ID=${id}, Name=${name}`);
            handleDeleteStructureClick(id, type, name); // Call delete handler (already partially implemented)
        } else if (addButton) {
            event.preventDefault();
            const parentId = addButton.dataset.parentId;
            const parentType = addButton.dataset.parentType;
            const childType = addButton.dataset.childType;
            console.log(`Add button clicked: ChildType=${childType}, ParentType=${parentType}, ParentID=${parentId}`);
            handleAddStructureClick(parentId, parentType, childType); // Call add handler (partially implemented)
        }
        // No else needed, just ignore clicks not on these buttons
    });
    treeContainer.dataset.treeListenerAttached = 'true'; // Mark listener as attached
}

// --- SCHOOL STRUCTURE Action Handlers ---

function handleAddStructureClick(parentId, parentType, childType) {
    console.log(`Add Structure: Add new ${childType} under ${parentType} ID ${parentId}`);
    // Existing logic to determine modalId, parentIdInputId, show modal, attach submit handler...
    let modalId = '';
    let formId = '';
    let parentIdInputId = '';
    let modalTitle = '';

    switch (childType) {
        case 'Division': modalId = 'add-division-modal'; formId = 'add-division-form'; modalTitle = 'Add New Division'; break;
        case 'YearGroup': modalId = 'add-yeargroup-modal'; formId = 'add-yeargroup-form'; parentIdInputId = 'add-yeargroup-parent-division-id'; modalTitle = `Add Year Group`; break; // Title set further below
        case 'Class': modalId = 'add-class-modal'; formId = 'add-class-form'; parentIdInputId = 'add-class-parent-yeargroup-id'; modalTitle = `Add Class`; break; // Title set further below
        default: alert("Unknown type to add."); return;
    }

    const modal = document.getElementById(modalId);
    const form = document.getElementById(formId);
    // ... (get other modal elements: errorDiv, titleElement) ...
     const errorDiv = modal ? modal.querySelector('.error-message') : null;
     const titleElement = modal ? modal.querySelector('h2') : null;


    if (!modal || !form || !errorDiv || !titleElement) { console.error(`Modal elements for ${modalId} not found!`); return; }

    form.reset(); errorDiv.textContent = ''; errorDiv.style.display = 'none';

    // Optionally fetch parent name to make title clearer
    let parentName = '';
    // TODO: Maybe fetch parent name based on parentId and parentType for title? For now, use IDs.
    if(parentType === 'Division') modalTitle = `Add Year Group to Division (ID: ${parentId})`;
    if(parentType === 'YearGroup') modalTitle = `Add Class to Year Group (ID: ${parentId})`;
    titleElement.textContent = modalTitle;


    if (parentIdInputId && parentId !== 'null') {
        const parentIdInput = document.getElementById(parentIdInputId);
        if (parentIdInput) parentIdInput.value = parentId;
        else console.error(`Hidden input ${parentIdInputId} not found`);
    }
     // TODO: Populate necessary dropdowns (e.g., Divisions for Add Year Group) if needed

    // Attach correct submit handler
    switch (childType) {
        case 'Division': form.onsubmit = handleAddDivisionSubmit; break;
        case 'YearGroup': form.onsubmit = handleAddYearGroupSubmit; break;
        case 'Class': form.onsubmit = handleAddClassSubmit; break;
    }

    modal.querySelector('.close-modal-button').onclick = () => modal.style.display = 'none';
    modal.querySelector('.cancel-button').onclick = () => modal.style.display = 'none';
    modal.style.display = 'flex';
    const firstInput = form.querySelector('input[type="text"]');
    if(firstInput) firstInput.focus();
}

// --- Add Class Submit Handler ---
async function handleAddClassSubmit(event) {
    event.preventDefault();
    const form = event.target; // The form#add-class-form
    const submitButton = form.querySelector('button[type="submit"]');
    const errorDiv = document.getElementById('add-class-error'); // Error div in this specific modal
    // Get the parent Year Group ID from the hidden input
    const yearGroupIdValue = document.getElementById('add-class-parent-yeargroup-id').value;

    if (!submitButton || !errorDiv) return;

    errorDiv.textContent = ''; errorDiv.style.display = 'none';
    submitButton.disabled = true; submitButton.textContent = 'Adding...';

    try {
        // --- Get Data ---
        const className = document.getElementById('add-class-name').value.trim();
        //const teacherId = document.getElementById('add-class-teacher-id')?.value; // If added teacher select

        // --- Validation ---
        if (!className) { throw new Error("Class name cannot be empty."); }
        const yearGroupId = parseInt(yearGroupIdValue, 10); // Convert stored ID
        if (isNaN(yearGroupId) || yearGroupId <= 0) { throw new Error("Invalid parent Year Group ID associated with this form."); }
        // Backend will validate yearGroupId belongs to school

        // --- Prepare Payload ---
        // Ensure keys match backend CreateClass handler expectations
        const payload = {
            class_name: className,
            year_group_id: yearGroupId
            // ...(teacherId && { teacher_id: teacherId }) // Conditionally add teacher ID if present
        };
        console.log("Submitting payload for new class:", payload);

        const expandedIDs = getExpandedNodeIDs('#structure-management-container'); // Get currently open IDs

        // --- API Call ---
        await fetchApi('/api/classes', { // Assuming this is your POST endpoint
            method: 'POST',
            body: JSON.stringify(payload)
        });

        // --- Success ---
        console.log(`Class "${className}" created successfully.`);
        const modal = document.getElementById('add-class-modal');
        if(modal) modal.style.display = 'none';

        // Show success message (optional)
        const messageDiv = document.getElementById('admin-message-area');
        if (messageDiv) { /* ... show success message ... */ }

        await loadSchoolStructure(); // Refresh the entire structure tree

        reExpandNodes('#structure-management-container', expandedIDs);

    } catch (error) {
        console.error("Error adding class:", error);
        if (errorDiv) { errorDiv.textContent = error.message; errorDiv.style.display = 'block'; }
    } finally {
        if (submitButton) { submitButton.disabled = false; submitButton.textContent = 'Add Class'; }
    }
}

// Handles submission of the Add Division modal
async function handleAddDivisionSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const errorDiv = document.getElementById('add-division-error'); // Use ID from Add Division modal

    if (!submitButton || !errorDiv) return;

    errorDiv.textContent = ''; errorDiv.style.display = 'none';
    submitButton.disabled = true; submitButton.textContent = 'Adding...';

    try {
        // 1. Get Data
        const divisionName = document.getElementById('add-division-name').value.trim();

        // 2. Validate
        if (!divisionName) { throw new Error("Division name cannot be empty."); }

        // 3. Prepare Payload
        const payload = { division_name: divisionName }; // Match backend expected key
        console.log("Submitting payload for new division:", payload);

        // --- Store expanded state BEFORE refresh ---
        const expandedIDs = getExpandedNodeIDs('#structure-management-container');

        // 4. API Call
        await fetchApi('/api/divisions', { method: 'POST', body: JSON.stringify(payload) });

        // 5. Success
        console.log(`Division "${divisionName}" created successfully.`);
        document.getElementById('add-division-modal').style.display = 'none'; // Close modal

        await loadSchoolStructure(); // Refresh tree
        reExpandNodes('#structure-management-container', expandedIDs); // Re-apply state

        // Optional success message
        const messageDiv = document.getElementById('admin-message-area');
        if (messageDiv) { /* ... show success message ... */ }


    } catch (error) {
        console.error("Error adding division:", error);
        if (errorDiv) { errorDiv.textContent = error.message; errorDiv.style.display = 'block'; }
    } finally {
        if (submitButton) { submitButton.disabled = false; submitButton.textContent = 'Add Division'; }
    }
}

// Handles submission of the Add Year Group modal
async function handleAddYearGroupSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const errorDiv = document.getElementById('add-yeargroup-error'); // Use ID from Add YG modal
    const parentDivisionIdValue = document.getElementById('add-yeargroup-parent-division-id').value; // Get parent ID

    if (!submitButton || !errorDiv) return;

    errorDiv.textContent = ''; errorDiv.style.display = 'none';
    submitButton.disabled = true; submitButton.textContent = 'Adding...';

    try {
        // 1. Get Data
        const yearGroupName = document.getElementById('add-yeargroup-name').value.trim();

        // 2. Validate
        if (!yearGroupName) { throw new Error("Year group name cannot be empty."); }
        const parentDivisionId = parseInt(parentDivisionIdValue, 10); // Convert parent ID
        if (isNaN(parentDivisionId) || parentDivisionId <= 0) { throw new Error("Invalid parent Division ID associated with form."); }
        // Backend MUST validate this division ID belongs to the school

        // 3. Prepare Payload
        const payload = {
            year_group_name: yearGroupName, // Match backend expected key
            division_id: parentDivisionId     // Match backend expected key
        };
        console.log("Submitting payload for new year group:", payload);

        // --- Store expanded state BEFORE refresh ---
        const expandedIDs = getExpandedNodeIDs('#structure-management-container');

        // 4. API Call
        await fetchApi('/api/yeargroups', { method: 'POST', body: JSON.stringify(payload) });

        // 5. Success
        console.log(`Year Group "${yearGroupName}" created successfully.`);
        document.getElementById('add-yeargroup-modal').style.display = 'none'; // Close modal

        await loadSchoolStructure(); // Refresh tree
        reExpandNodes('#structure-management-container', expandedIDs); // Re-apply state

         // Optional success message
        const messageDiv = document.getElementById('admin-message-area');
        if (messageDiv) { /* ... show success message ... */ }


    } catch (error) {
        console.error("Error adding year group:", error);
        if (errorDiv) { errorDiv.textContent = error.message; errorDiv.style.display = 'block'; }
    } finally {
        if (submitButton) { submitButton.disabled = false; submitButton.textContent = 'Add Year Group'; }
    }
}

// Called by Rename button click (✏️)
function handleRenameStructureClick(id, type, currentName) {
    console.log(`Rename Structure request: Edit ${type} ID ${id}, Current Name: ${currentName}`);

    const modal = document.getElementById('rename-structure-modal');
    const form = document.getElementById('rename-structure-form');
    const errorDiv = document.getElementById('rename-item-error');
    const titleElement = document.getElementById('rename-modal-title');
    const infoElement = document.getElementById('rename-item-info');
    const idInput = document.getElementById('rename-item-id');
    const typeInput = document.getElementById('rename-item-type');
    const nameInput = document.getElementById('rename-item-name');
    const submitButton = form ? form.querySelector('button[type="submit"]') : null;


    if (!modal || !form || !errorDiv || !titleElement || !infoElement || !idInput || !typeInput || !nameInput || !submitButton) {
        console.error("Rename modal elements not found!");
        alert("Error opening rename form.");
        return;
    }

    // Reset form and clear errors
    form.reset();
    errorDiv.textContent = ''; errorDiv.style.display = 'none';

    // Populate modal
    titleElement.textContent = `Rename ${type}`;
    infoElement.textContent = `${type} (ID: ${id})`; // Show ID for clarity
    idInput.value = id;
    typeInput.value = type;
    nameInput.value = currentName || ''; // Pre-fill with current name

    // Attach submit handler
    form.onsubmit = handleRenameStructureSubmit;

    // Attach close/cancel listeners
    const closeHandler = () => modal.style.display = 'none';
    modal.querySelector('.close-modal-button').onclick = closeHandler;
    modal.querySelector('.cancel-button').onclick = closeHandler;

    // Show modal and focus
    modal.style.display = 'flex';
    nameInput.focus();
    nameInput.select();
}


// Handles clicks on Move (Arrow) icons in the structure tree
function handleMoveStructureClick(id, type, currentParentId) {
    if (type === 'Division') return; // Divisions cannot be moved this way

    console.log(`Move request for ${type} ID: ${id}, Current Parent ID: ${currentParentId}`);

    const modal = document.getElementById('move-structure-modal');
    const form = document.getElementById('move-structure-form');
    const errorDiv = document.getElementById('move-item-error');
    const titleElement = document.getElementById('move-modal-title');
    const infoElement = document.getElementById('move-item-info');
    const idInput = document.getElementById('move-item-id');
    const typeInput = document.getElementById('move-item-type');
    const parentSelect = document.getElementById('move-item-parent-id');
    const parentLabel = document.getElementById('move-item-parent-label');
    const submitButton = form ? form.querySelector('button[type="submit"]') : null;

    if (!modal || !form || !errorDiv || !titleElement || !infoElement || !idInput || !typeInput || !parentSelect || !parentLabel || !submitButton) {
        console.error("Move modal elements not found!"); alert("Error opening move form."); return;
    }

    form.reset(); errorDiv.textContent = ''; errorDiv.style.display = 'none';

    // Populate info
    // Fetching current name would be better UX, but requires another API call or passing it via dataset
    titleElement.textContent = `Move ${type}`;
    infoElement.textContent = `${type} (ID: ${id})`; // Show ID being moved
    idInput.value = id;
    typeInput.value = type;

    // Populate Parent Dropdown
    parentSelect.innerHTML = ''; // Clear previous
    let availableParents = [];
    let parentTypeLabel = '';

    if (type === 'YearGroup') {
        availableParents = availableDivisions; // Use global list
        parentTypeLabel = 'New Parent Division:';
        const defaultOpt = document.createElement('option'); defaultOpt.value = ""; defaultOpt.textContent = `-- Select New Division --`; defaultOpt.disabled = true; defaultOpt.selected = true;
        parentSelect.appendChild(defaultOpt);
    } else if (type === 'Class') {
        availableParents = availableYearGroups; // Use global list
        parentTypeLabel = 'New Parent Year Group:';
        const defaultOpt = document.createElement('option'); defaultOpt.value = ""; defaultOpt.textContent = `-- Select New Year Group --`; defaultOpt.disabled = true; defaultOpt.selected = true;
        parentSelect.appendChild(defaultOpt);
    } else { return; /* Should not happen if called correctly */ }
    parentLabel.textContent = parentTypeLabel;

    // Add available parents to dropdown
    if (availableParents && availableParents.length > 0) {
        availableParents.forEach(parent => {
            // Do not allow selecting the current parent as the new parent
            if (String(parent.id) === String(currentParentId)) {
                return; // Skip adding current parent to the list of *new* parents
            }
            const option = document.createElement('option');
            option.value = parent.id; // Assumes ID type matches
            option.textContent = esc(parent.name);
            parentSelect.appendChild(option);
        });
        parentSelect.disabled = parentSelect.options.length <= 1; // Disable if only prompt exists
    } else {
        const noOpt = document.createElement('option'); noOpt.value = ""; noOpt.textContent = "-- No available parents --"; noOpt.disabled = true;
        parentSelect.appendChild(noOpt);
        parentSelect.disabled = true;
    }
     // Reset selection to prompt
     parentSelect.value = "";

    // Attach Submit Handler
    form.onsubmit = handleMoveStructureSubmit;

    // Attach Close/Cancel
    const closeHandler = () => modal.style.display = 'none';
    modal.querySelector('.close-modal-button').onclick = closeHandler;
    modal.querySelector('.cancel-button').onclick = closeHandler;

    // Show
    modal.style.display = 'flex';
    parentSelect?.focus();
}

// Handles submission of the Rename modal
async function handleRenameStructureSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const errorDiv = document.getElementById('rename-item-error');
    const id = document.getElementById('rename-item-id').value;
    const type = document.getElementById('rename-item-type').value;
    const newName = document.getElementById('rename-item-name').value.trim();

    if (!id || !type || !submitButton || !errorDiv) { console.error("Rename form invalid state"); return; }

    errorDiv.textContent = ''; errorDiv.style.display = 'none';
    submitButton.disabled = true; submitButton.textContent = 'Renaming...';

    try {
        if (!newName) { throw new Error("New name cannot be empty."); }

        let apiUrl = '';
        let payload = {};
        // Construct payload key based on backend handler expectation
        // Using specific keys like 'division_name' is safer if backend expects them
        // Using generic 'name' if backend handles based on type or context
        let nameKey = 'name'; // Default assumption, adjust if needed
        switch(type) {
            case 'Division':
                apiUrl = `/api/divisions/${id}/name`;
                nameKey = 'division_name'; // Example if backend expects specific key
                break;
            case 'YearGroup':
                 apiUrl = `/api/yeargroups/${id}/name`;
                 nameKey = 'year_group_name'; // Example
                 break;
            case 'Class':
                 apiUrl = `/api/classes/${id}/name`;
                 nameKey = 'class_name'; // Example
                 break;
            default:
                 throw new Error(`Unknown type cannot be renamed: ${type}`);
        }
        payload[nameKey] = newName; // Create payload like { "division_name": "New Name" }

        console.log(`Submitting PATCH to ${apiUrl} with payload:`, payload);
        const expandedIDs = getExpandedNodeIDs('#structure-management-container');

        // API Call
        await fetchApi(apiUrl, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });

        // Success
        console.log(`${type} ${id} renamed successfully to "${newName}".`);
        document.getElementById('rename-structure-modal').style.display = 'none'; // Close modal

        const messageDiv = document.getElementById('admin-message-area'); // Optional feedback
        if (messageDiv) { /* ... show success message ... */ }

        await loadSchoolStructure(); // Refresh tree
        reExpandNodes('#structure-management-container', expandedIDs);


    } catch (error) {
        console.error(`Error renaming ${type} ${id}:`, error);
        // Show error inside the modal
        errorDiv.textContent = error.message || `Could not rename ${type}.`;
        errorDiv.style.display = 'block';
    } finally {
        if (submitButton) { submitButton.disabled = false; submitButton.textContent = 'Rename'; }
    }
}

// Handles submission of the Move modal
async function handleMoveStructureSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const errorDiv = document.getElementById('move-item-error');
    const id = document.getElementById('move-item-id').value;
    const type = document.getElementById('move-item-type').value;
    const newParentIdValue = document.getElementById('move-item-parent-id').value;

    if (!id || !type || !newParentIdValue || !submitButton || !errorDiv) { console.error("Move form invalid state"); return; }

    errorDiv.textContent = ''; errorDiv.style.display = 'none';
    submitButton.disabled = true; submitButton.textContent = 'Moving...';

    try {
        if (newParentIdValue === "") { throw new Error("Please select a new parent."); }
        // Convert parent ID to number (assuming int32)
        const newParentId = parseInt(newParentIdValue, 10);
        if (isNaN(newParentId) || newParentId <= 0) { throw new Error("Invalid parent selected."); }

        let apiUrl = '';
        let payload = {};
        let parentIdKey = '';

        // Prepare API URL and payload based on type being moved
        // IMPORTANT: Ensure backend expects these specific keys in PATCH body
        switch(type) {
            case 'YearGroup':
                apiUrl = `/api/yeargroups/${id}/division`; // Use specific endpoint
                parentIdKey = 'division_id'; // Key backend expects
                payload[parentIdKey] = newParentId;
                break;
            case 'Class':
                 apiUrl = `/api/classes/${id}/yeargroup`; // Use specific endpoint
                 parentIdKey = 'year_group_id'; // Key backend expects
                 payload[parentIdKey] = newParentId;
                 break;
            default:
                 throw new Error(`Cannot move item of type: ${type}`);
        }
        console.log(`Submitting PATCH to ${apiUrl} with payload:`, payload);

        const expandedIDs = getExpandedNodeIDs('#structure-management-container');
        // API Call (Using PATCH)
        await fetchApi(apiUrl, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });

        // Success
        console.log(`${type} ${id} moved successfully to parent ${newParentId}.`);
        document.getElementById('move-structure-modal').style.display = 'none'; // Close modal
        await loadSchoolStructure(); // Refresh tree
        reExpandNodes('#structure-management-container', expandedIDs);

    } catch (error) {
        console.error(`Error moving ${type} ${id}:`, error);
        errorDiv.textContent = error.message || "Could not move item.";
        errorDiv.style.display = 'block';
    } finally {
        if (submitButton) { submitButton.disabled = false; submitButton.textContent = 'Move'; }
    }
}

// Handles clicks on the Delete (Trash) icons in the structure tree
async function handleDeleteStructureClick(id, type, name) {
    // Use name with fallback for messages
    const nameToDisplay = name || `${type} ID ${id}`;
    console.log(`Delete button clicked: Delete ${type} ID ${id} (Name: ${nameToDisplay})`);

    // 1. Demo Mode Check (Double-check here for safety)
    if (isDemoMode) {
        alert(`${type} deletion is disabled in demo mode.`);
        return;
    }

    // 2. Confirmation
    // Warn about potential child dependencies causing failure
    if (!confirm(`Are you sure you want to delete ${type} "${nameToDisplay}"?\nNote: Items can only be deleted when empty.`)) {
        console.log(`Deletion cancelled for ${type} ${id}.`);
        return; // Stop if user cancels
    }

    // 3. Determine API Endpoint
    let apiUrl = '';
    switch (type) {
        case 'Division':
            apiUrl = `/api/divisions/${id}`;
            break;
        case 'YearGroup':
            apiUrl = `/api/yeargroups/${id}`;
            break;
        case 'Class':
            apiUrl = `/api/classes/${id}`;
            break;
        default:
            console.error(`Unknown type encountered in handleDeleteStructureClick: ${type}`);
            alert(`Error: Cannot delete item of unknown type "${type}".`);
            return;
    }

    // 4. API Call
    console.log(`Proceeding with DELETE request to ${apiUrl}`);
    const messageDiv = document.getElementById('admin-message-area'); // Optional: for feedback
    if (messageDiv) messageDiv.textContent = ''; // Clear previous messages

    try {
        const expandedIDs = getExpandedNodeIDs('#structure-management-container'); // Store state

        await fetchApi(apiUrl, { method: 'DELETE' });

        // 5. Handle Success
        console.log(`${type} ${id} (${nameToDisplay}) deleted successfully.`);
        if (messageDiv) {
             messageDiv.textContent = `${type} "${nameToDisplay}" deleted successfully.`;
             messageDiv.className = 'message-area success-message';
             setTimeout(() => { if(messageDiv) messageDiv.textContent = ''; messageDiv.className = 'message-area'; }, 3000);
        } else {
            alert(`${type} "${nameToDisplay}" deleted successfully.`); // Fallback
        }

        // Refresh the entire structure view to reflect the deletion
        // Ensure loadSchoolStructure clears previous content before loading
        await loadSchoolStructure();
        reExpandNodes('#structure-management-container', expandedIDs); // Re-apply state

    } catch (error) {
        // 6. Handle Error
        console.error(`Failed to delete ${type} ${id}:`, error);
        let userMessage = error.message || `Could not delete ${type}.`;
        // Check for specific conflict error likely sent from backend
        if (error.message && error.message.toLowerCase().includes('conflict: child records exist')) {
             userMessage = `Cannot delete ${type} "${nameToDisplay}" because it still contains items. Please delete or reassign them first.`;
        }
        // Display error
         if (messageDiv) {
            messageDiv.textContent = userMessage;
            messageDiv.className = 'message-area error-message';
        } else {
            alert(`Error: ${userMessage}`); // Fallback alert
        }
    }
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