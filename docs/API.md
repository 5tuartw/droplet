# Droplet API Documentation

## Introduction

This document details the RESTful API endpoints provided by the Droplet backend server. It's intended for developers interacting with the API or understanding its capabilities.

**Base URL:** All API endpoints described below are prefixed with `/api`. If running locally on the default port 8080, the full base URL is `http://localhost:8080/api`.

**Multi-Tenancy:** The application uses a shared database/shared schema multi-tenancy model based on `school_id`. All data belonging to a specific school (users, pupils, classes, drops, etc.) is associated with that school's unique ID. API access is automatically scoped to the authenticated user's `school_id` provided via their JWT.

## Authentication

Most endpoints require authentication using a **JSON Web Token (JWT)** provided as a Bearer token in the `Authorization` header. For detailed information on authentication endpoints, token handling, and specific error codes related to authentication, please see [Authentication Endpoints](./auth.md).

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

## API Endpoint Documentation

For detailed information on specific groups of API endpoints, please refer to the following documents:

* **[General Endpoints](./general.md)**: General API status and utility endpoints.
* **[Authentication Endpoints](./auth.md)**: Endpoints for user login, token refresh, and logout.
* **[User Endpoints](./users.md)**: Endpoints for managing users.
* **[Drop Endpoints](./drops.md)**: Endpoints for managing drops (notifications).
* **[Pupil Endpoints](./pupils.md)**: Endpoints for managing pupils.
* **[School Structure Endpoints](./school_structure.md)**: Endpoints for managing classes, year groups, and divisions.
* **[Settings Endpoints](./settings.md)**: Endpoints for user-specific settings and subscriptions.

---
