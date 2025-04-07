# Droplet 💧  
### The Smart Way for Teachers to Keep Students Informed

Keeping students in the loop is a daily challenge for teachers in schools — emails go unread, verbal announcements are forgotten, and noticeboards get ignored. **Droplet** simplifies communication for teachers, ensuring important updates always reach the right students at the right time.

### 🚀 What is Droplet?  
Droplet is a smart **digital noticeboard** and **targeted messaging application** designed to streamline communication in schools. It ensures that critical updates — whether timetable changes, event reminders, or safety alerts — get delivered without the clutter. This application stems from 20+ years of first-hand teaching and school management experience, aiming to solve these real-world communication challenges.

# DEMO
Live Demo available to test at [https://droplet-app.onrender.com/](https://droplet-app.onrender.com/)


## Features Implemented

* 🔑 **User Authentication:**
    * Secure user login and logout; password hashing using the `bcrypt` algorithm.
    * JWT (JSON Web Tokens) for session management, utilizing access and refresh tokens.
    * Refresh tokens stored securely in HttpOnly cookies.
* 💧 **Drop Management (CRUD):**
    * Create new drops (title, content, optional post/expiry dates).
    * Read drops (viewing lists or single items).
    * Update existing drops (title, content, dates, targets).
    * Delete drops.
* 🎯 **Targeting System:**
    * Associate drops with multiple targets defined by Type (General, Division, Year Group, Class, Student) and ID.
    * Backend logic resolves drop visibility based on the logged-in user's associations and subscriptions.
    * Frontend UI allows dynamic lookup of available targets (Divisions, Year Groups, Classes, Pupils) via API calls when creating/editing drops.
    * Targets are displayed visually as badges on the drop list.
* ⚙️ **Role-Based Access Control (RBAC):**
    * Basic "Admin" role with elevated privileges.
    * Admins can edit or delete any drop.
    * Regular users can only edit or delete drops they originally authored.
* 📄 **Frontend Interface:**
    * Login page (including demo for DEMO_MODE environment).
    * Toggle functionality to switch between "My Drops" (visible to user), "All Active Drops" and "Upcoming Drops".
    * Modal form for creating and editing drops, including adding/removing targets from a list.
    * Tooltips display creator and last editor information on drops (fetched from backend).
    * Settings page to modify view/layout and subscriptions to view specific schools groups in My Drops.
* 🖥️ **Database Interaction:**
    * Uses `sqlc` to generate type-safe Go code from SQL queries.
    * Utilizes database transactions for atomic updates (e.g., when updating a drop and its targets simultaneously).

## ✨ Screenshots

Here's a glimpse of the Droplet application interface in action:

**1. Login Page:**

![Login page showing email, password fields, and logo](docs/screenshots/login.gif "Droplet Login Screen")

**2. Create/Edit Modal:**

![Modal form for creating or editing a drop, with fields for title, content, dates, and targets](docs/screenshots/add_drop.gif "Create/Edit Drop Modal")

## Technology Stack

* **Backend:** Go (Golang 1.23.4)
    * Web Server/Routing: Standard Go `net/http` package
    * Database Driver: `github.com/lib/pq` (PostgreSQL driver)
    * SQL Code Generation: `sqlc` (`github.com/sqlc-dev/sqlc`)
    * Authentication: `github.com/golang-jwt/jwt/v5`, `golang.org/x/crypto/bcrypt`
    * UUIDs: `github.com/google/uuid`
* **Database:** PostgreSQL (16.8)
* **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3
    * API Communication: Browser `Workspace` API
    * Client-Side Storage: `sessionStorage` (for access token & user info), HttpOnly Cookie (for refresh token)

## Prerequisites

Ensure you have the following installed on your system:

* **Go:** Version 1.23.4 or later
* **PostgreSQL Server:** A running instance (Version 16.8)
* **`sqlc` CLI Tool:** Version 1.28.0 [Installation](https://docs.sqlc.dev/en/latest/overview/install.html)
* **`goose` CLI:** The database migration tool. Installation: `go install github.com/pressly/goose/v3/cmd/goose@latest` (or see [Goose Docs](https://github.com/pressly/goose))
* **Git:** For cloning the repository.

## Setup and Installation

1.  **Clone the Repository:**
    ```bash
    git clone <your-repository-url>
    cd <repository-directory-name>
    ```

2.  **Configuration:**
    * Create a `.env` file in the project root directory.
    * Edit the `.env` file with your specific database connection details and a unique, strong `JWT_SECRET`:
        ```dotenv
        # .env file example
        PORT=8080
        # Format: postgres://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME?sslmode=disable
        DATABASE_URL=postgres://your_user:your_password@localhost:5432/droplet?sslmode=disable
        JWT_SECRET=your_strong_random_jwt_secret_key_here
        ```
    * **Important:** Make sure the `DATABASE_URL` is correct before proceeding to database setup. Replace all placeholders.

3.  **Database Setup:**
    * Ensure your PostgreSQL server is running.
    * Connect to PostgreSQL using an administrative user (e.g., `psql -U postgres`).
    * Create the database specified in your `DATABASE_URL` (if it doesn't already exist):
        ```sql
        CREATE DATABASE droplet; -- Use the name from your DATABASE_URL
        ```
    * (Optional but Recommended) Create the specific user and grant privileges, also from your `DATABASE_URL`:
        ```sql
        CREATE USER your_user WITH PASSWORD 'your_password';
        GRANT ALL PRIVILEGES ON DATABASE droplet TO your_user;
        \q
        ```
    * **Run Migrations:** Use `goose` to apply the schema migrations. You need to tell `goose` which database driver to use ("postgres") and provide the connection string (which it often reads from the `DATABASE_URL` environment variable). You also need to run it from the correct directory or specify the path to your migration files.
        ```bash
        # Navigate to the directory containing the migration files
        cd sql/schema

        # Run goose up 
        goose postgres "${DATABASE_URL}" up # Explicitly pass driver and DSN

        # Go back to the project root
        cd ../..
        ```

4.  **Generate Go Code:**
    * Run `sqlc` from the project root directory (or wherever your `sqlc.yaml` is):
        ```bash
        sqlc generate
        ```

5.  **Run the Backend Server:**
    * Run the project from its root directory:
        ```bash
        go run ./cmd/droplet/
        ```
    * The server should log that it's listening (e.g., "Server listening on :8080").

6.  **Access Application:**
    * Open your web browser to `http://localhost:8080` (or the port from your `.env`).

## Populating Initial Data (Optional)

After creating the database and applying the migrations using `goose`, you can optionally populate it with sample data representing a basic school structure, users, and pupils using the provided setup scripts. This is useful for testing and demonstrating the application's features. These files can also be altered to set up with your own data.

**Location:**

The necessary scripts are located in the `/internal/seed_data/` directory within the project.

**Pre-requisites:**

* Ensure steps 1-3 of the "Setup and Installation" section (Clone, Configure `.env`, Create DB & Run Migrations) are complete.
* The Go scripts (`load_users`, `load_pupils`) require the `DATABASE_URL` environment variable to be set correctly.

**Execution Order:**

It's important to run these scripts in the specified order after the database is created and migrations are run. Navigate to your project's root directory in your terminal before running these commands.

# Quick method

1. Make sure seed_db.sh is executable:
```bash
chmod +x seed_db.sh
```

2. Set your environment variable for the `DATABASE_URL`:
```bash
export DATABASE_URL="postgres://POSTGRES_USER:POSTGRES_PASSWORD@HOST:5432/droplet?sslmode=require" 
```

3. Run the script
```bash
./seed_db.sh
```

# Alternative steps

1.  **Load School Structure (SQL Script):**
    * Execute the SQL script using `psql`. Ensure you use the correct username and database name corresponding to your `DATABASE_URL`.
        ```bash
        psql -U your_pg_user -d droplet_db -a -f internal/seed_data/init_school_data.sql
        ```
        *(Replace `your_pg_user` and `droplet_db`. Adjust path if `setup_school.sql` isn't directly in `seed_data/`)*.
    * Check the output for any SQL errors.

2.  **Load Basic Users:**
    * Run tidy from the project root directory:
        ```bash
        # go mod tidy ./internal/seed_data/load_users
        ```
    * Execute the Go script:
        ```bash
        go run ./internal/seed_data/load_users
        ```
    * Check the output for any confirmation messages or errors.

3.  **Load Basic Pupils:**
    * Run tidy from the project root directory:
        ```bash
        # go mod tidy ./internal/seed_data/load_pupils
        ```
    * Execute the Go script:
        ```bash
        go run ./internal/seed_data/load_pupils
        ```
    * Check the output for any confirmation messages or errors.

**Outcome:**

Once these scripts complete successfully, your database will contain sample data for divisions, year groups, classes, users (including potential admin/teacher accounts), and pupils. You should then be able to log in using one of the created user accounts and interact with the application's features using this initial data set.

Examples:
* Standard user: `emily.carter@dropletschool.co.uk` / `password123`
* Admin user: `john.wilson@dropletschool.co.uk`/ `password123`
## API Overview

The backend provides the following main RESTful endpoints under the `/api` prefix:

| Method | Path                         | Description                             | Auth Required     |
|--------|------------------------------|-----------------------------------------|-------------------|
| POST   | `/login`                     | Authenticate user, return tokens        | No                |
| POST   | `/token/refresh`             | Refresh access token using cookie       | No (Cookie)       |
| POST   | `/token/revoke`              | Revoke refresh token (logout)           | No (Cookie)       |
| POST   | `/users`                     | Create a new user                       | Yes (Admin)       |
| GET    | `/drops`                     | Get all active drops                    | Yes               |
| GET    | `/mydrops`                   | Get drops visible to current user       | Yes               |
| POST   | `/drops`                     | Create a new drop (incl. targets)       | Yes               |
| GET    | `/drops/{id}`                | Get a single drop with targets          | Yes               |
| PUT    | `/drops/{id}`                | Update a drop (incl. targets)           | Yes (Author/Admin)|
| DELETE | `/drops/{id}`                | Delete a drop                           | Yes (Author/Admin)|
| POST   | `/droptargets`               | Add a target to a drop                  | Yes (Author/Admin)|
| GET    | `/divisions`, `/classes` etc | Get lists of targetable entities        | Yes               |

For detailed information on request/response formats, parameters, and error codes, please see the [API Documentation](./docs/API.md).

## 💡 Future Enhancements

While the core functionality is in place, here are some planned features and potential directions to further enhance Droplet:

* **Administrator Management Portal:**
    * Build dedicated interfaces for Administrators to manage user accounts (view list, edit details/roles, add new users, delete users).
    * Add interfaces for managing pupil data (view, edit, add, delete).

* **Advanced Features / AI Integration (Exploratory Ideas):**
    * **Content Assistance:** Potentially integrate AI to help staff create effective drops by checking for clarity, tone, or suggesting missing information (like location or time).
    * **Clash Detection:** Explore using AI or advanced logic to analyze drop targets and timing to automatically flag potential scheduling conflicts (e.g., a student target group being asked to attend two different events simultaneously).
    * **Personalized Summaries:** Investigate AI providing users with concise daily or weekly summaries of their most relevant new drops.

*(Contributions or feedback on these future directions are welcome!)*