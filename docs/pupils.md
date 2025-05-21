# Pupil Endpoints

This section details API endpoints for managing pupil data. All operations are scoped to the authenticated user's `school_id`. Access to these endpoints is typically restricted to users with administrative privileges.

---

## `GET /api/pupils`

Retrieves a list of pupils **for the user's school**.

*   **Authentication:** Required (Admin Only recommended).
*   **Request Body:** None.
*   **Success Response (`200 OK`):**
    *   Body: Returns a JSON array of pupil objects, including `school_id`.
        ```json
        [
          {
            "id": 1001, // Or UUID if changed
            "first_name": "John",
            "surname": "Doe",
            "school_id": "uuid-string-school-id",
            "class_id": 101, // Example, if pupil is assigned to a class
            "year_group_id": 10, // Example
            "division_id": 1, // Example
            "created_at": "YYYY-MM-DDTHH:MM:SSZ",
            "updated_at": "YYYY-MM-DDTHH:MM:SSZ"
          }
          // ... more pupils from the same school
        ]
        ```
*   **Errors:** 401 (Unauthorized), 403 (Forbidden - if not Admin), 500 (Internal Server Error)

---

## `POST /api/pupils`

Creates a new pupil **within the requesting admin's school**.

*   **Authentication:** Required (Admin Only).
*   **Request Body:**
    ```json
    {
      "first_name": "Jane",
      "surname": "Doe",
      "class_id": 102, // ID of an existing class in the admin's school
      // "year_group_id": 11, // Optional: Can be derived from class or explicitly set
      // "division_id": 2, // Optional: Can be derived from class or explicitly set
      "off_roll": false // Default usually false
    }
    ```
*   **Success Response (`201 Created`):**
    *   Body: Returns the created pupil object, including `school_id` and assigned IDs.
        ```json
        {
          "id": 1002, // Or UUID
          "first_name": "Jane",
          "surname": "Doe",
          "class_id": 102,
          "year_group_id": 11, // Actual year_group_id from the class
          "division_id": 2,    // Actual division_id from the class
          "school_id": "uuid-string-admin-school-id",
          "off_roll": false,
          "created_at": "YYYY-MM-DDTHH:MM:SSZ",
          "updated_at": "YYYY-MM-DDTHH:MM:SSZ"
        }
        ```
*   **Errors:** 400 (Bad Request - validation fails, e.g., missing name, invalid class_id), 401 (Unauthorized), 403 (Forbidden - requester not admin), 404 (Not Found - if referenced class_id doesn't exist in school), 500 (Internal Server Error)

---

## `GET /api/pupils/{pupilID}`

Retrieves details for a single pupil by ID, **provided they are in the requesting admin's school**.

*   **Authentication:** Required (Admin Only recommended).
*   **Path Parameters:**
    *   `pupilID` (Integer or UUID): The ID of the pupil to retrieve.
*   **Request Body:** None.
*   **Success Response (`200 OK`):**
    *   Body: Returns the pupil object (similar structure to `POST /api/pupils` response).
        ```json
        {
          "id": 1001,
          "first_name": "John",
          "surname": "Doe",
          "class_id": 101,
          "year_group_id": 10,
          "division_id": 1,
          "school_id": "uuid-string-school-id",
          "off_roll": false,
          "created_at": "YYYY-MM-DDTHH:MM:SSZ",
          "updated_at": "YYYY-MM-DDTHH:MM:SSZ"
        }
        ```
*   **Errors:** 400 (Bad Request - invalid pupilID format), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found - Pupil not found within admin's school scope), 500 (Internal Server Error)

---

## `PUT /api/pupils/{pupilID}`

Updates details for an existing pupil **within the requesting admin's school**. This typically involves changing their name, class assignment, or off-roll status.

*   **Authentication:** Required (Admin Only).
*   **Path Parameters:**
    *   `pupilID` (Integer or UUID): The ID of the pupil to update.
*   **Request Body:**
    ```json
    {
      "first_name": "Johnny",
      "surname": "Doe",
      "class_id": 103, // ID of an existing class in the admin's school
      "off_roll": false
    }
    ```
*   **Success Response (`200 OK` or `204 No Content`):**
    *   Body (if 200 OK): Returns the updated pupil object.
        ```json
        {
          "id": 1001,
          "first_name": "Johnny",
          "surname": "Doe",
          "class_id": 103,
          "year_group_id": 12, // Updated based on new class
          "division_id": 2,    // Updated based on new class
          "school_id": "uuid-string-school-id",
          "off_roll": false,
          "created_at": "YYYY-MM-DDTHH:MM:SSZ",
          "updated_at": "YYYY-MM-DDTHH:MM:SSZ" // Note updated timestamp
        }
        ```
*   **Errors:** 400 (Bad Request - validation fails, invalid class_id), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found - Pupil or referenced class_id not found within scope), 500 (Internal Server Error)

---

## `DELETE /api/pupils/{pupilID}`

Deletes a specified pupil **within the requesting admin's school**.

*   **Authentication:** Required (Admin Only).
*   **Path Parameters:**
    *   `pupilID` (Integer or UUID): The ID of the pupil to delete.
*   **Request Body:** None.
*   **Success Response (`204 No Content`):** No response body.
*   **Errors:** 400 (Bad Request - invalid pupilID format), 401 (Unauthorized), 403 (Forbidden / Demo Mode restrictions), 404 (Not Found - Pupil not found within admin's school scope), 500 (Internal Server Error)

---

## `GET /api/pupils/lookup`

Retrieves a list of pupils suitable for quick lookup (e.g., for search boxes or selection lists) **for the user's school**. This typically returns a simplified pupil object.

*   **Authentication:** Required (Admin Only recommended, or any authenticated user if data is considered non-sensitive for lookup within the school).
*   **Request Body:** None.
*   **Success Response (`200 OK`):**
    *   Body: Returns a JSON array of simplified pupil objects.
        ```json
        [
          {
            "id": 1001, // Or UUID
            "name": "John Doe", // Combined name for easy display
            "class_name": "Class 5A" // Optional: for context
          },
          {
            "id": 1002,
            "name": "Jane Doe",
            "class_name": "Class 5B"
          }
          // ... more pupils from the same school
        ]
        ```
*   **Errors:** 401 (Unauthorized), 403 (Forbidden - if access is restricted), 500 (Internal Server Error)

---
