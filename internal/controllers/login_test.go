package api_test

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/models"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

func seedTestUser(t *testing.T, db *sql.DB, email string, rawPassword string, isAdmin bool) uuid.UUID {
	t.Helper() // mark this as test helper function

	if testDB == nil {
		t.Fatalf("Test database connection pool (testDB) is nil")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(rawPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Failed to hash password for test user %s: %v", email, err)
	}

	q := database.New(db)
	var userRole string
	if isAdmin {
		userRole = "admin"
	} else {
		userRole = "user"
	}
	params := database.CreateUserParams{
		Email:          email,
		HashedPassword: string(hashedPassword),
		Role:           database.UserRole(userRole),
		Title:          "Ms",
		FirstName:      "Test",
		Surname:        "User",
	}

	user, err := q.CreateUser(context.Background(), params)
	if err != nil {
		t.Fatalf("Failed to seed user %s using sqlc CreateUser: %v", email, err)
	}

	log.Printf("Seeded user %s with ID %s\n", email, user.ID)
	return user.ID
}

func TestUserLogin(t *testing.T) {
	// Ensure we have a DB connection from TestMain
	if testDB == nil {
		t.Fatal("Test database connection pool (testDB) is nil")
	}

	// --- Define Test Cases ---
	testCases := []struct {
		name           string            // Name of the subtest
		seedEmail      string            // Email to seed (if needed)
		seedPassword   string            // Password to seed (if needed)
		requestBody    map[string]string // Body for the login request
		rawRequestBody *string           // Use pointer to distinguish between empty JSON "{}" and no body
		expectedStatus int               // Expected HTTP status code
		expectedEmail  string            // Expected email in response (if success)
		expectedRole   string            // Expected role in response (if success)
		expectToken    bool              // Should we expect tokens?
		// Add fields for expected error messages if desired
	}{
		// --- Success Case ---
		{
			name:           "Success_ValidCredentials",
			seedEmail:      "success@example.com",
			seedPassword:   "password123",
			requestBody:    map[string]string{"email": "success@example.com", "password": "password123"},
			expectedStatus: http.StatusOK,
			expectedEmail:  "success@example.com",
			expectedRole:   "user", // Assuming seeded as non-admin
			expectToken:    true,
		},
		// --- Failure Case: Wrong Password ---
		{
			name:           "Fail_WrongPassword",
			seedEmail:      "wrongpass@example.com",
			seedPassword:   "correctPassword",                                                                // Seed with the correct one
			requestBody:    map[string]string{"email": "wrongpass@example.com", "password": "wrongPassword"}, // Try wrong one
			expectedStatus: http.StatusUnauthorized,                                                          // Or your specific error code
			expectToken:    false,
		},
		// --- Failure Case: User Not Found ---
		{
			name:           "Fail_UserNotFound",
			seedEmail:      "", // Don't seed this user
			seedPassword:   "",
			requestBody:    map[string]string{"email": "nosuchuser@example.com", "password": "password123"},
			expectedStatus: http.StatusUnauthorized, // Or your specific error code
			expectToken:    false,
		},
		// --- Failure Case: Missing Password ---
		{
			name:           "Fail_MissingPassword",
			seedEmail:      "missingpass@example.com",
			seedPassword:   "password123",
			requestBody:    map[string]string{"email": "missingpass@example.com"}, // Password field missing
			expectedStatus: http.StatusBadRequest,
			expectToken:    false,
		},
		// --- Failure Case: Missing Email ---
		{
			name:           "Fail_MissingEmail",
			seedEmail:      "missingemail@example.com",
			seedPassword:   "password123",
			requestBody:    map[string]string{"password": "password123"},
			expectedStatus: http.StatusBadRequest,
			expectToken:    false,
		},
		// --- Failure Case: Invalid JSON ---
		{
			name: "Fail_InvalidJSONSyntax",
			rawRequestBody: func() *string {
				s := `{"email": "test@example.com", "password": "password123"`
				return &s
			}(),
			expectedStatus: http.StatusInternalServerError,
			expectToken:    false,
		},
		// --- Failure Case: Empty string body ---
		{
			name: "Fail_EmptyStringBody",
			rawRequestBody: func() *string {
				s := ""
				return &s
			}(),
			expectedStatus: http.StatusInternalServerError,
			expectToken:    false,
		},
		// --- Failure Case: Nil request body ---
		{
			name:           "Fail_NilRequestBody",
			rawRequestBody: nil,
			expectedStatus: http.StatusInternalServerError,
			expectToken:    false,
		},
	}

	// --- Run Test Cases ---
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// --- Arrange (inside subtest for isolation) ---

			// Optional: Clean up tables before each subtest if needed
			// cleanupTables(t, testDB)

			// Seed user ONLY if required for this test case
			if tc.seedEmail != "" {
				_ = seedTestUser(t, testDB, tc.seedEmail, tc.seedPassword, false) // Assuming non-admin for simplicity
			}

			// Prepare request body - use raw string if provided
			var requestBodyReader io.Reader
			if tc.rawRequestBody != nil {
				// Use raw invalid string
				requestBodyReader = bytes.NewBufferString(*tc.rawRequestBody)
			} else if tc.requestBody != nil {
				requestBodyBytes, err := json.Marshal(tc.requestBody)
				require.NoError(t, err) // Use require inside subtest
				requestBodyReader = bytes.NewBuffer(requestBodyBytes)
			}

			if requestBodyReader == nil {
				requestBodyReader = http.NoBody
			}

			// Create request & recorder
			req, err := http.NewRequest("POST", "/api/login", requestBodyReader)
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")
			rr := httptest.NewRecorder()

			// Get test server
			testServer, _ := newTestServer(t, testDB)

			// --- Act ---
			testServer.ServeHTTP(rr, req)

			// --- Assert ---
			require.Equal(t, tc.expectedStatus, rr.Code, "Status code mismatch")

			if tc.expectedStatus == http.StatusOK {
				// Assertions for successful login
				var responseBody models.TokenUser
				err = json.Unmarshal(rr.Body.Bytes(), &responseBody)
				require.NoError(t, err, "Failed to unmarshal success response body")

				assert.Equal(t, tc.expectedEmail, responseBody.Email)
				assert.Equal(t, tc.expectedRole, responseBody.Role)
				if tc.expectToken {
					assert.NotEmpty(t, responseBody.Token, "Token should not be empty on success")
					assert.NotEmpty(t, responseBody.RefreshToken, "Refresh token should not be empty on success")
				} else {
					assert.Empty(t, responseBody.Token, "Token should be empty on failure")
					assert.Empty(t, responseBody.RefreshToken, "Refresh token should be empty on failure")
				}
				assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

			} else {
				// Optional: Assertions for error responses
				// var errorBody map[string]string // Or your specific error struct
				// err = json.Unmarshal(rr.Body.Bytes(), &errorBody)
				// require.NoError(t, err, "Failed to unmarshal error response body")
				// assert.Contains(t, errorBody["error"], tc.expectedErrorSubstring)
			}
		}) // End of t.Run
	} // End of loop
}

// Optional helper for cleanup
// func cleanupTables(t *testing.T, db *sql.DB) {
// 	t.Helper()
// 	_, err := db.Exec("TRUNCATE users, refresh_tokens CASCADE;") // Adjust table names
// 	require.NoError(t, err)
// }
