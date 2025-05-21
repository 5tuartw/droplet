# Drop Endpoints

This section describes the API endpoints for managing "drops" (notifications or messages). All drop operations are scoped to the authenticated user's `school_id`.

---

## `GET /api/drops`

Retrieves a list of active drops **for the user's school**, including targets and author/editor info.

*   **Authentication:** Required
*   **Request Body:** None
*   **Success Response (`200 OK`):**
    *   Body: Returns a JSON array of `DropWithTargets` objects, implicitly scoped by school. The `school_id` is included in the drop object.
        ```json
        [
          {
            "id": "uuid-string-drop1-id",
            "user_id": "uuid-string-author-id",
            "school_id": "uuid-string-school-id",
            "title": "Active Drop 1 Title",
            "content": "Content here...",
            "post_date": "YYYY-MM-DD",
            "expire_date": "YYYY-MM-DD",
            "created_at": "YYYY-MM-DDTHH:MM:SSZ",
            "updated_at": "YYYY-MM-DDTHH:MM:SSZ",
            "user_name": "Author Name", // Example, if included
            "edited_by_name": "Editor Name", // Example, if included
            "targets": [
              {"type": "Class", "id": 101, "name": "Class Name"}, // Example target structure
              {"type": "General", "id": 0, "name": "General"}
            ]
          }
        ]
        ```
*   **Errors:** 401 (Unauthorized), 500 (Internal Server Error)

---

## `GET /api/mydrops`

Retrieves active drops targeted to the current user (via their subscriptions) **within their school**.

*   **Authentication:** Required
*   **Request Body:** None
*   **Success Response (`200 OK`):**
    *   Body: Returns a JSON array of `DropWithTargets` objects (same structure as `GET /api/drops`).
*   **Errors:** 401 (Unauthorized), 500 (Internal Server Error)

---

## `GET /api/upcomingdrops`

Retrieves upcoming drops targeted to the current user (via subscriptions) **within their school**.
*(Previously documented as `/api/upcoming`)*

*   **Authentication:** Required
*   **Request Body:** None
*   **Success Response (`200 OK`):**
    *   Body: Returns a JSON array of `DropWithTargets` objects (same structure as `GET /api/drops`, filtered for upcoming post dates).
*   **Errors:** 401 (Unauthorized), 500 (Internal Server Error)

---

## `POST /api/drops`

Creates a new drop **within the creator's school** and associates specified targets. Target IDs must be valid and belong to the creator's school. Uses a database transaction.

*   **Authentication:** Required
*   **Request Body:**
    ```json
    {
      "title": "New Drop Title",
      "content": "Message content here.",
      "post_date": "YYYY-MM-DD",  // e.g., "2024-08-01"
      "expire_date": "YYYY-MM-DD", // e.g., "2024-08-10"
      "targets": [ // These targets MUST belong to the creator's school
        {"type": "Class", "id": 101}, // Ensure ID type matches (e.g., integer or UUID)
        {"type": "General", "id": 0}  // 'General' type typically has a predefined ID like 0
      ]
    }
    ```
*   **Success Response (`201 Created`):**
    *   Body: Returns the core created drop object, including `school_id`.
        ```json
        {
          "id": "uuid-string-new-drop-id",
          "user_id": "uuid-string-creator-id",
          "school_id": "uuid-string-creator-school-id",
          "title": "New Drop Title",
          "content": "Message content here.",
          "post_date": "YYYY-MM-DD",
          "expire_date": "YYYY-MM-DD",
          "created_at": "YYYY-MM-DDTHH:MM:SSZ",
          "updated_at": "YYYY-MM-DDTHH:MM:SSZ"
        }
        ```
*   **Errors:** 400 (Bad Request - validation errors like missing fields, invalid dates, invalid target ID for school), 401 (Unauthorized), 500 (Internal Server Error)

---

## `GET /api/drops/{dropID}`

Retrieves details for a single drop by ID, **provided it belongs to the user's school**.

*   **Authentication:** Required
*   **Path Parameters:**
    *   `{dropID}` (UUID): The ID of the drop.
*   **Request Body:** None
*   **Success Response (`200 OK`):**
    *   Body: Returns a single `DropWithTargets` JSON object, including `school_id` (similar structure to items in `GET /api/drops` response).
*   **Errors:** 400 (Bad Request - invalid UUID format), 401 (Unauthorized), 404 (Not Found - Drop not found within user's school scope), 500 (Internal Server Error)

---

## `PUT /api/drops/{dropID}`

Updates an existing drop's details and **replaces** its targets, **provided the drop belongs to the user's school**. Requires target validation. Uses a database transaction.

*   **Authentication:** Required (Admin or original Author within the same school).
*   **Path Parameters:**
    *   `{dropID}` (UUID): The ID of the drop to update.
*   **Request Body:** (Same structure as `POST /api/drops`)
    ```json
    {
      "title": "Updated Drop Title",
      "content": "Updated message content.",
      "post_date": "YYYY-MM-DD",
      "expire_date": "YYYY-MM-DD",
      "targets": [ // New targets must belong to user's school
        {"type": "Division", "id": 1} // Ensure ID type matches
      ]
    }
    ```
*   **Success Response (`204 No Content`):** No response body.
*   **Errors:** 400 (Bad Request - invalid UUID/body, invalid target ID for school), 401 (Unauthorized), 403 (Forbidden - permission denied, e.g., not author or admin), 404 (Not Found - Drop not found within scope), 500 (Internal Server Error)

---

## `DELETE /api/drops/{dropID}`

Deletes a specific drop, **provided it belongs to the user's school**.

*   **Authentication:** Required (Admin or original Author within the same school).
*   **Path Parameters:**
    *   `{dropID}` (UUID): The ID of the drop to delete.
*   **Request Body:** None
*   **Success Response (`204 No Content`):** No response body.
*   **Errors:** 400 (Bad Request - invalid UUID), 401 (Unauthorized), 403 (Forbidden - permission denied), 404 (Not Found - Drop not found within scope), 500 (Internal Server Error)

---

## Drop Targets

*(Review if this endpoint is still needed/used, as PUT /api/drops/{dropID} replaces targets)*

### `POST /api/droptargets`

Adds a single target association to an existing drop. *(Note: Likely needs `school_id` scoping checks for both drop and target).*

*   **Authentication:** Required (Admin or original Author within the same school).
*   **Request Body:**
    ```json
    {
      "drop_id": "uuid-string-drop-id", // Drop must be in user's school
      "type": "Class",                  // Target type
      "target_id": 101                  // Target ID (e.g., int or UUID), must be in user's school
    }
    ```
*   **Success Response (`204 No Content`):** No response body.
*   **Errors:** 400 (Bad Request - invalid target/drop ID for school), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found - Drop/Target not found within scope), 500 (Internal Server Error)

---
