# Droplet API Documentation

## Introduction

This document details the RESTful API endpoints provided by the Droplet backend server. It's intended for developers interacting with the API or understanding its capabilities.

**Base URL:** All API endpoints described below are prefixed with `/api`. If running locally on the default port 8080, the full base URL is `http://localhost:8080/api`.

## Authentication

Most endpoints require authentication using a **JSON Web Token (JWT)** provided as a Bearer token in the `Authorization` header.

1.  **Login (`POST /api/login`):** Send email and password to receive an `access token` (in the response body) and a `refresh token` (set in an HttpOnly cookie).
2.  **Authenticated Requests:** For all endpoints marked as "Authentication: Required", include the obtained access token in the request header:
    ```
    Authorization: Bearer <your_access_token>
    ```
3.  **Token Refresh (`POST /api/token/refresh`):** When the access token expires (indicated by a `401 Unauthorized` response), call this endpoint. The browser should automatically send the refresh token cookie. A successful response provides a new access token.
4.  **Logout (`POST /api/token/revoke`):** Call this endpoint to invalidate the current refresh token (effectively logging out the session associated with the cookie).

## Common Error Responses

The API uses standard HTTP status codes. Error responses typically include a JSON body with an error message:

```json
{
  "error": "A descriptive error message here"
}
```

Common status codes include:

* **`400 Bad Request`**: Invalid request format, missing required fields, validation errors (e.g., invalid date format, empty title/content).
* **`401 Unauthorized`**: Missing, invalid, or expired JWT access token (for protected routes), or invalid credentials/refresh token for auth routes.
* **`403 Forbidden`**: Authenticated user lacks permission for the requested action (e.g., non-admin trying admin tasks, user trying to modify another user's drop).
* **`404 Not Found`**: The requested resource (e.g., a specific drop ID) does not exist.
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
    * Sets `HttpOnly` refresh token cookie.
    * Body:
```json
{
  "id": "uuid-string-user-id",
  "email": "user@example.com",
  "role": "admin",
  "token": "your_access_token_jwt_string"
}
```
* **Errors:** 400, 401, 500

---

#### `POST /api/token/refresh`

Issues a new access token using a valid refresh token cookie.

* **Authentication:** None (Relies on HttpOnly cookie)
* **Request Body:** None
* **Success Response (`200 OK`):**
    * Body:
```json
{
  "token": "new_access_token_jwt_string"
}
```
* **Errors:** 401 (invalid/missing cookie), 500

---

#### `POST /api/token/revoke`

Revokes the refresh token associated with the request's cookie (logout).

* **Authentication:** None (Relies on HttpOnly cookie)
* **Request Body:** None
* **Success Response (`204 No Content`):** No response body.
* **Errors:** 500

---

### Users

---

#### `POST /api/users`

Creates a new user.

* **Authentication:** Required (Admin Only)
* **Request Body:**
```json
{
  "email": "new.teacher@example.com",
  "password": "secure_password",
  "role": "user"
}
```
* **Success Response (`201 Created`):**
    * Body: Returns the created user object (excluding password).
```json
{
  "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "email": "new.teacher@example.com",
  "role": "User",
  "title": "Mx.",
  "first_name": "New",
  "surname": "Teacher",
  "created_at": "2025-04-04T09:59:51Z",
  "updated_at": "2025-04-04T09:59:51Z"
}
```
* **Errors:** 400, 401, 403, 500

---

### Drops

---

#### `GET /api/drops`

Retrieves a list of all active drops (not expired), including their associated targets and author/editor info.

* **Authentication:** Required
* **Request Body:** None
* **Success Response (`200 OK`):**
    * Body: Returns a JSON array of `DropWithTargets` objects.
```json
[
  {
    "id": "uuid-string-drop1-id",
    "user_id": "uuid-string-author-id",
    "title": "Active Drop 1 Title",
    "content": "Content here...",
    "post_date": "timestamp",
    "expire_date": "timestamp",
    "author_name": "Author A Name", 
    "editor_name": null,
    "updated_at": "timestamp",
    "targets": [
      { "type": "General", "id": 0, "name": "General" },
      { "type": "Class", "id": 101, "name": "7A" }
    ]
  },
  // ... more drops
]
```
* **Errors:** 401, 500

---

#### `GET /api/mydrops`

Retrieves a list of active drops targeted to the current user (via direct association or 'General'), including targets and author/editor info.

* **Authentication:** Required
* **Request Body:** None
* **Success Response (`200 OK`):**
    * Body: Returns a JSON array of `DropWithTargets` objects (same structure as `GET /api/drops`).
* **Errors:** 401, 500

---

#### `GET /api/upcoming`

Retrieves a list of upcoming drops targeted to the current user (via direct association or 'General'), including targets and author/editor info.

* **Authentication:** Required
* **Request Body:** None
* **Success Response (`200 OK`):**
    * Body: Returns a JSON array of `DropWithTargets` objects (same structure as `GET /api/drops`).
* **Errors:** 401, 500

---

#### `POST /api/drops`

Creates a new drop and associates specified targets. Handles insertion within a database transaction.

* **Authentication:** Required
* **Request Body:**
```json
{
  "title": "New Drop Title",
  "content": "Message content here.",
  "post_date": "YYYY-MM-DD",
  "expire_date": "YYYY-MM-DD",
  "targets": [
    {"type": "Class", "id": 101},
    {"type": "General", "id": 0}
  ]
}
```
* **Success Response (`201 Created`):**
    * Body: Returns the core created drop object (*without* targets populated in this response, unless fetched again).
```json
{
  "id": "uuid-string-new-drop-id",
  "user_id": "uuid-string-creator-id",
  "title": "New Drop Title",
  "content": "Message content here.",
  "post_date": "timestamp",
  "expire_date": "timestamp",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "edited_by": "uuid.NullUUID"
}
```
* **Errors:** 400 (validation), 401, 500

---

#### `GET /api/drops/{dropID}`

Retrieves details for a single drop by its ID, including its associated targets and author/editor info.

* **Authentication:** Required
* **Path Parameters:**
    * `{dropID}` (string, UUID format): The ID of the drop.
* **Request Body:** None
* **Success Response (`200 OK`):**
    * Body: Returns a single `DropWithTargets` JSON object (same structure as items in `GET /api/drops` list).
* **Errors:** 400 (invalid UUID format), 401, 404, 500

---

#### `PUT /api/drops/{dropID}`

Updates an existing drop's details and **replaces** its entire list of targets. Uses a database transaction.

* **Authentication:** Required (User must be Admin or original Author).
* **Path Parameters:**
    * `{dropID}` (string, UUID format): The ID of the drop to update.
* **Request Body:** (Same structure as `POST /api/drops` payload expected, containing fields to update and the full target list)
```json
{
  "title": "Updated Drop Title",
  "content": "Updated content.",
  "post_date": "YYYY-MM-DD",
  "expire_date": "YYYY-MM-DD",
  "targets": [ 
    {"type": "Division", "id": 1},
    {"type": "General", "id": 0}
  ]
}
```
* **Success Response (`204 No Content`):** No response body. (Alternatively, could return `200 OK` with the updated drop object).
* **Errors:** 400 (invalid UUID/body), 401, 403, 404, 500

---

#### `DELETE /api/drops/{dropID}`

Deletes a specific drop and its associated target entries.

* **Authentication:** Required (User must be Admin or original Author).
* **Path Parameters:**
    * `{dropID}` (string, UUID format): The ID of the drop to delete.
* **Request Body:** None
* **Success Response (`204 No Content`):** No response body.
* **Errors:** 400 (invalid UUID), 401, 403, 404, 500

---

### Drop Targets

---

#### `POST /api/droptargets`

Adds a single target association to an existing drop. *(Note: Less critical now that PUT /api/drops handles target replacement, but may still exist).*

* **Authentication:** Required (User must be Admin or original Author of the drop).
* **Request Body:**
```json
{
  "drop_id": "uuid-string-drop-id",
  "type": "Class",
  "target_id": 101 
}
```
* **Success Response (`204 No Content`):** No response body.
* **Errors:** 400, 401, 403, 404, 500

---

### Target Lookup Data

These endpoints provide lists of entities that can be targeted.

---

#### `GET /api/divisions`

Retrieves a list of all available divisions.

* **Authentication:** Required.
* **Success Response (`200 OK`):**
```json
[
  { "id": 1, "division_name": "Upper School" },
  // ...
]
```
* **Errors:** 401, 500

---

#### `GET /api/yeargroups`

Retrieves a list of all available year groups.

* **Authentication:** Required.
* **Success Response (`200 OK`):**
```json
[
  { "id": 10, "year_group_name": "Year 7" },
  // ...
]
```
* **Errors:** 401, 500

---

#### `GET /api/classes`

Retrieves a list of all available classes.

* **Authentication:** Required.
* **Success Response (`200 OK`):**
```json
[
  { "id": 101, "class_name": "4A" },
  // ...
]
```
* **Errors:** 401, 500

---

#### `GET /api/pupils`

Retrieves a list of all available pupils. *(Note: May need pagination/search later)*.

* **Authentication:** Required.
* **Success Response (`200 OK`):**
```json
[
  { "id": 1001, "first_name": "John", "surname": "Doe" },
  // ... 
]
```
* **Errors:** 401, 500

---

### Settings

Endpoints related to fetching and updating the logged-in user's settings.

---

#### `GET /api/settings/me`

Retrieves the current user's saved preferences (theme, layout) and their target subscriptions.

* **Authentication:** Required
* **Request Body:** None
* **Success Response (`200 OK`):**
    * Body: Returns a combined object containing preferences and subscriptions. If no preferences are saved, defaults are returned. If no subscriptions exist, the array is empty.
```json
{
  "preferences": {
    "color_theme": "default",  // User's saved theme or default
    "layout_pref": "2 columns" // User's saved layout or default
  },
  "subscriptions": [
    { "type": "Class", "id": 101, "name": "Class 7A" }, // Example subscription
    { "type": "YearGroup", "id": 10, "name": "Year 7" }
    // ... other subscriptions ...
  ]
}
```
* **Errors:** 401, 500

---

#### `PUT /api/settings/me/preferences`

Updates the current user's display preferences (theme, layout). Uses Upsert logic.

* **Authentication:** Required
* **Request Body:**
```json
{
  "color_theme": "dark",     // The desired theme value
  "layout_pref": "3 columns" // The desired layout value
}
```
* **Success Response (`204 No Content`):** No response body.
* **Errors:** 400 (invalid theme/layout value or bad JSON), 401, 500

---

#### `PUT /api/settings/me/subscriptions`

Replaces the current user's entire list of target subscriptions with the provided list. Uses a transaction (deletes old, inserts new).

* **Authentication:** Required
* **Request Body:**
```json
{
  "targets": [ // The complete list of targets the user should be subscribed to
    {"type": "Class", "id": 101},
    {"type": "Division", "id": 1}
    // Send an empty array [] to unsubscribe from all specific targets
  ]
}
```
* **Success Response (`204 No Content`):** No response body.
* **Errors:** 400 (invalid target type/id or bad JSON), 401, 500

---