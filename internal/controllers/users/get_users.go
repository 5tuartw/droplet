package users

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/http"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/5tuartw/droplet/internal/models"
	"github.com/google/uuid"
)

func GetUsers(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	requesterSchoolID, schoolOk := contextValueSchool.(uuid.UUID)

	if !schoolOk {
		log.Println("Error: one or more values not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Context error", nil)
		return
	}

	users, err := dbq.GetUsers(r.Context(), requesterSchoolID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) { // Assuming standard sql package error
			helpers.RespondWithError(w, http.StatusNotFound, "User not found", err) // Corrected message & status
		} else {
			helpers.RespondWithError(w, http.StatusInternalServerError, "Failed to get users", err)
		}
		return
	}

	responsePayload := mapDbUsersToUserResponses(users)
	helpers.RespondWithJSON(w, http.StatusOK, responsePayload)
}

func GetUserById(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextRoleValue := r.Context().Value(auth.UserRoleKey) // Use your role key
	requesterRole, ok := contextRoleValue.(string)
	if !ok || requesterRole != "admin" { // Ensure only admins can fetch arbitrary users by ID
		helpers.RespondWithError(w, http.StatusForbidden, "Forbidden: Admin access required", errors.New("admin required"))
		return
	}

	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	requesterSchoolID, ok := contextValueSchool.(uuid.UUID)
	if !ok {
		log.Println("Error: requester schoolID not found in context in CreateUser")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Context error", nil)
		return
	}

	id, err := uuid.Parse(r.PathValue("userID"))
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not parse user id", err)
		return
	}

	user, err := dbq.GetUserById(r.Context(), database.GetUserByIdParams{
		ID:       id,
		SchoolID: requesterSchoolID,
	})
	if err != nil {
		// Check if the error is "not found"
		if errors.Is(err, sql.ErrNoRows) {
			helpers.RespondWithError(w, http.StatusNotFound, "User not found", err)
		} else {
			// Other potential database errors
			log.Printf("Database error fetching user %s: %v", id, err) // Log the error
			helpers.RespondWithError(w, http.StatusInternalServerError, "Could not fetch user data", err)
		}
		return
	}

	if user.SchoolID != requesterSchoolID {
		helpers.RespondWithError(w, http.StatusBadRequest, "School ID mismatch", fmt.Errorf("user from school %v tried to access user from school %v", requesterSchoolID, user.SchoolID))
		return
	}

	responsePayload := models.UserResponse{
		ID:        user.ID,
		Email:     user.Email,
		Title:     user.Title,
		FirstName: user.FirstName,
		Surname:   user.Surname,
		Role:      user.Role,
	}

	helpers.RespondWithJSON(w, http.StatusOK, responsePayload)
}

func mapDbUsersToUserResponses(dbUsers []database.GetUsersRow) []models.UserResponse {
	// Handle nil or empty slice input
	if dbUsers == nil {
		return []models.UserResponse{} // Return empty slice, not nil, for JSON consistency
	}

	// Pre-allocate slice with capacity for efficiency
	apiUsers := make([]models.UserResponse, 0, len(dbUsers))

	// Loop through database users
	for _, dbUser := range dbUsers {
		// Create API response user and map fields
		apiUser := models.UserResponse{
			ID:        dbUser.ID,
			Email:     dbUser.Email,
			Role:      dbUser.Role,      // Example: Convert custom type
			Title:     dbUser.Title,     // Example: Handle sql.NullString
			FirstName: dbUser.FirstName, // Example: Handle sql.NullString
			Surname:   dbUser.Surname,   // Example: Handle sql.NullString
		}
		// Append the mapped struct to the result slice
		apiUsers = append(apiUsers, apiUser)
	}

	return apiUsers
}

// GetMe retrieves the details for the currently authenticated user
func GetMe(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	// Get UserID and SchoolID from context (set by RequireAuth middleware)
	contextValueID := r.Context().Value(auth.UserIDKey)
	userID, okID := contextValueID.(uuid.UUID)
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, okSchool := contextValueSchool.(uuid.UUID)

	if !okID || !okSchool {
		log.Println("Error: userID or schoolID not found in context for GetMe")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}

	// Fetch user details using the ID and SchoolID from context
	// This ensures we get the correct user within their validated school scope
	user, err := dbq.GetUserById(r.Context(), database.GetUserByIdParams{
		ID:       userID,
		SchoolID: schoolID,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			// Should not happen if token is valid and user exists, but handle defensively
			helpers.RespondWithError(w, http.StatusNotFound, "Authenticated user not found in database", err)
		} else {
			log.Printf("Database error fetching own user data %s: %v", userID, err)
			helpers.RespondWithError(w, http.StatusInternalServerError, "Could not fetch user data", err)
		}
		return
	}

	// Map to response struct (omit sensitive info like password hash)
	responsePayload := models.UserResponse{
		ID:        user.ID,
		Email:     user.Email,
		Role:      user.Role,
		Title:     user.Title,
		FirstName: user.FirstName,
		Surname:   user.Surname,
	}

	helpers.RespondWithJSON(w, http.StatusOK, responsePayload)
}
