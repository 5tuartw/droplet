// --- STATE VARIABLES ---
// Defined globally within this script's scope
let currentView = 'my'; // Default view: 'my', 'all', 'upcoming'
let selectedTargets = []; // Array to hold target objects {type, id, name} added in the modal form
let isEditMode = false; // Flag to track if the modal is for creating or editing
let currentlyEditingDropId = null; // Store the ID of the drop being edited

// --- HELPER / HANDLER FUNCTIONS ---
// Define all functions needed by initialization or event listeners here

// Fallback escape function if common.js doesn't provide it globally
const esc = typeof escapeHtml === 'function' ? escapeHtml : (s => s || '');

// Date Formatting Helper
function formatIsoDateForInput(isoDateString) {
    if (!isoDateString || isoDateString.startsWith('0001-01-01')) return '';
    try { return isoDateString.substring(0, 10); }
    catch (e) { console.error("Error formatting date:", e); return ''; }
}

// Update active button / title / state variable
function setActiveView(view) {
    currentView = view; // Update global state variable
    const viewMyDropsBtn = document.getElementById('view-my-drops-btn');
    const viewAllDropsBtn = document.getElementById('view-all-drops-btn');
    const viewUpcomingDropsBtn = document.getElementById('view-upcoming-drops-btn');
    const mainTitle = document.querySelector('.main-content h1');
    if (!viewMyDropsBtn || !viewAllDropsBtn || !viewUpcomingDropsBtn || !mainTitle) return;
    [viewMyDropsBtn, viewAllDropsBtn, viewUpcomingDropsBtn].forEach(btn => btn?.classList.remove('active'));
    if (view === 'my') { viewMyDropsBtn?.classList.add('active'); mainTitle.textContent = 'Drops for Me'; }
    else if (view === 'all') { viewAllDropsBtn?.classList.add('active'); mainTitle.textContent = 'Drops for Anyone'; }
    else if (view === 'upcoming') { viewUpcomingDropsBtn?.classList.add('active'); mainTitle.textContent = 'Upcoming Drops'; }
}

// Setup View Toggle Button Listeners
function setupViewToggleListeners(myBtn, allBtn, upcomingBtn) {
    // Pass elements in to avoid re-querying
    if (myBtn) { myBtn.addEventListener('click', () => { if (currentView !== 'my') { setActiveView('my'); fetchAndDisplayDrops(); } }); }
    else { console.warn("View My Drops button not found for listener."); }
    if (allBtn) { allBtn.addEventListener('click', () => { if (currentView !== 'all') { setActiveView('all'); fetchAndDisplayDrops(); } }); }
    else { console.warn("View All Drops button not found for listener."); }
    if (upcomingBtn) { upcomingBtn.addEventListener('click', () => { if (currentView !== 'upcoming') { setActiveView('upcoming'); fetchAndDisplayDrops(); } }); }
    else { console.warn("View Upcoming Drops button not found for listener."); }
}

// Setup Main Modal Button Listeners
function setupModalEventListeners(modal, closeBtn, cancelBtn, openBtn, form) {
     if (!modal || !form) { console.error("Cannot setup modal listeners: Modal or Form element not found."); return; }
     if (openBtn) { openBtn.addEventListener('click', () => showCreateDropModal()); }
     else { console.warn("Show Create Modal button not found."); }
     if (closeBtn) { closeBtn.addEventListener('click', closeCreateDropModal); }
     else { console.warn("Modal close button not found."); }
     if (cancelBtn) { cancelBtn.addEventListener('click', closeCreateDropModal); }
     else { console.warn("Modal cancel button not found."); }
     form.addEventListener('submit', handleCreateOrUpdateDropSubmit);
}

// Setup Target Selection Listeners
function setupTargetSelectionListeners(typeSelect, nameSelect, addBtn, errorDiv, listUl) {
     if (!typeSelect || !nameSelect || !addBtn || !listUl) { console.warn("One or more target selection elements not found. Target selection disabled."); return; }
     const targetNameSelectorDiv = document.getElementById('target-name-selector');

     typeSelect.addEventListener('change', async () => {
            const selectedType = typeSelect.value;
            nameSelect.innerHTML = '<option value="" selected disabled>-- Select Name --</option>';
            nameSelect.disabled = true;
            addBtn.disabled = true;
            if(errorDiv) errorDiv.textContent = '';
            if (!selectedType) { if(targetNameSelectorDiv) targetNameSelectorDiv.style.display = 'none'; return; };
            if (selectedType === 'General') { if(targetNameSelectorDiv) targetNameSelectorDiv.style.display = 'none'; addBtn.disabled = false; return; }
            if(targetNameSelectorDiv) targetNameSelectorDiv.style.display = 'block';
            nameSelect.innerHTML = '<option value="" selected disabled>Loading...</option>';
            let apiUrl = '';
            switch (selectedType) { /* ... cases for Division, YearGroup, Class, Student ... */
                case 'Division': apiUrl = '/api/divisions'; break;
                case 'YearGroup': apiUrl = '/api/yeargroups'; break;
                case 'Class': apiUrl = '/api/classes'; break;
                case 'Student': apiUrl = '/api/pupils/lookup'; break; // Use lookup
                default: if(errorDiv) errorDiv.textContent = `Invalid target type.`; return;
            }
            try {
                const items = await fetchApi(apiUrl);
                nameSelect.innerHTML = '<option value="" selected disabled>-- Select Name --</option>';
                if (items && items.length > 0) {
                    items.forEach(item => {
                        const option = document.createElement('option');

                        // --- Determine ID and Name based on TYPE and ACTUAL API Response ---
                        let itemID = null;
                        let displayName = '';
                        const currentSelectedType = typeSelect.value; // Re-read selectedType inside loop just in case

                        itemID = item.id;

                        // Get Display Name based on Type
                        switch (currentSelectedType) {
                            case 'Division':
                                displayName = item.division_name;
                                break;
                            case 'YearGroup':
                                displayName = item.year_group_name;
                                break;
                            case 'Class':
                                displayName = item.class_name;
                                break;
                            case 'Student':
                                let first = item.first_name || '';
                                let last = item.surname || '';
                                displayName = `${first} ${last}`.trim();
                                if (displayName === ' ') displayName = ''; // Handle empty names
                                break;
                        }

                        // Fallback display name if specific name wasn't found
                        if (!displayName) {
                            displayName = `ID: ${itemID}`;
                        }

                        // --- Set option value and text ---
                        if (itemID !== null) { // Only add option if ID is valid
                            option.value = itemID; // Use the extracted ID
                            option.textContent = esc(displayName); // Use the extracted name
                            nameSelect.appendChild(option);
                        }
                    });
                    nameSelect.disabled = false; // Enable name select
                } else {
                    // ... handle no items found ...
                    nameSelect.innerHTML = `<option value="" selected disabled>-- No ${selectedType}s found --</option>`;
                }
            } catch (error) { /* ... handle error ... */
                 console.error(`Error fetching ${selectedType} list:`, error);
                 if(errorDiv) errorDiv.textContent = `Error loading ${selectedType} list.`;
                 nameSelect.innerHTML = `<option value="" selected disabled>-- Error Loading --</option>`;
            }
        });
    nameSelect.addEventListener('change', () => { addBtn.disabled = !nameSelect.value || nameSelect.value === ""; });
    addBtn.addEventListener('click', handleAddTarget);
    listUl.addEventListener('click', handleRemoveTarget);
}

// Setup Listeners for Edit/Delete buttons in the main drops list (using delegation)
function setupDropsListListeners(listDiv) {
     if (listDiv) {
        listDiv.addEventListener('click', (event) => { /* ... handle edit/delete clicks using closest() ... */
             const editButton = event.target.closest('.edit-btn');
             const deleteButton = event.target.closest('.delete-btn');
             if (editButton) { const dropId = editButton.dataset.dropId; if (dropId) handleEditClick(dropId); }
             else if (deleteButton) { const dropId = deleteButton.dataset.dropId; if (dropId) deleteDrop(dropId); }
        });
    } else { console.warn("Drops list container (#drops-list) not found for event delegation."); }
}

// --- Target Handling Functions ---
function handleAddTarget() { /* ... Keep your existing add target logic ... */
    const typeSelect = document.getElementById('new-target-type');
    const nameSelect = document.getElementById('new-target-name');
    const errorDiv = document.getElementById('create-drop-error');
    if (!typeSelect || !nameSelect || !errorDiv) return;
    const type = typeSelect.value;
    const idValue = nameSelect.value;
    const name = nameSelect.selectedOptions[0]?.textContent || 'N/A';
    if (!type || (type !== 'General' && !idValue)) { /* show error */ return; }
    let id = (type === 'General') ? 0 : idValue; // Store ID as string or parse if needed by model
    const displayName = (type === 'General') ? 'General' : name;
    const isDuplicate = selectedTargets.some(target => target.type === type && String(target.id) === String(id));
    if (isDuplicate) { /* show error */ return; }
    const newTarget = { type: type, id: id, name: displayName };
    selectedTargets.push(newTarget);
    updateSelectedTargetsUI();
    // Reset controls
    nameSelect.value = "";
    if(typeSelect.value !== 'General') nameSelect.disabled = false;
    document.getElementById('add-target-btn').disabled = true;
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
}

function handleRemoveTarget(event) {
    if (event.target && event.target.classList.contains('remove-target-btn')) {
        const indexToRemove = parseInt(event.target.dataset.targetIndex, 10);
        if (!isNaN(indexToRemove) && indexToRemove >= 0 && indexToRemove < selectedTargets.length) {
            selectedTargets.splice(indexToRemove, 1);
            updateSelectedTargetsUI();
        }
    }
}

function updateSelectedTargetsUI() {
    const listUl = document.getElementById('selected-targets-list');
    if (!listUl) return;
    listUl.innerHTML = '';
    if (selectedTargets.length === 0) { /* show placeholder */
        listUl.innerHTML = '<li id="no-targets-added" style="color: #777; font-style: italic;">No targets added yet.</li>';
    } else { /* render list items */
         selectedTargets.forEach((target, index) => {
             const li = document.createElement('li');
             const targetDisplay = target.name || target.type || 'Unknown Target';
             li.innerHTML = `<span>${esc(target.type)}: ${esc(targetDisplay)}</span><button type="button" class="remove-target-btn" data-target-index="${index}" title="Remove Target">&times;</button>`;
            listUl.appendChild(li);
        });
    }
}

// --- Main Data Fetching and Display ---
// --- Main Data Fetching and Display ---
async function fetchAndDisplayDrops() {
    // Get elements (ensure these IDs exist in drops.html)
    const dropsListDiv = document.getElementById('drops-list');
    const errorMessageDiv = document.getElementById('error-message');
    if (!dropsListDiv || !errorMessageDiv) {
        console.error("Drops list or error message div not found!");
        return; 
    }

    errorMessageDiv.textContent = ''; // Clear previous errors
    dropsListDiv.innerHTML = '<p>Loading drops...</p>'; // Set loading state

    // Determine API URL based on the global currentView state variable
    let apiUrl = '';
    if (currentView === 'my') {
        apiUrl = '/api/mydrops';
    } else if (currentView === 'all') {
        apiUrl = '/api/drops';
    } else if (currentView === 'upcoming') {
        apiUrl = '/api/upcomingdrops'; // <<< Verify this endpoint exists on your backend
    } else {
        console.error("Invalid view state:", currentView);
        errorMessageDiv.textContent = "Error: Invalid view selected.";
        dropsListDiv.innerHTML = ''; // Clear loading message
        return;
    }

    console.log(`Workspaceing ${apiUrl} (View: ${currentView})...`);

    try {
        // Use fetchApi for authenticated request
        const drops = await fetchApi(apiUrl);

        // Validate response format
        if (!drops || !Array.isArray(drops)) {
            console.error("Invalid response format for drops list:", drops);
            dropsListDiv.innerHTML = '<p class="error-message">Could not load drops (invalid data format received).</p>';
            return; // Stop processing
        }

        dropsListDiv.innerHTML = ''; // Clear loading/previous content

        if (drops.length > 0) {
            const ul = document.createElement('ul');
            // Get current user info ONCE before the loop for efficiency
            const userInfo = getUserInfo(); // From common.js

            drops.forEach(drop => {
                const li = document.createElement('li');
                // Use esc() helper for all potentially unsafe content
                const title = esc(drop.title) || 'Untitled Drop';
                const content = esc(drop.content) || '';
                // Format dates nicely, handle potential null or zero dates from Go
                const postDateStr = formatIsoDateForInput(drop.post_date) ? new Date(drop.post_date).toLocaleDateString() : 'Now';
                const expireDateStr = formatIsoDateForInput(drop.expire_date) ? new Date(drop.expire_date).toLocaleDateString() : 'Never';

                // Generate Target Badges HTML
                let targetsHtml = '';
                if (drop.targets && Array.isArray(drop.targets) && drop.targets.length > 0) {
                    targetsHtml = drop.targets.map(target => {
                        let badgeClass = 'target-general';
                        const typeLower = target.type ? target.type.toLowerCase() : 'general';
                        // Map types to CSS classes
                        if (typeLower === 'division') badgeClass = 'target-division';
                        else if (typeLower === 'yeargroup') badgeClass = 'target-yeargroup';
                        else if (typeLower === 'class') badgeClass = 'target-class';
                        else if (typeLower === 'student' || typeLower === 'pupil') badgeClass = 'target-student';
                        // Add other types like 'custom' if needed
                        // Use target.name provided by API (JOINed in backend), fallback to type
                        const targetDisplay = target.name || target.type || 'Target';
                        return `<span class="target-badge ${badgeClass}">${esc(targetDisplay)}</span>`;
                    }).join('');
                }

                // Determine if Edit/Delete Actions should be shown
                let showActions = false;
                if (userInfo) {
                    if (userInfo.role && userInfo.role.toLowerCase() === 'admin') {
                        showActions = true;
                    } else if (userInfo.id === drop.user_id) { // Assumes API sends drop.user_id (lowercase/snake)
                        showActions = true;
                    }
                }
                // Generate actions HTML with data attributes for delegation
                const actionsHtml = showActions ? `
                    <div class="drop-actions">
                        <button class="edit-btn" data-drop-id="${esc(drop.id)}" title="Edit Drop">✏️</button>
                        <button class="delete-btn" data-drop-id="${esc(drop.id)}" title="Delete Drop">🗑️</button>
                    </div>` : '';

                // Creator Info (Show in 'all' view if available)
                // Assumes API sends drop.author_name (lowercase/snake)
                const creatorInfo = (currentView === 'all' && drop.author_name) ? ` | By: ${esc(drop.author_name)}` : '';

                // Tooltip Info
                let tooltipText = '';
                if (drop.author_name) {
                    tooltipText += `Added by: ${esc(drop.author_name)}`;
                    if (drop.created_at && !drop.created_at.startsWith('0001-01-01')) {
                        tooltipText += ` on ${new Date(drop.created_at).toLocaleString()}`;
                    }
                } else if (drop.user_id) { // Fallback to user ID
                    tooltipText += `Added by: User ID ${esc(drop.user_id)}`;
                }
                // Add editor info if present (assuming drop.editor_name from API)
                if (drop.editor_name) {
                    tooltipText += `\nLast edited by: ${esc(drop.editor_name)}`;
                    if (drop.updated_at && !drop.updated_at.startsWith('0001-01-01')) {
                        tooltipText += ` on ${new Date(drop.updated_at).toLocaleString()}`;
                    }
                }
                li.setAttribute('title', tooltipText.trim()); // Set tooltip on the list item

                // Construct Full List Item HTML
                li.innerHTML = `
                    <div class="drop-header">
                        <div><span class="drop-title">${title}</span>${targetsHtml}</div>
                        
                    </div>
                    <div class="drop-content">${content}</div>
                    <div class="drop-footer">
                        <div class="drop-meta">Posted: ${postDateStr} | Expires: ${expireDateStr}${creatorInfo}</div>
                    ${actionsHtml}</div>`;
                ul.appendChild(li);
            }); // End drops.forEach

            dropsListDiv.appendChild(ul);
            // NOTE: No need to call setupDropsListListeners here if it was called once
            // in initializeDropsPage attaching listener to dropsListDiv (event delegation).
        } else {
            // Show empty message based on currentView
            let emptyMsg = 'No drops found for this view.';
            if (currentView === 'my') emptyMsg = 'You have no relevant drops yet.';
            else if (currentView === 'all') emptyMsg = 'There are no active drops for your school.';
            else if (currentView === 'upcoming') emptyMsg = 'There are no upcoming drops scheduled.';
            dropsListDiv.innerHTML = `<p>${emptyMsg}</p>`;
        }
    } catch (error) {
        // Handle errors from fetchApi or rendering
        console.error(`Error fetching ${currentView} drops:`, error);
        errorMessageDiv.textContent = `Failed to load drops: ${error.message}`;
        dropsListDiv.innerHTML = `<p style="color: red;">Could not load drops.</p>`;
    }
} // --- End of fetchAndDisplayDrops ---

// --- Edit/Delete Handlers for Drops ---
async function handleEditClick(dropId) { /* ... Keep your existing edit logic ... */
    const errorMessageDiv = document.getElementById('error-message');
    if(errorMessageDiv) errorMessageDiv.textContent = '';
    try {
        const dropData = await fetchApi(`/api/drops/${dropId}`);
        if (!dropData) throw new Error("Drop not found.");
        showCreateDropModal(dropData);
    } catch (error) {
        console.error("Error fetching drop for edit:", error);
        if(errorMessageDiv) errorMessageDiv.textContent = `Error loading drop for edit: ${error.message}`;
    }
}

async function deleteDrop(dropId) { /* ... Keep your existing delete logic ... */
     if (!confirm('Are you sure you want to delete this drop?')) return;
     const errorMessageDiv = document.getElementById('error-message');
     if(errorMessageDiv) errorMessageDiv.textContent = '';
     try {
         await fetchApi(`/api/drops/${dropId}`, { method: 'DELETE' });
         fetchAndDisplayDrops();
     } catch(error) {
         console.error('Error deleting drop:', error);
         if(errorMessageDiv) errorMessageDiv.textContent = error.message;
     }
}

// --- Modal Show/Submit Functions ---
function showCreateDropModal(dropDataToEdit = null) {
    // --- Get All Necessary Modal Elements ---
    const modal = document.getElementById('create-drop-modal');
    const form = document.getElementById('create-drop-form');
    const errorDiv = document.getElementById('create-drop-error');
    const titleElement = document.getElementById('modal-title');
    const submitButton = form ? form.querySelector('button[type="submit"]') : null;
    const dropTitleInput = document.getElementById('drop-title');
    const dropContentInput = document.getElementById('drop-content');
    const postDateInput = document.getElementById('drop-post-date');
    const expireDateInput = document.getElementById('drop-expire-date');
    const targetTypeSelect = document.getElementById('new-target-type');
    const targetNameSelect = document.getElementById('new-target-name');
    const addTargetBtn = document.getElementById('add-target-btn');
    const selectedTargetsListUl = document.getElementById('selected-targets-list');
    const targetNameSelectorDiv = document.getElementById('target-name-selector');

    // Check if essential modal elements exist
    if (!modal || !form || !errorDiv || !titleElement || !submitButton || !dropTitleInput || !dropContentInput || !postDateInput || !expireDateInput || !targetTypeSelect || !targetNameSelect || !addTargetBtn || !selectedTargetsListUl) {
        console.error("Cannot show modal, one or more essential modal elements are missing in the HTML.");
        alert("Error: Could not display the drop form correctly.");
        return;
    }

    // --- Reset Form State for Create Mode (Default) ---
    console.log("Resetting modal form and state for potential new drop...");
    form.reset(); // Clears input fields like title, content, dates
    errorDiv.textContent = ''; // Clear previous errors
    errorDiv.style.display = 'none';
    selectedTargets = []; // Clear selected targets array
    updateSelectedTargetsUI(); // Update the displayed list (will show placeholder)
    targetTypeSelect.value = ''; // Reset target type dropdown
    targetNameSelect.innerHTML = '<option value="" selected disabled>-- Select Name --</option>'; // Reset name dropdown
    targetNameSelect.disabled = true;
    addTargetBtn.disabled = true;
    if(targetNameSelectorDiv) targetNameSelectorDiv.style.display = 'block'; // Ensure name dropdown container is visible initially

    // Reset state variables to Create mode defaults
    isEditMode = false;
    currentlyEditingDropId = null;

    // --- Check if Edit Mode ---
    if (dropDataToEdit && dropDataToEdit.id) {
        console.log("Populating modal for EDIT mode. Drop ID:", dropDataToEdit.id);
        isEditMode = true;
        currentlyEditingDropId = dropDataToEdit.id; // Store the ID being edited

        // Set modal title and button text for Edit
        titleElement.textContent = 'Edit Drop';
        submitButton.textContent = 'Save Changes';

        // Populate form fields with existing data
        dropTitleInput.value = dropDataToEdit.title || '';
        dropContentInput.value = dropDataToEdit.content || '';
        postDateInput.value = formatIsoDateForInput(dropDataToEdit.post_date); // Use formatter
        expireDateInput.value = formatIsoDateForInput(dropDataToEdit.expire_date); // Use formatter

        // Populate the selectedTargets array from fetched data
        // Map structure must match {type, id, name} used by updateSelectedTargetsUI etc.
        // Assuming API returns targets with type, id, and name. Adjust if needed.
        console.log("Raw targets from API:", dropDataToEdit.targets); // DEBUG LINE
        selectedTargets = (dropDataToEdit.targets || []).map(t => ({
            type: t.type,
            id: t.id, // Ensure type matches (string UUID? int32?)
            name: t.name || t.type // Use name from API, fallback to type
         }));
        console.log("selectedTargets array populated for edit:", selectedTargets); // DEBUG LINE
        updateSelectedTargetsUI(); // Update display list with existing targets

    } else {
        console.log("Opening modal for CREATE mode.");
        titleElement.textContent = 'Create New Drop';
        submitButton.textContent = 'Create Drop';
    }

    // --- Show Modal and Set Focus ---
    modal.style.display = 'flex'; // Display the modal using flex for centering
    dropTitleInput?.focus(); // Focus the first field for better UX

}

function closeCreateDropModal() {
    const modal = document.getElementById('create-drop-modal');
    const form = document.getElementById('create-drop-form'); // Get form
    const errorDiv = document.getElementById('create-drop-error'); // Get error div

    if (modal) modal.style.display = 'none'; // Hide modal

    // Reset state flags
    isEditMode = false;
    currentlyEditingDropId = null;
    selectedTargets = [];
    if (form) form.reset();
    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
    }
    updateSelectedTargetsUI(); 

    console.log("Modal closed, edit flags, targets, form, and errors reset.");
}

// Combined Create/Update Handler
async function handleCreateOrUpdateDropSubmit(event) {
    event.preventDefault(); // Prevent default HTML form submission
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const errorDiv = document.getElementById('create-drop-error'); // Error div inside the modal

    // Basic check for necessary elements
    if (!submitButton || !errorDiv) {
        console.error("Submit button or error div not found in modal form.");
        return;
    }

    // --- Prepare UI for Submission ---
    errorDiv.textContent = ''; // Clear previous errors
    errorDiv.style.display = 'none';
    submitButton.disabled = true; // Disable button during submission
    const originalButtonText = isEditMode ? 'Save Changes' : 'Create Drop'; // Store original text
    submitButton.textContent = isEditMode ? 'Saving...' : 'Creating...';

    try {
        // --- 1. Gather Form Data ---
        const title = document.getElementById('drop-title').value.trim();
        const content = document.getElementById('drop-content').value.trim();
        const postDateValue = document.getElementById('drop-post-date').value; // Gets YYYY-MM-DD string or empty
        const expireDateValue = document.getElementById('drop-expire-date').value; // Gets YYYY-MM-DD string or empty
        // 'selectedTargets' array is already populated globally by handleAddTarget/handleRemoveTarget

        // --- 2. Client-Side Validation ---
        if (!title && !content) {
            throw new Error('Title or Content must be provided.');
        }

        // --- 3. Prepare Payload ---
        // Start with fields always present
        const payload = {
            title: title,
            content: content,
            // Map selectedTargets to the {type, id} format expected by backend
            targets: selectedTargets.map(t => ({
                type: t.type,
                // Explicitly convert ID to number right before sending
                // Use Number() for robust conversion from string or existing number
                id: (t.type === 'General') ? 0 : Number(t.id)
            }))
        };
        // Conditionally add dates only if they have a value
        if (postDateValue) {
            payload.post_date = postDateValue;
        }
        if (expireDateValue) {
            payload.expire_date = expireDateValue;
        }
        console.log("Submitting payload:", payload); // Log for debugging

        // --- 4. Determine Method and URL ---
        let method = isEditMode ? 'PUT' : 'POST';
        let apiUrl = isEditMode ? `/api/drops/${currentlyEditingDropId}` : '/api/drops';
        console.log(`Submitting ${method} request to ${apiUrl}`);

        // --- 5. Make the API Call ---
        // Use fetchApi, which handles auth header and basic error responses (like 401 redirect)
        await fetchApi(apiUrl, {
            method: method,
            body: JSON.stringify(payload)
            // fetchApi should automatically set 'Content-Type': 'application/json'
        });

        // --- 6. Handle Success ---
        console.log(`Drop ${isEditMode ? 'updated' : 'created'} successfully!`);
        closeCreateDropModal();    // Close the modal (also resets edit flags)
        fetchAndDisplayDrops();    // Refresh the main drop list to show changes

        // Optional: Add animation here? e.g., briefly highlight the new/updated drop
        // Optional: Show a temporary success message on the main page?

    } catch (error) {
        // --- Handle ANY errors (from validation or fetchApi) ---
        console.error(`Error ${isEditMode ? 'updating' : 'creating'} drop:`, error);
        errorDiv.textContent = error.message || `An unexpected error occurred. Please try again.`;
        errorDiv.style.display = 'block'; // Show the error div

    } finally {
        // --- Always re-enable submit button and restore text ---
         submitButton.disabled = false;
         submitButton.textContent = originalButtonText;
    }
}

// --- PAGE INITIALIZATION (AFTER AUTH CHECK) ---
// This function contains the setup logic that runs ONLY if the initial auth check passes
function initializeDropsPage() {
    console.log("===> START Initializing drops page UI and listeners... ===");

    // --- Element Getters ---
    console.log("Getting elements...");
    const dropsListDiv = document.getElementById('drops-list');
    if (!dropsListDiv) console.error("Element #drops-list NOT FOUND!");
    const errorMessageDiv = document.getElementById('error-message');
    if (!errorMessageDiv) console.error("Element #error-message NOT FOUND!");
    const viewMyDropsBtn = document.getElementById('view-my-drops-btn');
    if (!viewMyDropsBtn) console.warn("Element #view-my-drops-btn not found!");
    const viewAllDropsBtn = document.getElementById('view-all-drops-btn');
    if (!viewAllDropsBtn) console.warn("Element #view-all-drops-btn not found!");
    const viewUpcomingDropsBtn = document.getElementById('view-upcoming-drops-btn');
    if (!viewUpcomingDropsBtn) console.warn("Element #view-upcoming-drops-btn not found!");
    const mainTitle = document.querySelector('.main-content h1');
    if (!mainTitle) console.error("Element .main-content h1 NOT FOUND!");
    // Modal Elements
    const createDropModal = document.getElementById('create-drop-modal');
     if (!createDropModal) console.error("Element #create-drop-modal NOT FOUND!");
    const modalCloseButton = document.getElementById('modal-close-btn');
     if (!modalCloseButton) console.warn("Element #modal-close-btn not found!");
    const modalCancelButton = document.getElementById('modal-cancel-btn');
    if (!modalCancelButton) console.warn("Element #modal-cancel-btn not found!");
    const showCreateModalButton = document.getElementById('show-create-modal-btn');
     if (!showCreateModalButton) console.warn("Element #show-create-modal-btn not found!");
    const createDropForm = document.getElementById('create-drop-form');
     if (!createDropForm) console.error("Element #create-drop-form NOT FOUND!");
    const createDropErrorDiv = document.getElementById('create-drop-error');
    if (!createDropErrorDiv) console.warn("Element #create-drop-error not found!");
    const modalTitleElement = document.getElementById('modal-title');
    if (!modalTitleElement) console.error("Element #modal-title NOT FOUND!");
    // Target Selection Elements
    const newTargetTypeSelect = document.getElementById('new-target-type');
    if (!newTargetTypeSelect) console.warn("Element #new-target-type not found!");
    const newTargetNameSelect = document.getElementById('new-target-name');
    if (!newTargetNameSelect) console.warn("Element #new-target-name not found!");
    const addTargetBtn = document.getElementById('add-target-btn');
     if (!addTargetBtn) console.warn("Element #add-target-btn not found!");
    const selectedTargetsListUl = document.getElementById('selected-targets-list');
     if (!selectedTargetsListUl) console.warn("Element #selected-targets-list not found!");
    console.log("Element getters finished.");

    // Check if essential elements for setup are missing before proceeding
     if (!dropsListDiv || !errorMessageDiv || !mainTitle || !createDropModal || !createDropForm) {
        console.error("Essential elements missing, stopping drops page initialization.");
        return;
     }

    // --- Setup Event Listeners ---
    console.log("Setting up listeners...");
    setupViewToggleListeners(viewMyDropsBtn, viewAllDropsBtn, viewUpcomingDropsBtn);
    setupModalEventListeners(createDropModal, modalCloseButton, modalCancelButton, showCreateModalButton, createDropForm);
    setupTargetSelectionListeners(newTargetTypeSelect, newTargetNameSelect, addTargetBtn, createDropErrorDiv, selectedTargetsListUl);
    setupDropsListListeners(dropsListDiv); // Setup listener for edit/delete clicks
    console.log("Listeners setup called.");

    // --- Initial Page State & Data Load ---
    console.log("Setting initial view and loading drops...");
    setActiveView(currentView); // Set initial button state and title ('my')
    fetchAndDisplayDrops();     // Fetch initial data ('my' drops)

    console.log("===> END Initializing drops page UI and listeners. ===");
}


// --- DOMContentLoaded: Auth Check and Init Trigger ---
// This runs when the page structure is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Drops page DOM loaded, verifying authentication...");

    try {
        // --- Initial Auth Check ---
        // Use fetchApi for a quick check; it handles 401 redirects.
        await fetchApi('/api/users/me'); // Check current user status
        console.log("User authenticated, proceeding to initialize drops page...");

        // --- If authenticated, call the main setup function ---
        initializeDropsPage();

    } catch (error) {
        // This catch mainly handles non-401 errors from fetchApi,
        // or errors if fetchApi itself is unavailable (common.js not loaded?)
        console.error("Error during initial auth check or setup:", error);
        if (!error.message || !error.message.includes("Unauthorized")) {
             // Manually redirect if fetchApi didn't (e.g., network error)
             const errorDiv = document.getElementById('error-message');
             if(errorDiv) errorDiv.textContent = `Authentication error. Please log in.`;
             // Redirect after a short delay?
             window.location.href = '/';
        }
        // If fetchApi handled a 401, it should have already redirected.
    }
});