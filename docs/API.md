# Droplet API Documentation

## Introduction

This document details the RESTful API endpoints provided by the Droplet backend server. It's intended for developers interacting with the API or understanding its capabilities.

**Base URL:** All API endpoints described below are prefixed with `/api`. If running locally on the default port 8080, the full base URL is `http://localhost:8080/api`.

**Multi-Tenancy:** The application uses a shared database/shared schema multi-tenancy model based on `school_id`. All data belonging to a specific school (users, pupils, classes, drops, etc.) is associated with that school's unique ID. API access is automatically scoped to the authenticated user's `school_id` provided via their JWT.

## Authentication

Most endpoints require authentication using a **JSON Web Token (JWT)** provided as a Bearer token in the `Authorization` header.

1.  **Login (`POST /api/login`):** Send email and password to receive an `access token` (JWT in the response body) and potentially a `refresh token` (e.g., set in an HttpOnly cookie or returned). The access token contains claims for `userID`, `role`, and `schoolID`.
2.  **Authenticated Requests:** For all endpoints marked as "Authentication: Required", include the obtained access token in the request header:
```
Authorization: Bearer <your_access_token>
```
    The backend middleware uses the `schoolID` claim from the token to scope data access for subsequent operations.
3.  **Token Refresh (`POST /api/token/refresh`):** When the access token expires (indicated by a `401 Unauthorized` response), call this endpoint (potentially sending a refresh token via cookie or body). A successful response provides a new access token containing the user's current `userID`, `role`, and `schoolID`.
4.  **Logout (`POST /api/token/revoke`):** Call this endpoint to invalidate the current refresh token (likely scoped to the user's session within their school).

## Common Error Responses

The API uses standard HTTP status codes. Error responses typically include a JSON body with an error message:

```json
{
  "error": "A descriptive error message here"
}
```

Common status codes include:

* **`400 Bad Request`**: Invalid request format, missing required fields, validation errors (e.g., invalid date format, empty title/content, invalid target ID for school).
* **`401 Unauthorized`**: Missing, invalid, or expired JWT access token (for protected routes), or invalid credentials/refresh token for auth routes.
* **`403 Forbidden`**: Authenticated user lacks permission for the requested action (e.g., non-admin trying admin tasks, user trying to modify another user's drop, trying to access/modify resources outside their `school_id` scope).
* **`404 Not Found`**: The requested resource (e.g., a specific drop ID, user ID) does not exist *within the user's school scope*.
* **`500 Internal Server Error`**: An unexpected error occurred on the server (database issue, unhandled code error).

---

## Endpoints

### Authentication

---

#### `POST /api/login`

Authenticates a user and provides access/refresh tokens.

* **Authentication:** None
* **Request Body:**
```json
{
  "email": "user@example.com",
  "password": "user_password"
}
```
* **Success Response (`200 OK`):**
    * Sets `HttpOnly` refresh token cookie (if applicable).
    * Body (Includes `school_id`):
```json
{
  "id": "uuid-string-user-id",
  "email": "user@example.com",
  "role": "admin",
  "school_id": "uuid-string-school-id",
  "token": "your_access_token_jwt_string"
}
```
* **Errors:** 400, 401, 500

---

#### `POST /api/token/refresh`

Issues a new access token using a valid refresh token. The new token will reflect the user's current `school_id`.

* **Authentication:** Via Refresh Token (e.g., HttpOnly cookie or body)
* **Request Body:** Potentially None (if cookie) or `{ "refresh_token": "..." }`
* **Success Response (`200 OK`):**
    * Body:
```json
{
  "token": "new_access_token_jwt_string"
}
```
* **Errors:** 401 (invalid/missing refresh token), 500

---

#### `POST /api/token/revoke`

Revokes the refresh token associated with the request (logout for that session/school context).

* **Authentication:** Via Refresh Token (e.g., HttpOnly cookie or body)
* **Request Body:** Potentially None or `{ "refresh_token": "..." }`
* **Success Response (`204 No Content`):** No response body.
* **Errors:** 500

---

### Users

---

#### `POST /api/users`

Creates a new user **within the requesting admin's school**.

* **Authentication:** Required (Admin Only). Admin must belong to a school.
* **Request Body:**
```json
{
  "email": "new.teacher@example.com",
  "password": "secure_password",
  "role": "user",
  "title": "Mx.",
  "first_name": "New",
  "surname": "Teacher"
}
```
* **Success Response (`201 Created`):**
    * Body: Returns the created user object (excluding password, including `school_id`).
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
* **Errors:** 400 (validation fails), 401, 403 (requester not admin), 500 (DB error, context error)

---

#### `GET /api/users`

Retrieves a list of users **within the requesting admin's school**.

* **Authentication:** Required (Admin Only).
* **Request Body:** None.
* **Success Response (`200 OK`):**
    * Body: Returns a JSON array of user objects (excluding passwords, including `school_id`).
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
* **Errors:** 401, 403, 500

---

#### `GET /api/users/{userID}`

Retrieves details for a single user by ID, **provided they are in the requesting admin's school**.

* **Authentication:** Required (Admin Only).
* **Path Parameters:**
    * `userID` (UUID): The ID of the user to retrieve.
* **Request Body:** None.
* **Success Response (`200 OK`):**
    * Body: Returns the user object (excluding password, including `school_id`).
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
* **Errors:** 400 (invalid UUID format), 401, 403, 404 (User not found within admin's school scope), 500

---

#### `PUT /api/users/me/password`

Updates the **currently authenticated user's** password after verifying their current password. Operation is implicitly scoped to the user's school.

* **Authentication:** Required (Any authenticated user).
* **Request Body:**
```json
{
  "current_password": "user-current-actual-password",
  "new_password": "user-new-valid-password"
}
```
* **Success Response (`204 No Content`):**
    * Body: None.
* **Errors:** 400 (invalid body, policy fail, current password wrong), 401, 500, 403 (Demo Mode).

---

#### `PATCH /api/users/{userID}/name`

Updates the specified user's name details (title, first name, surname). Operation is scoped to the requester's school. Requires all three name fields.

* **Authentication:** Required (Admin can update any user *in their school*; non-admin user can only update their own profile).
* **Path Parameters:**
    * `userID` (UUID): The ID of the user whose name is being updated.
* **Request Body:**
```json
{
  "title": "Mx.",
  "first_name": "UpdatedFirstName",
  "surname": "UpdatedSurname"
}
```
    *Note: All three fields are required and cannot be empty strings.*
* **Success Response (`200 OK`):**
    * Body: Returns the updated name fields, plus `id`, `updated_at`, and `school_id`.
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
* **Errors:** 400 (invalid body/UUID, empty name field), 401, 403 (permission denied/cross-school attempt), 404 (User not found within scope), 500

---

#### `PUT /api/users/{userID}/password`

Updates or resets the password for a specified user **within the requesting admin's school**. Does *not* require the user's current password.

* **Authentication:** Required (Admin Only).
* **Path Parameters:**
    * `userID` (UUID): The ID of the user whose password is being set/reset.
* **Request Body:**
```json
{
  "password": "new-secure-password-set-by-admin"
}
```
* **Success Response (`204 No Content`):** *(Revised based on handler)*
    * Body: None.
* **Errors:** 400 (invalid body/UUID, password policy fail), 401, 403 (Not Admin / Demo Mode), 404 (User not found within admin's school scope), 500

---

#### `PATCH /api/users/{userID}/role`

Updates the role for the specified user **within the requesting admin's school**.

* **Authentication:** Required (Admin Only).
* **Path Parameters:**
    * `userID` (UUID): The ID of the user whose role is being updated.
* **Request Body:**
```json
{
  "role": "admin" // Or other valid role string
}
```
* **Success Response (`204 No Content`):** *(Revised based on handler)*
    * Body: None.
* **Errors:** 400 (invalid body/UUID, invalid role value, admin changing own role), 401, 403 (Not Admin), 404 (User not found within admin's school scope), 500

---

#### `DELETE /api/users/{userID}`

Deletes a specified user **within the requesting admin's school**.

* **Authentication:** Required (Admin Only).
* **Path Parameters:**
    * `userID` (UUID): The ID of the user to delete.
* **Request Body:** None.
* **Success Response (`204 No Content`):** No response body.
* **Errors:** 400 (invalid UUID, admin deleting self), 401, 403 (Not Admin / Demo Mode), 404 (User not found within admin's school scope), 500

---

### Drops

---

#### `GET /api/drops`

Retrieves a list of active drops **for the user's school**, including targets and author/editor info.

* **Authentication:** Required
* **Request Body:** None
* **Success Response (`200 OK`):**
    * Body: Returns a JSON array of `DropWithTargets` objects, now implicitly scoped by school. Consider adding `school_id` to the drop object itself.
```json
[
  {
    "id": "uuid-string-drop1-id",
    "user_id": "uuid-string-author-id",
    "school_id": "uuid-string-school-id", // Added
    "title": "Active Drop 1 Title",
    "content": "Content here...",
    // ... other drop fields ...
    "targets": [ /* ... targets ... */ ]
  }
]
```
* **Errors:** 401, 500

---

#### `GET /api/mydrops`

Retrieves active drops targeted to the current user (via subscriptions) **within their school**.

* **Authentication:** Required
* **Request Body:** None
* **Success Response (`200 OK`):**
    * Body: Returns a JSON array of `DropWithTargets` objects (same structure as `GET /api/drops`).
* **Errors:** 401, 500

---

#### `GET /api/upcoming`

Retrieves upcoming drops targeted to the current user (via subscriptions) **within their school**.

* **Authentication:** Required
* **Request Body:** None
* **Success Response (`200 OK`):**
    * Body: Returns a JSON array of `DropWithTargets` objects (same structure as `GET /api/drops`).
* **Errors:** 401, 500

---

#### `POST /api/drops`

Creates a new drop **within the creator's school** and associates specified targets. Requires target validation against the creator's school. Uses a transaction.

* **Authentication:** Required
* **Request Body:**
```json
{
  "title": "New Drop Title",
  "content": "Message content here.",
  "post_date": "YYYY-MM-DD",
  "expire_date": "YYYY-MM-DD",
  "targets": [ // These targets MUST belong to the creator's school
    {"type": "Class", "id": 101}, // Use correct ID type (int32 or UUID)
    {"type": "General", "id": 0}
  ]
}
```
* **Success Response (`201 Created`):**
    * Body: Returns the core created drop object, including `school_id`.
```json
{
  "id": "uuid-string-new-drop-id",
  "user_id": "uuid-string-creator-id",
  "school_id": "uuid-string-creator-school-id", // Added
  "title": "New Drop Title",
  // ... other fields ...
}
```
* **Errors:** 400 (validation, invalid target ID for school), 401, 500

---

#### `GET /api/drops/{dropID}`

Retrieves details for a single drop by ID, **provided it belongs to the user's school**.

* **Authentication:** Required
* **Path Parameters:**
    * `{dropID}` (UUID): The ID of the drop.
* **Request Body:** None
* **Success Response (`200 OK`):**
    * Body: Returns a single `DropWithTargets` JSON object, including `school_id`.
```json
{
  "id": "uuid-string-drop-id",
  "user_id": "uuid-string-author-id",
  "school_id": "uuid-string-school-id", // Added
  "title": "Drop Title",
   // ... other fields ...
  "targets": [ /* ... targets ... */ ]
}
```
* **Errors:** 400 (invalid UUID), 401, 403 (Access Denied - implicitly via 404), 404 (Drop not found within user's school scope), 500

---

#### `PUT /api/drops/{dropID}`

Updates an existing drop's details and **replaces** its targets, **provided the drop belongs to the user's school**. Requires target validation. Uses a transaction.

* **Authentication:** Required (Admin or original Author within the same school).
* **Path Parameters:**
    * `{dropID}` (UUID): The ID of the drop to update.
* **Request Body:** (Same structure as `POST /api/drops`)
```json
{
  "title": "Updated Drop Title",
  // ... other fields ...
  "targets": [ // New targets must belong to user's school
    {"type": "Division", "id": 1} // Use correct ID type
  ]
}
```
* **Success Response (`204 No Content`):** No response body.
* **Errors:** 400 (invalid UUID/body, invalid target ID for school), 401, 403 (permission denied), 404 (Drop not found within scope), 500

---

#### `DELETE /api/drops/{dropID}`

Deletes a specific drop, **provided it belongs to the user's school**.

* **Authentication:** Required (Admin or original Author within the same school).
* **Path Parameters:**
    * `{dropID}` (UUID): The ID of the drop to delete.
* **Request Body:** None
* **Success Response (`204 No Content`):** No response body.
* **Errors:** 400 (invalid UUID), 401, 403 (permission denied), 404 (Drop not found within scope), 500

---

### Drop Targets *(Review if this endpoint is still needed/used)*

---

#### `POST /api/droptargets`

Adds a single target association to an existing drop. *(Note: Likely needs `school_id` scoping checks for both drop and target).*

* **Authentication:** Required (Admin or original Author within the same school).
* **Request Body:**
```json
{
  "drop_id": "uuid-string-drop-id",
  "type": "Class",
  "target_id": 101 // Use correct ID type. Target must belong to user's school.
}
```
* **Success Response (`204 No Content`):** No response body.
* **Errors:** 400 (invalid target/drop ID for school), 401, 403, 404 (Drop not found within scope), 500

---

### Target Lookup Data

These endpoints provide lists of entities that can be targeted, now **scoped to the user's school**.

---

#### `GET /api/divisions`

Retrieves a list of divisions **for the user's school**.

* **Authentication:** Required.
* **Success Response (`200 OK`):**
```json
[
  // Only divisions belonging to the user's school_id
  { "id": 1, "division_name": "Upper School", "school_id": "uuid..." } // Added school_id for clarity
]
```
* **Errors:** 401, 500

---

#### `GET /api/yeargroups`

Retrieves a list of year groups **for the user's school**.

* **Authentication:** Required.
* **Success Response (`200 OK`):**
```json
[
  // Only year groups belonging to the user's school_id
  { "id": 10, "year_group_name": "Year 7", "school_id": "uuid..." } // Added school_id for clarity
]
```
* **Errors:** 401, 500

---

#### `GET /api/classes`

Retrieves a list of classes **for the user's school**.

* **Authentication:** Required.
* **Success Response (`200 OK`):**
```json
[
   // Only classes belonging to the user's school_id
  { "id": 101, "class_name": "4A", "school_id": "uuid..." } // Added school_id for clarity
]
```
* **Errors:** 401, 500

---

#### `GET /api/pupils`

Retrieves a list of pupils **for the user's school**.

* **Authentication:** Required. *(Note: Should regular users access this? Probably Admin only? Adjust Auth)*
* **Success Response (`200 OK`):**
```json
[
  // Only pupils belonging to the user's school_id
  { "id": 1001, "first_name": "John", "surname": "Doe", "school_id": "uuid..." } // Added school_id for clarity
]
```
* **Errors:** 401, 403 (if made Admin only), 500

---

### Settings

Endpoints related to the logged-in user's settings, implicitly scoped to their school.

---

#### `GET /api/settings/me`

Retrieves the current user's preferences and target subscriptions (targets listed must belong to user's school).

* **Authentication:** Required
* **Request Body:** None
* **Success Response (`200 OK`):**
```json
{
  "preferences": { /* ... */ },
  "subscriptions": [ /* Targets only from user's school */ ]
}
```
* **Errors:** 401, 500

---

#### `PUT /api/settings/me/preferences`

Updates the current user's display preferences. Implicitly scoped to user/school.

* **Authentication:** Required
* **Request Body:**
```json
{
  "color_theme": "dark",
  "layout_pref": "3 columns"
}
```
* **Success Response (`204 No Content`):** No response body.
* **Errors:** 400 (invalid value), 401, 500

---

#### `PUT /api/settings/me/subscriptions`

Replaces the current user's subscriptions. **Requires validation** that all submitted target IDs belong to the user's school. Uses a transaction.

* **Authentication:** Required
* **Request Body:**
```json
{
  "targets": [ // Targets must belong to user's school
    {"type": "Class", "id": 101}, // Use correct ID type
    {"type": "Division", "id": 1}
  ]
}
```
* **Success Response (`204 No Content`):** No response body.
* **Errors:** 400 (invalid target ID for school, bad JSON), 401, 500

---