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
                if (items && items.length > 0) { /* ... populate options ... */
                    items.forEach(item => {
                        const option = document.createElement('option');
                        const itemID = item.id; // Assuming lowercase id
                        let displayName = '';
                         if (selectedType === 'Student') { displayName = `${item.surname || ''}, ${item.first_name || ''}`.trim(); }
                         else { displayName = item.name || item.division_name || item.year_group_name || item.class_name || `ID: ${itemID}`; }
                         if (displayName === ',' || !displayName) displayName = `ID: ${itemID}`; // Fallback display name
                        option.value = itemID;
                        option.textContent = esc(displayName);
                        nameSelect.appendChild(option);
                    });
                    nameSelect.disabled = false;
                } else { nameSelect.innerHTML = `<option value="" selected disabled>-- No ${selectedType}s found --</option>`; }
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
    if(typeSelect.value !== 'General') nameSelect.disabled = true;
    document.getElementById('add-target-btn').disabled = true;
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
}

function handleRemoveTarget(event) { /* ... Keep your existing remove target logic ... */
    if (event.target && event.target.classList.contains('remove-target-btn')) {
        const indexToRemove = parseInt(event.target.dataset.targetIndex, 10);
        if (!isNaN(indexToRemove) && indexToRemove >= 0 && indexToRemove < selectedTargets.length) {
            selectedTargets.splice(indexToRemove, 1);
            updateSelectedTargetsUI();
        }
    }
}

function updateSelectedTargetsUI() { /* ... Keep your existing target UI update logic ... */
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
async function fetchAndDisplayDrops() { /* ... Keep your existing fetch/display logic ... */
    const dropsListDiv = document.getElementById('drops-list');
    const errorMessageDiv = document.getElementById('error-message');
    if (!dropsListDiv || !errorMessageDiv) return;
    errorMessageDiv.textContent = '';
    dropsListDiv.innerHTML = '<p>Loading drops...</p>';
    let apiUrl = '';
    if (currentView === 'my') apiUrl = '/api/mydrops';
    else if (currentView === 'all') apiUrl = '/api/drops';
    else if (currentView === 'upcoming') apiUrl = '/api/upcomingdrops'; // Verify this endpoint
    else { console.error("Invalid view state:", currentView); return; }
    console.log(`Workspaceing ${apiUrl} (View: ${currentView})...`);
    try {
        const drops = await fetchApi(apiUrl);
        if (!drops || !Array.isArray(drops)) { throw new Error("Invalid drop data format"); }
        dropsListDiv.innerHTML = '';
        if (drops.length > 0) { /* ... render drops list (ul/li/buttons/tooltips etc.) ... */
             const ul = document.createElement('ul');
             const userInfo = getUserInfo();
             drops.forEach(drop => {
                const li = document.createElement('li');
                li.setAttribute('title', /* build tooltip */ '');
                li.innerHTML = /* build inner HTML */ '';
                ul.appendChild(li);
             });
             dropsListDiv.appendChild(ul);
        } else { /* ... show empty message ... */ }
    } catch (error) { /* ... handle error ... */ }
}

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
function showCreateDropModal(dropDataToEdit = null) { /* ... Keep your existing show/populate modal logic ... */
    const modal = document.getElementById('create-drop-modal');
    const form = document.getElementById('create-drop-form');
    // ... get elements ...
    if (!modal || !form ) return;
    form.reset();
    // ... reset state vars, clear errors, clear targets ...
    isEditMode = false; currentlyEditingDropId = null; selectedTargets = [];
    if (dropDataToEdit && dropDataToEdit.id) { // Edit Mode
        isEditMode = true; currentlyEditingDropId = dropDataToEdit.id;
        // ... populate fields from dropDataToEdit ...
        selectedTargets = (dropDataToEdit.targets || []).map(/* map target structure */);
    } else { // Create Mode
        // ... set titles/buttons for create ...
    }
    updateSelectedTargetsUI();
    modal.style.display = 'flex';
    document.getElementById('drop-title')?.focus();
}

function closeCreateDropModal() { /* ... Keep your existing close modal logic ... */
     const modal = document.getElementById('create-drop-modal');
     if (modal) modal.style.display = 'none';
     isEditMode = false;
     currentlyEditingDropId = null;
     selectedTargets = [];
     console.log("Modal closed, edit flags & targets reset.");
}

// Combined Create/Update Handler
async function handleCreateOrUpdateDropSubmit(event) { /* ... Keep your existing submit logic ... */
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const errorDiv = document.getElementById('create-drop-error');
    // ... disable button, clear errors ...
    try {
        // ... gather data, validate ...
        const payload = { /* ... build payload with mapped targets ... */ };
        const method = isEditMode ? 'PUT' : 'POST';
        const apiUrl = isEditMode ? `/api/drops/${currentlyEditingDropId}` : '/api/drops';
        await fetchApi(apiUrl, { method: method, body: JSON.stringify(payload) });
        closeCreateDropModal();
        fetchAndDisplayDrops();
    } catch (error) {
        // ... display error in modal error div ...
    } finally {
        // ... re-enable button ...
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