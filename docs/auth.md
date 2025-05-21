# Authentication Endpoints

This section details the API endpoints related to user authentication, token management, and session control.

## `POST /api/login`

Authenticates a user and provides access/refresh tokens.

*   **Authentication:** None
*   **Request Body:**
    ```json
    {
      "email": "user@example.com",
      "password": "user_password"
    }
    ```
*   **Success Response (`200 OK`):**
    *   Sets `HttpOnly` refresh token cookie (if applicable).
    *   Body (Includes `school_id`):
        ```json
        {
          "id": "uuid-string-user-id",
          "email": "user@example.com",
          "role": "admin",
          "school_id": "uuid-string-school-id",
          "token": "your_access_token_jwt_string"
        }
        ```
*   **Errors:** 400 (Bad Request - e.g., missing fields, invalid email format), 401 (Unauthorized - invalid credentials), 500 (Internal Server Error)

---

## `GET /api/token/refresh`

Issues a new access token using a valid refresh token. The new token will reflect the user's current `school_id`.

*Note: This endpoint was previously documented as `POST /api/token/refresh`. The correct method is `GET`.*

*   **Authentication:** Via Refresh Token (e.g., HttpOnly cookie)
*   **Request Body:** None
*   **Success Response (`200 OK`):**
    *   Body:
        ```json
        {
          "token": "new_access_token_jwt_string"
        }
        ```
*   **Errors:** 401 (Unauthorized - invalid/missing refresh token), 500 (Internal Server Error)

---

## `GET /api/token/revoke`

Revokes the refresh token associated with the request (logout for that session/school context).

*Note: This endpoint was previously documented as `POST /api/token/revoke`. The correct method is `GET`.*

*   **Authentication:** Via Refresh Token (e.g., HttpOnly cookie)
*   **Request Body:** None
*   **Success Response (`204 No Content`):** No response body.
*   **Errors:** 500 (Internal Server Error)

---
