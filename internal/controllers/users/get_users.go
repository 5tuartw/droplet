package users

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/5tuartw/droplet/internal/models"
	"github.com/google/uuid"
)

func GetUsers(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	requesterSchoolID, schoolOk := contextValueSchool.(uuid.UUID)
	contextValueRole := r.Context().Value(auth.UserRoleKey)
	requesterRole, roleOk := contextValueRole.(string)

	if !(schoolOk && roleOk) {
		log.Println("Error: one or more values not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Context error", nil)
		return
	}

	// Ensure Requester is Admin
	if !strings.EqualFold(requesterRole, "Admin") { //case insensitive check
		log.Printf("Authorization Failed: Role: %s attempted to get list of all users", requesterRole)
		helpers.RespondWithError(w, http.StatusForbidden, "Forbidden: Only administrators can create users.", errors.New("forbidden"))
		return // Stop processing if not admin
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
