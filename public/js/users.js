'use strict';

(function() {
  const form = document.getElementById('addUserForm');

  form.addEventListener('submit', function(event) {
    event.preventDefault();

    const formData = new FormData(form);
    const data = Object.fromEntries(formData); // Convert form data to an object
    const jsonData = JSON.stringify(data); // Serialize the object to JSON

    // Debug logging
    console.log('Request details:', {
      url: form.action,
      method: form.method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: jsonData
    });

    fetch(form.action, {
      method: form.method,
      body: jsonData,
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      console.log('Response status:', response.status);
      return response.json();
    })
    .then(data => {
      console.log('Response data:', data);
      location.reload()
    })
    .catch(error => {
      console.error('Error:', error);
    });
  });
})();