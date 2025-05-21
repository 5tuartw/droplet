# Settings Endpoints

This section details API endpoints related to the logged-in user's settings, such as preferences and target subscriptions. Operations are implicitly scoped to the user's account and their `school_id`.

---

## `GET /api/settings/me`

Retrieves the current user's preferences and target subscriptions. Any targets listed in subscriptions must belong to the user's school.

*   **Authentication:** Required (Any authenticated user).
*   **Request Body:** None.
*   **Success Response (`200 OK`):**
    *   Body: Returns a JSON object containing user preferences and their list of subscriptions.
        ```json
        {
          "preferences": {
            "color_theme": "dark",
            "layout_pref": "3_columns",
            "notification_sound_active": true,
            "notification_email_active": false
            // ... other preference fields
          },
          "subscriptions": [
            { "type": "Class", "id": 101, "name": "Class 4A" }, // Example target, ID type matches (int or UUID)
            { "type": "Division", "id": 1, "name": "Upper School" },
            { "type": "General", "id": 0, "name": "General Updates" }
            // ... other subscribed targets, all belonging to the user's school
          ]
        }
        ```
*   **Errors:** 401 (Unauthorized), 500 (Internal Server Error)

---

## `PUT /api/settings/me/preferences`

Updates the current user's display and notification preferences. Implicitly scoped to the user/school.

*   **Authentication:** Required (Any authenticated user).
*   **Request Body:**
    A JSON object containing the preference fields to be updated. Only include fields that are being changed.
    ```json
    {
      "color_theme": "light", // Example: changing color theme
      "notification_email_active": true // Example: enabling email notifications
      // ... other preferences can be included
    }
    ```
*   **Success Response (`204 No Content`):** No response body.
*   **Errors:** 400 (Bad Request - invalid value for a preference, e.g., unknown theme name), 401 (Unauthorized), 500 (Internal Server Error)

---

## `PUT /api/settings/me/subscriptions`

Replaces the current user's list of target subscriptions. **Requires validation** that all submitted target IDs are valid and belong to the user's school. This operation uses a database transaction to ensure atomicity (all subscriptions are updated or none are).

*   **Authentication:** Required (Any authenticated user).
*   **Request Body:**
    A JSON object containing a list of targets the user wishes to subscribe to. This list will replace all existing subscriptions.
    ```json
    {
      "targets": [ // Targets must belong to user's school and be valid targetable entities
        {"type": "Class", "id": 101},    // Ensure ID type matches (e.g., integer or UUID)
        {"type": "Division", "id": 1},
        {"type": "General", "id": 0}
        // To clear all subscriptions, send an empty array: "targets": []
      ]
    }
    ```
*   **Success Response (`204 No Content`):** No response body.
*   **Errors:** 400 (Bad Request - invalid JSON, one or more target IDs are invalid or do not belong to the user's school), 401 (Unauthorized), 500 (Internal Server Error)

---
