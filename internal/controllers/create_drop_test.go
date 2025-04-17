package api_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/models"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var testSchoolID = uuid.MustParse("4adc3aaf-8f42-4ef8-a800-46ab05dfaf58")

func TestCreateDrop_Success(t *testing.T) {
	// Ensure DB connection
	if testDB == nil {
		t.Fatal("Test database connection pool (testDB) is nil")
	}

	testServer, testCfg := newTestServer(t, testDB)
	// --- Arrange ---

	// 1. Seed a user who will create the drop
	userEmail := "creator@example.com"
	userPassword := "password123"
	userID := seedTestUser(t, testDB, userEmail, userPassword, testSchoolID, false) // Seed non-admin

	// 2. Authentication: Get a valid JWT for the seeded user.
	accessToken := getTestAuthToken(t, testCfg, userID)

	// 3. Prepare the request body (JSON for the new drop)
	newDropData := map[string]interface{}{ // Using interface{} for flexibility with dates/targets later
		"title":       "My Test Drop Title",
		"content":     "This is the content of the test drop.",
		"post_date":   time.Now().UTC().Format("2006-01-02"),                     // Format as YYYY-MM-DD
		"expire_date": time.Now().Add(24 * time.Hour).UTC().Format("2006-01-02"), // Format as YYYY-MM-DD
	}
	requestBodyBytes, err := json.Marshal(newDropData)
	require.NoError(t, err, "Failed to marshal create drop request body")

	// 4. Create the HTTP request
	req, err := http.NewRequest("POST", "/api/drops", bytes.NewBuffer(requestBodyBytes))
	require.NoError(t, err, "Failed to create request")
	req.Header.Set("Content-Type", "application/json")
	// **Set the Authentication Header**
	req.Header.Set("Authorization", "Bearer "+accessToken)

	// 5. Create a ResponseRecorder
	rr := httptest.NewRecorder()

	// --- Act ---
	testServer.ServeHTTP(rr, req)

	// --- Assert ---

	// 7. Check Status Code (Should likely be 201 Created)
	require.Equal(t, http.StatusCreated, rr.Code, "Expected status 201 Created")

	// 8. Check Response Body (Does it return the created drop?)
	require.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Content-Type should be application/json")
	var createdDropResponse database.Drop // Or your specific Drop struct type
	err = json.Unmarshal(rr.Body.Bytes(), &createdDropResponse)
	require.NoError(t, err, "Failed to unmarshal response body")

	// Assert fields in the response
	assert.NotEmpty(t, createdDropResponse.ID, "Response should include drop ID")
	assert.Equal(t, newDropData["title"], createdDropResponse.Title, "Response title should match request")
	assert.Equal(t, newDropData["content"], createdDropResponse.Content, "Response content should match request")
	// assert.Equal(t, userID.String(), createdDropResponse["created_by_user_id"], "Response creator ID should match authenticated user") // If this field is returned

	// 9. **Database Verification
	//    Query the database directly to confirm the drop was inserted correctly.
	dropID := createdDropResponse.ID // Get ID from response
	testQueries := database.New(testDB)
	dbDrop, err := testQueries.GetDropByID(context.Background(), database.GetDropByIDParams{
		ID:       dropID,
		SchoolID: testSchoolID,
	}) // Assuming you have such a query
	require.NoError(t, err, "Failed to fetch created drop from DB")
	assert.Equal(t, newDropData["title"], dbDrop.Title)
	assert.Equal(t, userID, dbDrop.UserID) // Verify creator in DB

	// Placeholder failure until token generation is implemented
	if accessToken == "some_valid_token_placeholder" {
		t.Fatal("Test not fully implemented: Need actual JWT generation.")
	}
}

// getTestAuthToken generates a valid JWT for testing purposes.
// It calls the real auth.MakeJWT function using the test configuration.
func getTestAuthToken(t *testing.T, cfg *config.ApiConfig, userID uuid.UUID) string {
	t.Helper() // Marks this as a test helper function

	// Use a standard expiry for tests (e.g., 1 hour, like in your Login function)
	const testTokenDuration = 1 * time.Hour

	// Call your actual MakeJWT function using the test secret
	token, err := auth.MakeJWT(userID, testSchoolID, "user", cfg.JWTSecret, testTokenDuration)

	// If token generation fails, the test depending on it cannot proceed.
	// Using require.NoError ensures the test stops immediately if this fails.
	require.NoError(t, err, "Failed to make JWT for test user %s", userID)
	require.NotEmpty(t, token, "Generated test JWT token should not be empty")

	return token
}

func TestCreateDrop(t *testing.T) {
	if testDB == nil {
		t.Fatal("Test database connection pool (testDB) is nil")
	}

	testCases := []struct {
		name                string
		setupFunc           func(t *testing.T) (uuid.UUID, string) // optional if seeded user required
		requestBody         interface{}
		expectedStatus      int
		expectResponseCheck func(t *testing.T, body []byte, userID uuid.UUID)
	}{
		{
			name: "Success_CreateDrop",
			setupFunc: func(t *testing.T) (uuid.UUID, string) {
				userID := seedTestUser(t, testDB, "test@addingdrop.com", "password", testSchoolID, false)
				accessToken := getTestAuthToken(t, testCfg, userID)
				return userID, accessToken
			},
			requestBody: map[string]interface{}{
				"title":       "Test title",
				"content":     "Testing with some content",
				"post_date":   time.Now().UTC().Format("2006-01-02"),                     // Format as YYYY-MM-DD
				"expire_date": time.Now().Add(24 * time.Hour).UTC().Format("2006-01-02"), // Format as YYYY-MM-DD
				"targets": []models.Target{
					{Type: "General", ID: 0},
					{Type: "Class", ID: 4},
					{Type: "YearGroup", ID: 4},
				},
			},
			expectedStatus: http.StatusCreated,
			expectResponseCheck: func(t *testing.T, body []byte, userID uuid.UUID) {
				t.Helper()
				var createdDrop database.Drop
				err := json.Unmarshal(body, &createdDrop)
				require.NoError(t, err, "Failed to unmarshal response body")
				assert.NotEmpty(t, createdDrop.ID)
				assert.Equal(t, "Test title", createdDrop.Title)
				assert.Equal(t, "Testing with some content", createdDrop.Content)
				assert.Equal(t, userID, createdDrop.UserID, "Drop user ID should equal creator user ID")
			},
		},
		{
			name: "Success_CreateDropNoTargets",
			setupFunc: func(t *testing.T) (uuid.UUID, string) {
				userID := seedTestUser(t, testDB, "test@addingdrop.com", "password", testSchoolID, false)
				accessToken := getTestAuthToken(t, testCfg, userID)
				return userID, accessToken
			},
			requestBody: map[string]interface{}{
				"title":       "Test title",
				"content":     "Testing with some content",
				"post_date":   time.Now().UTC().Format("2006-01-02"),                     // Format as YYYY-MM-DD
				"expire_date": time.Now().Add(24 * time.Hour).UTC().Format("2006-01-02"), // Format as YYYY-MM-DD
			},
			expectedStatus: http.StatusCreated,
			expectResponseCheck: func(t *testing.T, body []byte, userID uuid.UUID) {
				t.Helper()
				var createdDrop database.Drop
				err := json.Unmarshal(body, &createdDrop)
				require.NoError(t, err, "Failed to unmarshal response body")
				assert.NotEmpty(t, createdDrop.ID)
				assert.Equal(t, "Test title", createdDrop.Title)
				assert.Equal(t, "Testing with some content", createdDrop.Content)
				assert.Equal(t, userID, createdDrop.UserID, "Drop user ID should equal creator user ID")
			},
		},
		{
			name: "Fail_CreateDropNoDates",
			setupFunc: func(t *testing.T) (uuid.UUID, string) {
				userID := seedTestUser(t, testDB, "test@addingdrop.com", "password", testSchoolID, false)
				accessToken := getTestAuthToken(t, testCfg, userID)
				return userID, accessToken
			},
			requestBody: map[string]interface{}{
				"title":   "Test title",
				"content": "Testing with some content",
				"targets": []models.Target{
					{Type: "General", ID: 0},
					{Type: "Class", ID: 4},
					{Type: "YearGroup", ID: 4},
				},
			},
			expectedStatus: http.StatusCreated,
			expectResponseCheck: func(t *testing.T, body []byte, userID uuid.UUID) {
				t.Helper()
				var createdDrop database.Drop
				err := json.Unmarshal(body, &createdDrop)
				require.NoError(t, err, "Failed to unmarshal response body")
				assert.NotEmpty(t, createdDrop.ID)
				assert.Equal(t, "Test title", createdDrop.Title)
				assert.Equal(t, "Testing with some content", createdDrop.Content)
				assert.Equal(t, userID, createdDrop.UserID, "Drop user ID should equal creator user ID")
			},
		},
		{
			name:      "Fail_Unauthenticated",
			setupFunc: nil,
			requestBody: map[string]interface{}{
				"title":       "Test title",
				"content":     "Testing with some content",
				"post_date":   time.Now().UTC().Format("2006-01-02"),                     // Format as YYYY-MM-DD
				"expire_date": time.Now().Add(24 * time.Hour).UTC().Format("2006-01-02"), // Format as YYYY-MM-DD
				"targets": []models.Target{
					{Type: "General", ID: 0},
					{Type: "Class", ID: 4},
					{Type: "YearGroup", ID: 4},
				},
			},
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "Fail_NoTitleOrContent",
			setupFunc: func(t *testing.T) (uuid.UUID, string) {
				userID := seedTestUser(t, testDB, "test@addingdrop.com", "password", testSchoolID, false)
				accessToken := getTestAuthToken(t, testCfg, userID)
				return userID, accessToken
			},
			requestBody: map[string]interface{}{
				"title":       "",
				"content":     "",
				"post_date":   "2025-10-01T10:00:00Z", // Fixed future date
				"expire_date": "2025-10-02T10:00:00Z", // Fixed future date
				"targets": []models.Target{
					{Type: "General", ID: 0},
					{Type: "Class", ID: 4},
					{Type: "YearGroup", ID: 4},
				},
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "Fail_InvalidJSONBody",
			setupFunc: func(t *testing.T) (uuid.UUID, string) {
				userID := seedTestUser(t, testDB, "test@addingdrop.com", "password", testSchoolID, false)
				accessToken := getTestAuthToken(t, testCfg, userID)
				return userID, accessToken
			},
			requestBody:    `{"title": "bad", "content":`,
			expectedStatus: http.StatusInternalServerError,
		},
		{
			name: "Fail_NoBody",
			setupFunc: func(t *testing.T) (uuid.UUID, string) {
				userID := seedTestUser(t, testDB, "test@addingdrop.com", "password", testSchoolID, false)
				accessToken := getTestAuthToken(t, testCfg, userID)
				return userID, accessToken
			},
			requestBody:    nil,
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Cleanup(func() {
				cleanupTables(t, testDB)
			})

			// Arrange
			var userID uuid.UUID
			var authToken string
			if tc.setupFunc != nil {
				userID, authToken = tc.setupFunc(t)
			}

			var requestBodyReader io.Reader
			switch body := tc.requestBody.(type) {
			case string:
				requestBodyReader = bytes.NewBufferString(body)
			case nil:
				requestBodyReader = http.NoBody
			default: // Handles maps, structs, etc. that should be marshalled
				bodyBytes, err := json.Marshal(body)
				require.NoError(t, err, "Failed to marshal request body") // Added error context
				requestBodyReader = bytes.NewBuffer(bodyBytes)
			}

			req, err := http.NewRequest("POST", "/api/drops", requestBodyReader)
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")
			if authToken != "" {
				req.Header.Set("Authorization", "Bearer "+authToken)
			}
			rr := httptest.NewRecorder()

			testServer, _ := newTestServer(t, testDB)

			// Act
			testServer.ServeHTTP(rr, req)

			// Assert
			require.Equal(t, tc.expectedStatus, rr.Code, "Status code mismatch")

			if tc.expectResponseCheck != nil {
				tc.expectResponseCheck(t, rr.Body.Bytes(), userID)
			}

		}) // End of t.Run
	} // End of loop
}
