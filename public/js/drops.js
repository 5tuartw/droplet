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
    let isEditMode = false;
    let currentlyEditingDropId = null;

    // --- Utility Functions ---
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // --- Date Formatting Helper --- Converts ISO timestamp string to YYYY-MM-DD for date input fields
    function formatIsoDateForInput(isoDateString) {
        if (!isoDateString || isoDateString.startsWith('0001-01-01')) {
            // Return empty string if date is null, empty, or Go's zero time
            return '';
        }
        try {
            // Create a Date object and extract parts safely
            // Slicing the string is simpler and avoids timezone issues here
            return isoDateString.substring(0, 10); // Extracts YYYY-MM-DD part
        } catch (e) {
            console.error("Error formatting date string:", isoDateString, e);
            return ''; // Return empty on error
        }
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
            mainTitle.textContent = 'Drops for Me'; 
        } else {
            viewMyDropsBtn.classList.remove('active');
            viewAllDropsBtn.classList.add('active');
            mainTitle.textContent = 'Drops for Anyone'; 
        }
    }

    // --- Add Event Listeners to Toggle Buttons ---

    if (viewMyDropsBtn) {
        viewMyDropsBtn.addEventListener('click', () => {
            // Check if already in 'my' view to avoid unnecessary fetches
            if (currentView !== 'my') {
                console.log("Switching to My Drops view..."); // Log for testing
                setActiveView('my');    // Update state, title, button style
                fetchAndDisplayDrops(); // Fetch the data for /api/mydrops
            } else {
                 console.log("Already in My Drops view.");
            }
        });
    } else {
         console.warn("View My Drops button (#view-my-drops-btn) not found!");
    }

     if (viewAllDropsBtn) {
        viewAllDropsBtn.addEventListener('click', () => {
            // Check if already in 'all' view to avoid unnecessary fetches
            if (currentView !== 'all') {
                console.log("Switching to All Drops view..."); // Log for testing
                setActiveView('all');    // Update state, title, button style
                fetchAndDisplayDrops();  // Fetch the data for /api/drops
            } else {
                 console.log("Already in All Drops view.");
            }
        });
    } else {
         // If you see this warning, the ID in the HTML is wrong
         console.warn("View All Drops button (#view-all-drops-btn) not found!");
    }

    // --- Modal Handling ---
    function showCreateDropModal(dropDataToEdit = null) {
        // Ensure all modal elements are available
        if (!createDropModal || !createDropForm || !createDropErrorDiv || !modalTitleElement || !selectedTargetsListUl || !newTargetTypeSelect || !newTargetNameSelect || !addTargetBtn) {
            console.error("Modal elements not found! Cannot open modal.");
            alert("Error: Could not open the drop form.");
            return;
        }
    
        // Reset common things first
        createDropForm.reset(); // Clears basic input fields
        createDropErrorDiv.textContent = '';
        selectedTargets = []; // Reset selected targets array for both modes initially
        newTargetTypeSelect.value = ""; // Reset type dropdown
        newTargetNameSelect.innerHTML = '<option value="" selected disabled>-- Select Name --</option>'; // Clear name options
        newTargetNameSelect.disabled = true;
        addTargetBtn.disabled = true;
    
        const submitButton = createDropForm.querySelector('button[type="submit"]');
    
        if (dropDataToEdit && dropDataToEdit.id) {
            // --- EDIT MODE ---
            console.log("Populating modal for EDIT mode. Drop ID:", dropDataToEdit.id);
            isEditMode = true;
            currentlyEditingDropId = dropDataToEdit.id; // Store the ID we are editing
    
            modalTitleElement.textContent = 'Edit Drop';
            if(submitButton) submitButton.textContent = 'Save Changes';
    
            // Populate form fields with existing data
            document.getElementById('drop-title').value = dropDataToEdit.title || '';
            document.getElementById('drop-content').value = dropDataToEdit.content || '';
            // Populate dates using the formatter
            document.getElementById('drop-post-date').value = formatIsoDateForInput(dropDataToEdit.post_date);
            document.getElementById('drop-expire-date').value = formatIsoDateForInput(dropDataToEdit.expire_date);
    
            // Populate the selectedTargets array from fetched data
            // Ensure mapping matches { type, id, name } structure used by updateSelectedTargetsUI
            selectedTargets = (dropDataToEdit.targets || []).map(t => ({
                type: t.type,
                id: t.id, // Assuming backend sends ID matching target table (int64)
                name: t.name || t.type // Use name, fallback to type
            }));
    
        } else {
            // --- CREATE MODE ---
            console.log("Opening modal for CREATE mode.");
            isEditMode = false;
            currentlyEditingDropId = null;
            modalTitleElement.textContent = 'Create New Drop';
             if(submitButton) submitButton.textContent = 'Create Drop';
             // selectedTargets is already reset to []
        }
    
        // Update the visual list of targets (will be empty for create, populated for edit)
        updateSelectedTargetsUI();
    
        // Display the modal
        createDropModal.style.display = 'flex';
    
        // Focus the first input field
        document.getElementById('drop-title')?.focus();
    }

    if (showCreateModalButton) {
        showCreateModalButton.addEventListener('click', showCreateDropModal); // <-- This connects the click to the function
    }

    function closeCreateDropModal() {
        if (createDropModal) {
           createDropModal.style.display = 'none';
           // --- ADD THESE LINES ---
           // Reset edit mode flags whenever the modal is closed
           isEditMode = false;
           currentlyEditingDropId = null;
           console.log("Edit mode flags reset.");
           // --- END ADD ---
        }
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

                    // --- TOOLTIP ---
                    let tooltipText = '';
                    // Use author_name (assuming JSON key is "author_name" based on Go struct tag)
                    if (drop.author_name) {
                        tooltipText += `Added by: ${escapeHtml(drop.author_name)}`;
                        // Optionally add CreatedAt date
                        if (drop.created_at && !drop.created_at.startsWith('0001-01-01')) {
                            tooltipText += ` on ${new Date(drop.created_at).toLocaleString()}`;
                        }
                    } else {
                        // Fallback if author name is missing for some reason
                        tooltipText += `Added by: User ID ${escapeHtml(drop.user_id)}`;
                    }

                    // Add edit info ONLY if editor_name exists
                    // (Check if backend sends null or omits the field if no editor)
                    // Assuming backend sends "editor_name": "FirstName Surname" or "editor_name": null
                    if (drop.editor_name) { // Check if editor_name property exists and is not null/empty
                        tooltipText += `\nLast edited by: ${escapeHtml(drop.editor_name)}`; // '\n' creates newline in standard tooltips
                        // Add UpdatedAt date
                        if (drop.updated_at && !drop.updated_at.startsWith('0001-01-01')) {
                            tooltipText += ` on ${new Date(drop.updated_at).toLocaleString()}`;
                        }
                    }
                    // Set the title attribute on the list item
                    li.setAttribute('title', tooltipText);
                    // --- END TOOLTIP LOGIC ---

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

    // --- Function to fetch data and open modal for editing ---
    async function handleEditClick(dropId) {
        console.log(`Edit requested for drop ID: ${dropId}`);
        errorMessageDiv.textContent = ''; // Clear main page errors
        // Show some loading indicator maybe? (Optional)

        const token = sessionStorage.getItem('accessToken');
        if (!token) { window.location.href = '/'; return; } // Redirect if no token

        try {
            // Fetch the specific drop data using the new backend endpoint
            const response = await fetch(`/api/drops/${dropId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) { /* Handle auth error */ window.location.href = '/'; return; }
            if (response.status === 404) { throw new Error(`Drop with ID ${dropId} not found.`); }
            if (!response.ok) {
                 let errorDetail = `Failed to fetch drop data (Status: ${response.status})`;
                 try{ const errData = await response.json(); if(errData.error) errorDetail+=`: ${errData.error}`; } catch(e){}
                 throw new Error(errorDetail);
            }

            const dropData = await response.json(); // Expecting DropWithTargets structure
            console.log("Fetched drop data for edit:", dropData);

            // Call the modified function to populate and show the modal
            showCreateDropModal(dropData);

        } catch (error) {
            console.error("Error fetching drop for edit:", error);
            // Display error on the main page error div
            errorMessageDiv.textContent = `Error loading drop for edit: ${error.message}`;
        } finally {
            // Hide loading indicator if shown (Optional)
        }
    }

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

    // --- Add Target Button Logic ---
    if(addTargetBtn) {
        addTargetBtn.addEventListener('click', () => {
            // Ensure elements exist before proceeding
            if (!newTargetTypeSelect || !newTargetNameSelect || !createDropErrorDiv) {
                console.error("Target selection elements not found!");
                return;
            }
            
            const type = newTargetTypeSelect.value;
            const idValue = newTargetNameSelect.value;
            const name = newTargetNameSelect.selectedOptions[0]?.textContent || 'N/A'; // Get selected text

            if (!type || (type !== 'General' && !idValue)) {
                 createDropErrorDiv.textContent = 'Please select a valid type and name.';
                 return;
            }
            // 2. Determine ID and Name for the target object
            // Use 0 for General ID (adjust if backend expects null or specific ID)
            // Parse other IDs as integers (since they come from SERIAL)
            const id = (type === 'General') ? 0 : parseInt(idValue, 10);
            const displayName = (type === 'General') ? 'General' : name; // Use 'General' as name for General type

            // 3. Check for Duplicates
            // See if a target with the same type and ID is already in the array
            const isDuplicate = selectedTargets.some(target => target.type === type && target.id === id);
            if (isDuplicate) {
                createDropErrorDiv.textContent = `Target "${displayName}" (${type}) is already added.`;
                return; // Don't add duplicates
            }

            // 4. Add the new target to the 'selectedTargets' array
            const newTarget = { type: type, id: id, name: displayName };
            selectedTargets.push(newTarget);
            console.log("Added target, selectedTargets array:", selectedTargets); // For debugging

            // 5. Update the visual list in the modal by calling the function we defined earlier
            updateSelectedTargetsUI();

            // 6. Reset the selection controls ready for the next target
            newTargetNameSelect.value = "";
            addTargetBtn.disabled = true; // Disable add button again
            createDropErrorDiv.textContent = ''; // Clear any previous errors
        });
    } else {
        console.warn("Add target button (#add-target-btn) not found.");
    }

    // --- Handle Removing Targets (using event delegation on the UL) ---
    if (selectedTargetsListUl) {
        selectedTargetsListUl.addEventListener('click', (event) => {
             // Check if the exact element clicked has the 'remove-target-btn' class
             if (event.target && event.target.classList.contains('remove-target-btn')) {

                 // Retrieve the index stored in the button's 'data-target-index' attribute
                 // We use parseInt because data attributes are strings
                 const indexToRemove = parseInt(event.target.dataset.targetIndex, 10);

                 // --- Add the logic here ---

                 // 1. Validate the index (check if it's a number and within the array bounds)
                 if (!isNaN(indexToRemove) && indexToRemove >= 0 && indexToRemove < selectedTargets.length) {
                    console.log(`Removing target at index: ${indexToRemove}`, selectedTargets[indexToRemove]);

                    // 2. Remove the target from the selectedTargets array
                    // The splice() method changes the contents of an array by removing existing elements.
                    // splice(startIndex, deleteCount)
                    selectedTargets.splice(indexToRemove, 1);

                    // 3. Update the visual list in the modal UI by calling the existing function
                    updateSelectedTargetsUI();

                 } else {
                    // This might happen if the index is invalid for some reason
                    console.error("Could not remove target: Invalid index found.", event.target.dataset.targetIndex);
                 }
                 // --- End of added logic ---
             }
        });
    }


    // --- Placeholder for Form Submission ---
    if (createDropForm) {
        createDropForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default HTML form submission
            // Log current mode for debugging
            console.log(`Form submitted. Edit Mode: ${isEditMode}, Drop ID: ${currentlyEditingDropId}`);

            const submitButton = createDropForm.querySelector('button[type="submit"]');
            const errorDiv = document.getElementById('create-drop-error');
            if(!errorDiv) { console.error("Modal error div not found"); return; }

            errorDiv.textContent = ''; // Clear previous errors
            if(submitButton) submitButton.disabled = true; // Disable button

            try {
                // 1. Gather Form Data (Same as before)
                const title = document.getElementById('drop-title').value.trim();
                const content = document.getElementById('drop-content').value.trim();
                const postDateValue = document.getElementById('drop-post-date').value;
                const expireDateValue = document.getElementById('drop-expire-date').value;
                // 'selectedTargets' array is already populated

                // 2. Validation (Same as before)
                if (!title && !content) {
                    throw new Error('Title or Content must be provided.');
                }

                // 3. Get Token (Same as before)
                const token = sessionStorage.getItem('accessToken');
                if (!token) { throw new Error('Authentication error. Please log in again.'); }

                // 4. Prepare Payload (Same as before)
                const payload = {
                    title: title,
                    content: content,
                    ...(postDateValue && { post_date: postDateValue }),
                    ...(expireDateValue && { expire_date: expireDateValue }),
                    targets: selectedTargets.map(t => ({ type: t.type, id: t.id }))
                };
                console.log("Submitting payload:", payload);

                // --- 5. Determine Method and URL ---
                let method = 'POST'; // Default to create
                let apiUrl = '/api/drops'; // Default to create URL

                if (isEditMode && currentlyEditingDropId) {
                    // If in edit mode, change method to PUT and URL to include ID
                    method = 'PUT';
                    apiUrl = `/api/drops/${currentlyEditingDropId}`;
                    console.log(`Submitting EDIT request to ${apiUrl}`);
                } else {
                     console.log(`Submitting CREATE request to ${apiUrl}`);
                }
                // --- End Determine Method/URL ---

                // --- 6. Make the API Call ---
                const response = await fetch(apiUrl, {
                    method: method, // Use dynamic method
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });

                // 7. Handle Response
                if (!response.ok) {
                    let errorMsg = `Failed to ${isEditMode ? 'update' : 'create'} drop (Status: ${response.status})`;
                     try { const errData = await response.json(); if(errData.error) errorMsg += `: ${errData.error}`; } catch(e){}
                     throw new Error(errorMsg);
                }

                // Success (201 for POST, likely 200 or 204 for PUT)
                console.log(`Drop ${isEditMode ? 'updated' : 'created'} successfully!`);

                // --- 8. Success Actions ---
                closeCreateDropModal();     // Close the modal
                fetchAndDisplayDrops();     // Refresh the main drop list

            } catch (error) {
                // --- Handle ANY errors ---
                console.error(`Error ${isEditMode ? 'updating' : 'creating'} drop:`, error);
                errorDiv.textContent = error.message || `An unexpected error occurred.`;

            } finally {
                // --- Always re-enable submit button ---
                 if(submitButton) submitButton.disabled = false;
                 // Note: We reset isEditMode flag in closeCreateDropModal now
            }

        }); // --- End of form submit listener ---
    } // --- End if(createDropForm) ---


    // --- Event Delegation for Edit/Delete Buttons ---
    if (dropsListDiv) {
        dropsListDiv.addEventListener('click', (event) => {
            const target = event.target;
            const editButton = target.closest('.edit-btn');
            const deleteButton = target.closest('.delete-btn');

            if (editButton) {
                const dropId = editButton.dataset.dropId;
                if (dropId) {
                    handleEditClick(dropId);
                }
            } else if (deleteButton) {
                const dropId = deleteButton.dataset.dropId;
                if (dropId) {
                    deleteDrop(dropId);
                }
            }
        });
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