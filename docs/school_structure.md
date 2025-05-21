# School Structure Endpoints

This section details API endpoints for managing the structural elements of a school, such as divisions, year groups, and classes. All operations are scoped to the authenticated user's `school_id`. Access to these endpoints is typically restricted to users with administrative privileges.

---

## Divisions

---

### `GET /api/divisions`

Retrieves a list of divisions **for the user's school**.

*   **Authentication:** Required (Admin Only recommended).
*   **Request Body:** None.
*   **Success Response (`200 OK`):**
    *   Body: Returns a JSON array of division objects, including `school_id`.
        ```json
        [
          {
            "id": 1, // Or UUID
            "division_name": "Upper School",
            "school_id": "uuid-string-school-id",
            "created_at": "YYYY-MM-DDTHH:MM:SSZ",
            "updated_at": "YYYY-MM-DDTHH:MM:SSZ"
          }
          // ... more divisions from the same school
        ]
        ```
*   **Errors:** 401 (Unauthorized), 403 (Forbidden), 500 (Internal Server Error)

---

### `POST /api/divisions`

Creates a new division **within the requesting admin's school**.

*   **Authentication:** Required (Admin Only).
*   **Request Body:**
    ```json
    {
      "division_name": "Sixth Form"
    }
    ```
*   **Success Response (`201 Created`):**
    *   Body: Returns the created division object.
        ```json
        {
          "id": 2, // Or UUID
          "division_name": "Sixth Form",
          "school_id": "uuid-string-admin-school-id",
          "created_at": "YYYY-MM-DDTHH:MM:SSZ",
          "updated_at": "YYYY-MM-DDTHH:MM:SSZ"
        }
        ```
*   **Errors:** 400 (Bad Request - validation fails, e.g., missing name, duplicate name), 401 (Unauthorized), 403 (Forbidden), 500 (Internal Server Error)

---

### `PATCH /api/divisions/{divisionID}/name`

Updates the name of an existing division **within the requesting admin's school**.

*   **Authentication:** Required (Admin Only).
*   **Path Parameters:**
    *   `divisionID` (Integer or UUID): The ID of the division to update.
*   **Request Body:**
    ```json
    {
      "division_name": "Senior School"
    }
    ```
*   **Success Response (`200 OK` or `204 No Content`):**
    *   Body (if 200 OK): Returns the updated division object or just `id` and `updated_at`.
        ```json
        {
          "id": 1,
          "division_name": "Senior School",
          "school_id": "uuid-string-school-id",
          "updated_at": "YYYY-MM-DDTHH:MM:SSZ"
        }
        ```
*   **Errors:** 400 (Bad Request - validation fails), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found - Division not found), 500 (Internal Server Error)

---

### `DELETE /api/divisions/{divisionID}`

Deletes a specified division **within the requesting admin's school**. This might be restricted if the division is in use (e.g., by year groups).

*   **Authentication:** Required (Admin Only).
*   **Path Parameters:**
    *   `divisionID` (Integer or UUID): The ID of the division to delete.
*   **Request Body:** None.
*   **Success Response (`204 No Content`):** No response body.
*   **Errors:** 400 (Bad Request - e.g., division in use), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found - Division not found), 500 (Internal Server Error)

---

## Year Groups

---

### `GET /api/yeargroups`

Retrieves a list of year groups **for the user's school**.

*   **Authentication:** Required (Admin Only recommended).
*   **Request Body:** None.
*   **Success Response (`200 OK`):**
    *   Body: Returns a JSON array of year group objects, including `school_id` and `division_id`.
        ```json
        [
          {
            "id": 10, // Or UUID
            "year_group_name": "Year 7",
            "division_id": 1, // ID of the division this year group belongs to
            "school_id": "uuid-string-school-id",
            "created_at": "YYYY-MM-DDTHH:MM:SSZ",
            "updated_at": "YYYY-MM-DDTHH:MM:SSZ"
          }
        ]
        ```
*   **Errors:** 401 (Unauthorized), 403 (Forbidden), 500 (Internal Server Error)

---

### `POST /api/yeargroups`

Creates a new year group **within the requesting admin's school**. Requires associating with an existing division.

*   **Authentication:** Required (Admin Only).
*   **Request Body:**
    ```json
    {
      "year_group_name": "Year 12",
      "division_id": 2 // ID of an existing division in the admin's school
    }
    ```
*   **Success Response (`201 Created`):**
    *   Body: Returns the created year group object.
        ```json
        {
          "id": 12, // Or UUID
          "year_group_name": "Year 12",
          "division_id": 2,
          "school_id": "uuid-string-admin-school-id",
          "created_at": "YYYY-MM-DDTHH:MM:SSZ",
          "updated_at": "YYYY-MM-DDTHH:MM:SSZ"
        }
        ```
*   **Errors:** 400 (Bad Request - validation fails, invalid division_id), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found - if referenced division_id doesn't exist), 500 (Internal Server Error)

---

### `PATCH /api/yeargroups/{yeargroupID}/name`

Updates the name of an existing year group **within the requesting admin's school**.

*   **Authentication:** Required (Admin Only).
*   **Path Parameters:**
    *   `yeargroupID` (Integer or UUID): The ID of the year group to update.
*   **Request Body:**
    ```json
    {
      "year_group_name": "Year Seven"
    }
    ```
*   **Success Response (`200 OK` or `204 No Content`):**
    *   Body (if 200 OK): Returns updated fields like `id`, `year_group_name`, `updated_at`.
*   **Errors:** 400 (Bad Request), 401, 403, 404 (Not Found), 500

---

### `PATCH /api/yeargroups/{yeargroupID}/division`

Updates the division association of an existing year group **within the requesting admin's school**.

*   **Authentication:** Required (Admin Only).
*   **Path Parameters:**
    *   `yeargroupID` (Integer or UUID): The ID of the year group to update.
*   **Request Body:**
    ```json
    {
      "division_id": 1 // ID of the new division
    }
    ```
*   **Success Response (`200 OK` or `204 No Content`):**
    *   Body (if 200 OK): Returns updated fields like `id`, `division_id`, `updated_at`.
*   **Errors:** 400 (Bad Request - invalid division_id), 401, 403, 404 (Not Found - Year group or Division not found), 500

---

### `DELETE /api/yeargroups/{yeargroupID}`

Deletes a specified year group **within the requesting admin's school**. May be restricted if in use (e.g., by classes).

*   **Authentication:** Required (Admin Only).
*   **Path Parameters:**
    *   `yeargroupID` (Integer or UUID): The ID of the year group to delete.
*   **Success Response (`204 No Content`):**
*   **Errors:** 400 (Bad Request - e.g., year group in use), 401, 403, 404 (Not Found), 500

---

## Classes

---

### `GET /api/classes`

Retrieves a list of classes **for the user's school**.

*   **Authentication:** Required (Admin Only recommended).
*   **Request Body:** None.
*   **Success Response (`200 OK`):**
    *   Body: Returns a JSON array of class objects, including `school_id`, `year_group_id`.
        ```json
        [
          {
            "id": 101, // Or UUID
            "class_name": "4A",
            "year_group_id": 10, // ID of the year group this class belongs to
            "school_id": "uuid-string-school-id",
            "created_at": "YYYY-MM-DDTHH:MM:SSZ",
            "updated_at": "YYYY-MM-DDTHH:MM:SSZ"
          }
        ]
        ```
*   **Errors:** 401, 403, 500

---

### `POST /api/classes`

Creates a new class **within the requesting admin's school**. Requires associating with an existing year group.

*   **Authentication:** Required (Admin Only).
*   **Request Body:**
    ```json
    {
      "class_name": "Reception Blue",
      "year_group_id": 1 // ID of an existing year group in the admin's school
    }
    ```
*   **Success Response (`201 Created`):**
    *   Body: Returns the created class object.
        ```json
        {
          "id": 102, // Or UUID
          "class_name": "Reception Blue",
          "year_group_id": 1,
          "school_id": "uuid-string-admin-school-id",
          "created_at": "YYYY-MM-DDTHH:MM:SSZ",
          "updated_at": "YYYY-MM-DDTHH:MM:SSZ"
        }
        ```
*   **Errors:** 400 (Bad Request - validation fails, invalid year_group_id), 401, 403, 404 (Not Found - if referenced year_group_id doesn't exist), 500

---

### `PATCH /api/classes/{classID}/name`

Updates the name of an existing class **within the requesting admin's school**.

*   **Authentication:** Required (Admin Only).
*   **Path Parameters:**
    *   `classID` (Integer or UUID): The ID of the class to update.
*   **Request Body:**
    ```json
    {
      "class_name": "Year 4 Class A"
    }
    ```
*   **Success Response (`200 OK` or `204 No Content`):**
    *   Body (if 200 OK): Returns updated fields.
*   **Errors:** 400, 401, 403, 404 (Not Found), 500

---

### `PATCH /api/classes/{classID}/yeargroup`

Updates the year group association of an existing class **within the requesting admin's school**.

*   **Authentication:** Required (Admin Only).
*   **Path Parameters:**
    *   `classID` (Integer or UUID): The ID of the class to update.
*   **Request Body:**
    ```json
    {
      "year_group_id": 11 // ID of the new year group
    }
    ```
*   **Success Response (`200 OK` or `204 No Content`):**
    *   Body (if 200 OK): Returns updated fields.
*   **Errors:** 400 (Bad Request - invalid year_group_id), 401, 403, 404 (Not Found - Class or Year Group not found), 500

---

### `DELETE /api/classes/{classID}`

Deletes a specified class **within the requesting admin's school**. May be restricted if in use (e.g., by pupils or drops).

*   **Authentication:** Required (Admin Only).
*   **Path Parameters:**
    *   `classID` (Integer or UUID): The ID of the class to delete.
*   **Success Response (`204 No Content`):**
*   **Errors:** 400 (Bad Request - e.g., class in use), 401, 403, 404 (Not Found), 500

---

## Full School Structure

---

### `GET /api/school-structure`

Retrieves the entire school structure (divisions, year groups, classes) for the user's school in a nested format.

*   **Authentication:** Required (Any authenticated user, as this is often needed for UI selectors).
*   **Request Body:** None.
*   **Success Response (`200 OK`):**
    *   Body: Returns a nested JSON structure.
        ```json
        {
          "school_id": "uuid-string-school-id",
          "divisions": [
            {
              "id": 1,
              "division_name": "Upper School",
              "year_groups": [
                {
                  "id": 10,
                  "year_group_name": "Year 7",
                  "classes": [
                    { "id": 101, "class_name": "7A" },
                    { "id": 102, "class_name": "7B" }
                  ]
                },
                {
                  "id": 11,
                  "year_group_name": "Year 8",
                  "classes": [ /* ... */ ]
                }
              ]
            },
            {
              "id": 2,
              "division_name": "Lower School",
              "year_groups": [ /* ... */ ]
            }
          ]
        }
        ```
*   **Errors:** 401 (Unauthorized), 500 (Internal Server Error)

---
