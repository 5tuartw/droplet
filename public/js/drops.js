// Wait for the HTML DOM to be fully loaded before running scripts
// (Optional if using 'defer', but good practice for clarity)
document.addEventListener('DOMContentLoaded', () => {

    // --- Element Getters ---
    const dropsListDiv = document.getElementById('drops-list');
    const errorMessageDiv = document.getElementById('error-message');
    const userEmailDisplay = document.getElementById('user-email-display');
    const logoutButton = document.getElementById('logout-button');
    const viewMyDropsBtn = document.getElementById('view-my-drops-btn');
    const viewAllDropsBtn = document.getElementById('view-all-drops-btn');
    const mainTitle = document.querySelector('.main-content h1');
    // Modal Elements
    const createDropModal = document.getElementById('create-drop-modal');
    const modalCloseButton = document.getElementById('modal-close-btn');
    const modalCancelButton = document.getElementById('modal-cancel-btn');
    const showCreateModalButton = document.getElementById('show-create-modal-btn');
    const createDropForm = document.getElementById('create-drop-form');
    const createDropErrorDiv = document.getElementById('create-drop-error');
    const modalTitleElement = document.getElementById('modal-title');
    // Target Selection Elements
    const newTargetTypeSelect = document.getElementById('new-target-type');
    const targetNameSelectorDiv = document.getElementById('target-name-selector'); // Optional: if needed for styling container
    const newTargetNameSelect = document.getElementById('new-target-name');
    const addTargetBtn = document.getElementById('add-target-btn');
    const selectedTargetsListUl = document.getElementById('selected-targets-list'); // The UL for displaying added targets

    // --- State variables ---
    let currentView = 'my'; // Default view
    let selectedTargets = []; // Array to hold targets added in the modal form

    // --- Utility Functions ---
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // --- UI Update Functions ---
    function displayUserInfo() {
         const userInfoString = sessionStorage.getItem('userInfo');
         if (userInfoString) {
             try {
                 const userInfo = JSON.parse(userInfoString);
                 if (userEmailDisplay && userInfo.email) {
                     userEmailDisplay.textContent = `Logged in as: ${userInfo.email}`;
                 }
             } catch(e) { console.error("Error parsing userInfo", e); }
         } else {
             if (userEmailDisplay) userEmailDisplay.textContent = '';
         }
    }

    function setActiveView(view) {
        currentView = view;
        if (!viewMyDropsBtn || !viewAllDropsBtn || !mainTitle) { return; }
        if (view === 'my') {
            viewMyDropsBtn.classList.add('active');
            viewAllDropsBtn.classList.remove('active');
            mainTitle.textContent = 'My Drops'; // Corrected title
        } else {
            viewMyDropsBtn.classList.remove('active');
            viewAllDropsBtn.classList.add('active');
            mainTitle.textContent = 'All Active Drops'; // Corrected title
        }
    }

    // --- Modal Handling ---
    function showCreateDropModal() {
        if (createDropModal && createDropForm && createDropErrorDiv && modalTitleElement && selectedTargetsListUl) {
            createDropForm.reset(); // Reset form fields
            createDropErrorDiv.textContent = ''; // Clear errors
            selectedTargets = []; // Clear previously selected targets array
            updateSelectedTargetsUI(); // Update UI list
            newTargetNameSelect.innerHTML = '<option value="" selected disabled>-- Select Name --</option>';
            newTargetNameSelect.disabled = true;
            addTargetBtn.disabled = true;
            modalTitleElement.textContent = 'Create New Drop';
            const submitButton = createDropForm.querySelector('button[type="submit"]');
            if(submitButton) submitButton.textContent = 'Create Drop';
            createDropModal.style.display = 'flex';
            document.getElementById('drop-title')?.focus();
        } else {
            console.error("Modal elements not found.");
            alert("Error: Could not open the create drop form.");
        }
    }

    if (showCreateModalButton) {
        showCreateModalButton.addEventListener('click', showCreateDropModal); // <-- This connects the click to the function
    }

    function closeCreateDropModal() {
         if (createDropModal) { createDropModal.style.display = 'none'; }
    }

    if (modalCloseButton) {
        // This line calls closeCreateDropModal
        modalCloseButton.addEventListener('click', closeCreateDropModal);
    } else {
        console.warn("Modal close button (#modal-close-btn) not found.");
    }
    
    if (modalCancelButton) {
        // This line also calls closeCreateDropModal
        modalCancelButton.addEventListener('click', closeCreateDropModal);
    } else {
        console.warn("Modal cancel button (#modal-cancel-btn) not found.");
    }

    function updateSelectedTargetsUI() {
        // Ensure the UL element exists (should be obtained with other getters)
        if (!selectedTargetsListUl) {
             console.error("Selected targets list UL not found!");
             return;
        }

        // Clear current list items in the UI
        selectedTargetsListUl.innerHTML = '';

        if (selectedTargets.length === 0) {
            // If the selectedTargets array is empty, show the placeholder message
            const li = document.createElement('li');
            li.id = 'no-targets-added'; // Keep ID if needed
            li.style.color = '#777';
            li.style.fontStyle = 'italic';
            li.textContent = 'No targets added yet.';
            selectedTargetsListUl.appendChild(li);
        } else {
            // If there are targets in the array, loop through them and create list items
            selectedTargets.forEach((target, index) => {
                const li = document.createElement('li');
                // Display type and name (use fallback if name is missing)
                const targetDisplay = target.name || target.type || 'Unknown Target';
                // Add data attributes to the button to help identify which target to remove
                // Using the index in the array is simple for now
                li.innerHTML = `
                    <span>${escapeHtml(target.type)}: ${escapeHtml(targetDisplay)}</span>
                    <button type="button" class="remove-target-btn" data-target-index="${index}" title="Remove Target">&times;</button>
                `;
                selectedTargetsListUl.appendChild(li);
            });
        }
    }

    // --- Main Data Fetching and Display ---
    async function fetchAndDisplayDrops() {
        errorMessageDiv.textContent = '';
        dropsListDiv.innerHTML = '<p>Loading drops...</p>';
        const token = sessionStorage.getItem('accessToken');
        if (!token) { window.location.href = '/'; return; }

        const apiUrl = (currentView === 'my') ? '/api/mydrops' : '/api/drops';
        console.log(`Fetching ${apiUrl} (View: ${currentView})...`); // Corrected typo

        try {
            const response = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.status === 401) { /* handle session expiry */ window.location.href = '/'; return; }
            if (!response.ok) { /* handle other errors */ throw new Error(`HTTP error! status: ${response.status}`); }
            const drops = await response.json();

            // Display Logic
            dropsListDiv.innerHTML = '';
            if (drops && drops.length > 0) {
                const ul = document.createElement('ul');
                const userInfoString = sessionStorage.getItem('userInfo');
                let currentUser = null;
                if (userInfoString) { try { currentUser = JSON.parse(userInfoString); } catch(e){} }

                drops.forEach(drop => {
                    const li = document.createElement('li');
                    const title = drop.title || 'Untitled Drop';
                    const content = drop.content || '';
                    const postDate = (drop.post_date && !drop.post_date.startsWith('0001-01-01')) ? new Date(drop.post_date).toLocaleDateString() : 'N/A';
                    const expireDate = (drop.expire_date && !drop.expire_date.startsWith('0001-01-01')) ? new Date(drop.expire_date).toLocaleDateString() : 'Never';

                    // Generate Target Badges HTML
                    let targetsHtml = '';
                    if (drop.targets && drop.targets.length > 0) {
                        targetsHtml = drop.targets.map(target => {
                            let badgeClass = 'target-general';
                            const typeLower = target.type ? target.type.toLowerCase() : 'general';
                            if (typeLower === 'division') badgeClass = 'target-division';
                            else if (typeLower === 'yeargroup') badgeClass = 'target-yeargroup';
                            else if (typeLower === 'class') badgeClass = 'target-class';
                            else if (typeLower === 'student') badgeClass = 'target-student';
                            else if (typeLower === 'custom') badgeClass = 'target-custom';
                            else if (typeLower === 'general') badgeClass = 'target-general';
                            const targetDisplay = target.name || target.type || 'Target';
                            return `<span class="target-badge ${badgeClass}">${escapeHtml(targetDisplay)}</span>`;
                        }).join('');
                    }

                    // Determine if Actions should be shown
                    let showActions = false;
                    if (currentUser) {
                        if (currentUser.role && currentUser.role.toLowerCase() === 'admin') { showActions = true; }
                        else if (currentUser.id === drop.user_id) { showActions = true; }
                    }
                    // Use data attributes for event delegation instead of onclick
                    const actionsHtml = showActions ? `
                        <div class="drop-actions">
                            <button class="edit-btn" data-drop-id="${escapeHtml(drop.id)}" title="Edit Drop">✏️</button>
                            <button class="delete-btn" data-drop-id="${escapeHtml(drop.id)}" title="Delete Drop">🗑️</button>
                        </div>` : '';

                    const creatorInfo = (currentView === 'all' && drop.user_email) ? ` | By: ${escapeHtml(drop.user_email)}` : '';

                    // Construct List Item HTML
                    li.innerHTML = `
                        <div class="drop-header">
                            <div><span class="drop-title">${escapeHtml(title)}</span>${targetsHtml}</div>
                            ${actionsHtml}
                        </div>
                        <div class="drop-content">${escapeHtml(content)}</div>
                        <div class="drop-meta">Posted: ${postDate} | Expires: ${expireDate}${creatorInfo}</div>`;
                    ul.appendChild(li);
                }); // End drops.forEach
                dropsListDiv.appendChild(ul);
            } else {
                 dropsListDiv.innerHTML = `<p>${(currentView === 'my') ? 'You have no drops yet.' : 'There are no active drops.'}</p>`;
            }
        } catch (error) {
            console.error(`Error fetching ${currentView} drops:`, error);
            errorMessageDiv.textContent = `Failed to load ${currentView} drops: ${error.message}`;
            dropsListDiv.innerHTML = `<p style="color: red;">Could not load ${currentView} drops.</p>`;
        }
    } // <-- End of fetchAndDisplayDrops

    // --- Target Selection Logic ---
    if (newTargetTypeSelect) {
        newTargetTypeSelect.addEventListener('change', async () => {
            const selectedType = newTargetTypeSelect.value;
            newTargetNameSelect.innerHTML = '<option value="" selected disabled>-- Select Name --</option>';
            newTargetNameSelect.disabled = true;
            addTargetBtn.disabled = true;
            createDropErrorDiv.textContent = '';

            if (!selectedType) return;
            if (selectedType === 'General') {
                newTargetNameSelect.innerHTML = '<option value="0" selected>N/A</option>';
                addTargetBtn.disabled = false;
                return;
            }

            let apiUrl = '';
            switch (selectedType) {
                case 'Division': apiUrl = '/api/divisions'; break;
                case 'YearGroup': apiUrl = '/api/yeargroups'; break;
                case 'Class': apiUrl = '/api/classes'; break;
                case 'Student': apiUrl = '/api/pupils'; break;
                default: createDropErrorDiv.textContent = `Invalid target type.`; return;
            }

            const token = sessionStorage.getItem('accessToken');
            if (!token) { window.location.href = '/'; return; }
            newTargetNameSelect.innerHTML = '<option value="" selected disabled>Loading...</option>';

            try {
                const response = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
                if (response.status === 401) { window.location.href = '/'; return; }
                if (!response.ok) { throw new Error(`Failed to fetch ${selectedType} list`); }
                const items = await response.json();

                newTargetNameSelect.innerHTML = '<option value="" selected disabled>-- Select Name --</option>';
                if (items && items.length > 0) {
                    items.forEach(item => {
                        const option = document.createElement('option');
                        option.value = item.ID;
                        let displayName = '';
                        if (selectedType === 'Student') {
                            displayName = `${item.Surname || ''}, ${item.FirstName || ''}`.trim();
                            if (displayName === ',') displayName = `Pupil ID: ${item.ID}`;
                        } else {
                             displayName = item.Name || item.DivisionName || item.YearGroupName || item.ClassName || `ID: ${item.ID}`;
                        }
                        option.textContent = displayName;
                        newTargetNameSelect.appendChild(option);
                    });
                    newTargetNameSelect.disabled = false;
                } else {
                    newTargetNameSelect.innerHTML = `<option value="" selected disabled>-- No ${selectedType}s found --</option>`;
                }
            } catch (error) {
                console.error(`Error fetching ${selectedType} list:`, error);
                createDropErrorDiv.textContent = `Error loading ${selectedType} list.`;
                newTargetNameSelect.innerHTML = `<option value="" selected disabled>-- Error Loading --</option>`;
            }
        });
    }

    if (newTargetNameSelect) {
        newTargetNameSelect.addEventListener('change', () => {
            const selectedNameId = newTargetNameSelect.value;
            const selectedType = newTargetTypeSelect.value; // Check type again
            // Enable add button only if a name is selected AND type is not 'General' or empty
            addTargetBtn.disabled = !(selectedType && selectedType !== 'General' && selectedNameId);
        });
    }

    // --- Placeholder for Add Target Button Logic ---
    if(addTargetBtn) {
        addTargetBtn.addEventListener('click', () => {
            // TODO: Implement adding target to the 'selectedTargets' array and updating the UI list
            const type = newTargetTypeSelect.value;
            const id = newTargetNameSelect.value;
            const name = newTargetNameSelect.selectedOptions[0]?.textContent || 'N/A'; // Get selected text

            if (!type || (type !== 'General' && !id)) {
                 createDropErrorDiv.textContent = 'Please select a valid type and name.';
                 return;
            }
            // Check for duplicates?
            const newTarget = { type: type, id: (type === 'General' ? 0 : parseInt(id, 10)), name: (type === 'General' ? 'General' : name) }; // Ensure ID is number
            console.log("Adding target:", newTarget);
            alert("Add target functionality not fully implemented yet.");
            // Add to selectedTargets array
            // Update #selected-targets-list UI
             // Reset selectors
             newTargetTypeSelect.value = "";
             newTargetNameSelect.innerHTML = '<option value="" selected disabled>-- Select Name --</option>';
             newTargetNameSelect.disabled = true;
             addTargetBtn.disabled = true;
        });
    }

    // --- Placeholder for Remove Target Logic (using event delegation) ---
    if (selectedTargetsListUl) {
        selectedTargetsListUl.addEventListener('click', (event) => {
             if (event.target && event.target.classList.contains('remove-target-btn')) {
                 // TODO: Implement removing target from 'selectedTargets' array and UI
                 const targetIdToRemove = event.target.dataset.targetId; // Need to add data-target-id to remove button
                 const targetTypeToRemove = event.target.dataset.targetType; // Need to add data-target-type
                 console.log(`Remove target: Type=${targetTypeToRemove}, ID=${targetIdToRemove}`);
                 alert("Remove target functionality not fully implemented yet.");
                 // Remove from array
                 // Remove li element from DOM
             }
        });
    }


    // --- Placeholder for Form Submission ---
    if (createDropForm) {
        createDropForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            // TODO: Implement 2-step form submission
            // 1. Get title, content, dates
            // 2. Get selectedTargets array
            // 3. POST to /api/drops with main data
            // 4. If success, get new drop ID
            // 5. Loop through selectedTargets, POST each to /api/droptargets with drop ID
            // 6. Handle success/errors, close modal, refresh list
            alert("Form submission not fully implemented yet!");
            console.log("Form submitted. Title:", document.getElementById('drop-title').value, "Targets:", selectedTargets);
        });
    }


    // --- Event Delegation for Edit/Delete Buttons ---
    if (dropsListDiv) {
        dropsListDiv.addEventListener('click', (event) => {
            const target = event.target; // The element that was clicked
            // Check if the clicked element or its parent is an edit or delete button
            const editButton = target.closest('.edit-btn');
            const deleteButton = target.closest('.delete-btn');

            if (editButton) {
                const dropId = editButton.dataset.dropId; // Get ID from data attribute
                if (dropId) {
                    editDrop(dropId);
                }
            } else if (deleteButton) {
                const dropId = deleteButton.dataset.dropId; // Get ID from data attribute
                if (dropId) {
                    deleteDrop(dropId);
                }
            }
        });
    }

    // --- Edit/Delete Functions (Placeholders/Implementation) ---
    function editDrop(dropId) {
        // TODO: Implement edit functionality (e.g., populate modal, change submit logic)
        alert(`Edit functionality for drop ${dropId} not implemented yet.`);
        console.log("Edit drop:", dropId);
    }

    async function deleteDrop(dropId) {
        if (!confirm('Are you sure you want to delete this drop?')) return;
        const token = sessionStorage.getItem('accessToken');
        if (!token) { window.location.href = '/'; return; }
        errorMessageDiv.textContent = ''; // Use main error div for delete errors too? Or modal one?
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
             errorMessageDiv.textContent = error.message; // Show error in main page error div
        }
    } // <-- End of deleteDrop

     // --- Logout Functionality ---
     if (logoutButton) {
         logoutButton.addEventListener('click', async () => {
             console.log('Logging out...');
             try { await fetch('/api/token/revoke', { method: 'POST' }); }
             catch(error) { console.error("Revoke call failed:", error); }
             finally {
                 sessionStorage.removeItem('accessToken'); sessionStorage.removeItem('userInfo');
                 window.location.href = '/';
             }
         });
     }


    // --- Initial Page Load Actions ---
    displayUserInfo();          // Show user email
    setActiveView(currentView); // Set initial button state and title ('my')
    fetchAndDisplayDrops();     // Fetch initial data ('my' drops)

}); // <-- End of DOMContentLoaded listener