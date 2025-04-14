package users

import (
	"database/sql"
	"errors"
	"log"
	"net/http"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/5tuartw/droplet/internal/models"
	"github.com/google/uuid"
)

func GetUsers(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	users, err := dbq.GetUsers(r.Context())
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Failed to get users", err)
		return
	}

	helpers.RespondWithJSON(w, http.StatusOK, users)
}

func GetUserById(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextRoleValue := r.Context().Value(auth.UserRoleKey) // Use your role key
	requesterRole, ok := contextRoleValue.(string)
	if !ok || requesterRole != "admin" { // Ensure only admins can fetch arbitrary users by ID
		helpers.RespondWithError(w, http.StatusForbidden, "Forbidden: Admin access required", errors.New("admin required"))
		return
	}

	id, err := uuid.Parse(r.PathValue("userID"))
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not parse user id", err)
		return
	}

	user, err := dbq.GetUserById(r.Context(), id)
	if err != nil {
		// Check if the error is "not found"
		if errors.Is(err, sql.ErrNoRows) { // Assuming standard sql package error
			helpers.RespondWithError(w, http.StatusNotFound, "User not found", err) // Corrected message & status
		} else {
			// Other potential database errors
			log.Printf("Database error fetching user %s: %v", id, err)                                    // Log the error
			helpers.RespondWithError(w, http.StatusInternalServerError, "Could not fetch user data", err) // Corrected message
		}
		return
	}

	responsePayload := models.UserResponse{
		ID:        user.ID,
		Email:     user.Email,
		Title:     user.Title,
		FirstName: user.FirstName,
		Surname:   user.Surname,
		Role:      user.Role,
		CreatedAt: user.CreatedAt,
	}

	helpers.RespondWithJSON(w, http.StatusOK, responsePayload)
}
