//'use strict';

(function() {
  document.getElementById('addUserForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the default form submission

    const form = event.target;
    const formData = new FormData(form);

    fetch(form.action, {
      method: form.method,
      body: JSON.stringify(Object.fromEntries(formData)), // Convert FormData to JSON
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.json())
    .then(newUser => {
      // Update the table with the new user
      const tableBody = document.querySelector('table tbody');
      const newRow = tableBody.insertRow();
      newRow.insertCell().textContent = newUser.id;
      newRow.insertCell().textContent = newUser.email;
      newRow.insertCell().textContent = newUser.role;
      newRow.insertCell().textContent = newUser.createdAt;
      newRow.insertCell().textContent = newUser.updatedAt;

      // Clear the form
      form.reset();
    })
    .catch(error => console.error('Error:', error));
  });
})();