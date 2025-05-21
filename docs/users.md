# User Endpoints

This section details API endpoints for managing user accounts. All user management operations are scoped to the authenticated user's `school_id`.

---

## `POST /api/users`

Creates a new user **within the requesting admin's school**.

*   **Authentication:** Required (Admin Only). Admin must belong to a school.
*   **Request Body:**
    ```json
    {
      "email": "new.teacher@example.com",
      "password": "secure_password",
      "role": "user", // e.g., "user", "admin"
      "title": "Mx.",
      "first_name": "New",
      "surname": "Teacher"
    }
    ```
*   **Success Response (`201 Created`):**
    *   Body: Returns the created user object (excluding password, including `school_id`).
        ```json
        {
          "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
          "email": "new.teacher@example.com",
          "role": "user",
          "title": "Mx.",
          "first_name": "New",
          "surname": "Teacher",
          "school_id": "uuid-string-admin-school-id",
          "created_at": "2025-04-04T09:59:51Z",
          "updated_at": "2025-04-04T09:59:51Z"
        }
        ```
*   **Errors:** 400 (Bad Request - validation fails, e.g., duplicate email, invalid role), 401 (Unauthorized), 403 (Forbidden - requester not admin or no school context), 500 (Internal Server Error - DB error)

---

## `GET /api/users`

Retrieves a list of users **within the requesting admin's school**.

*   **Authentication:** Required (Admin Only).
*   **Request Body:** None.
*   **Success Response (`200 OK`):**
    *   Body: Returns a JSON array of user objects (excluding passwords, including `school_id`).
        ```json
        [
          {
            "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
            "email": "teacher@example.com",
            "role": "user",
            "title": "Mx.",
            "first_name": "Some",
            "surname": "Teacher",
            "school_id": "uuid-string-admin-school-id",
            "created_at": "2025-04-04T09:59:51Z",
            "updated_at": "2025-04-13T14:00:00Z"
          }
          // ... more users from the same school
        ]
        ```
*   **Errors:** 401 (Unauthorized), 403 (Forbidden - requester not admin), 500 (Internal Server Error)

---

## `GET /api/users/me`

Retrieves the profile details for the **currently authenticated user**.

*   **Authentication:** Required (Any authenticated user).
*   **Request Body:** None.
*   **Success Response (`200 OK`):**
    *   Body: Returns the user object (excluding password, including `school_id`).
        ```json
        {
          "id": "uuid-string-current-user-id",
          "email": "current.user@example.com",
          "role": "user",
          "title": "Dr.",
          "first_name": "Current",
          "surname": "User",
          "school_id": "uuid-string-user-school-id",
          "created_at": "2025-01-10T10:00:00Z",
          "updated_at": "2025-03-15T11:30:00Z"
        }
        ```
*   **Errors:** 401 (Unauthorized), 500 (Internal Server Error)

---

## `GET /api/users/{userID}`

Retrieves details for a single user by ID, **provided they are in the requesting admin's school**.

*   **Authentication:** Required (Admin Only).
*   **Path Parameters:**
    *   `userID` (UUID): The ID of the user to retrieve.
*   **Request Body:** None.
*   **Success Response (`200 OK`):**
    *   Body: Returns the user object (excluding password, including `school_id`).
        ```json
        {
          "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
          "email": "teacher@example.com",
          "role": "user",
          "title": "Mx.",
          "first_name": "Some",
          "surname": "Teacher",
          "school_id": "uuid-string-admin-school-id",
          "created_at": "2025-04-04T09:59:51Z",
          "updated_at": "2025-04-13T14:00:00Z"
        }
        ```
*   **Errors:** 400 (Bad Request - invalid UUID format), 401 (Unauthorized), 403 (Forbidden - requester not admin), 404 (Not Found - User not found within admin's school scope), 500 (Internal Server Error)

---

## `PUT /api/users/me/password`

Updates the **currently authenticated user's** password after verifying their current password. Operation is implicitly scoped to the user's school.

*   **Authentication:** Required (Any authenticated user).
*   **Request Body:**
    ```json
    {
      "current_password": "user-current-actual-password",
      "new_password": "user-new-valid-password"
    }
    ```
*   **Success Response (`204 No Content`):**
    *   Body: None.
*   **Errors:** 400 (Bad Request - invalid body, password policy fail, current password wrong), 401 (Unauthorized), 403 (Forbidden - e.g. Demo Mode restrictions), 500 (Internal Server Error)

---

## `PATCH /api/users/{userID}/name`

Updates the specified user's name details (title, first name, surname). Operation is scoped to the requester's school.

*   **Authentication:** Required (Admin can update any user *in their school*; non-admin user can only update their own profile via this route if `userID` is their own).
*   **Path Parameters:**
    *   `userID` (UUID): The ID of the user whose name is being updated.
*   **Request Body:**
    ```json
    {
      "title": "Mx.",
      "first_name": "UpdatedFirstName",
      "surname": "UpdatedSurname"
    }
    ```
    *Note: All three fields are required and cannot be empty strings.*
*   **Success Response (`200 OK`):**
    *   Body: Returns the updated name fields, plus `id`, `updated_at`, and `school_id`.
        ```json
        {
          "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
          "school_id": "uuid-string-school-id",
          "updated_at": "2025-04-13T13:30:00Z",
          "title": "Mx.",
          "first_name": "UpdatedFirstName",
          "surname": "UpdatedSurname"
        }
        ```
*   **Errors:** 400 (Bad Request - invalid body/UUID, empty name field), 401 (Unauthorized), 403 (Forbidden - permission denied/cross-school attempt), 404 (Not Found - User not found within scope), 500 (Internal Server Error)

---

## `PUT /api/users/{userID}/password`

Updates or resets the password for a specified user **within the requesting admin's school**. Does *not* require the user's current password.

*   **Authentication:** Required (Admin Only).
*   **Path Parameters:**
    *   `userID` (UUID): The ID of the user whose password is being set/reset.
*   **Request Body:**
    ```json
    {
      "password": "new-secure-password-set-by-admin"
    }
    ```
*   **Success Response (`204 No Content`):**
    *   Body: None.
*   **Errors:** 400 (Bad Request - invalid body/UUID, password policy fail), 401 (Unauthorized), 403 (Forbidden - Not Admin / Demo Mode restrictions), 404 (Not Found - User not found within admin's school scope), 500 (Internal Server Error)

---

## `PATCH /api/users/{userID}/role`

Updates the role for the specified user **within the requesting admin's school**.

*   **Authentication:** Required (Admin Only).
*   **Path Parameters:**
    *   `userID` (UUID): The ID of the user whose role is being updated.
*   **Request Body:**
    ```json
    {
      "role": "admin" // Or other valid role string e.g. "user"
    }
    ```
*   **Success Response (`204 No Content`):**
    *   Body: None.
*   **Errors:** 400 (Bad Request - invalid body/UUID, invalid role value, admin changing own role), 401 (Unauthorized), 403 (Forbidden - Not Admin), 404 (Not Found - User not found within admin's school scope), 500 (Internal Server Error)

---

## `DELETE /api/users/{userID}`

Deletes a specified user **within the requesting admin's school**.

*   **Authentication:** Required (Admin Only).
*   **Path Parameters:**
    *   `userID` (UUID): The ID of the user to delete.
*   **Request Body:** None.
*   **Success Response (`204 No Content`):** No response body.
*   **Errors:** 400 (Bad Request - invalid UUID, admin attempting to delete self), 401 (Unauthorized), 403 (Forbidden - Not Admin / Demo Mode restrictions), 404 (Not Found - User not found within admin's school scope), 500 (Internal Server Error)

---

## `DELETE /api/users`

**DANGER ZONE:** Deletes **all users** within the requesting admin's school. This is a destructive operation.

*   **Authentication:** Required (Admin Only).
*   **Request Body:** None.
*   **Success Response (`204 No Content`):** No response body.
*   **Errors:** 401 (Unauthorized), 403 (Forbidden - Not Admin / Demo Mode restrictions), 500 (Internal Server Error)

*Note: The previously documented `DELETE /api/users/{userID}` for specific user deletion is implemented as shown above. The endpoint `DELETE /api/users` without a userID parameter is a separate, more destructive operation.*

---
