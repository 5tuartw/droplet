package users

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/google/uuid"
)

func DeleteAllUsers(c *config.ApiConfig, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	//currently only permissable on dev platform
	if !c.DevMode {
		helpers.RespondWithError(w, http.StatusUnauthorized, "only accessible to developers", errors.New("unauthorized"))
		return
	}

	var requestBody struct {
		SchoolID uuid.UUID `json:"school_id"`
	}

	// Read the raw request body
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Error reading request body", err)
		return
	}
	defer r.Body.Close()

	// Decode the JSON into the requestBody struct
	err = json.Unmarshal(bodyBytes, &requestBody)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Error decoding JSON data", err)
		return
	}

	err = dbq.DeleteUsers(r.Context(), requestBody.SchoolID)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "unable to delete users", err)
	}

	w.WriteHeader(http.StatusNoContent)
}

func DeleteUser(c *config.ApiConfig, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {

	if c.IsDemoMode {
		log.Println("Attempted user deletion in demo mode - Forbidden.")
		helpers.RespondWithError(w, http.StatusForbidden, "User deletion is disabled in demo mode", errors.New("demo mode restriction"))
		return
	}

	userToDelete, err := uuid.Parse(r.PathValue("userID"))
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "No valid user id in path", err)
		return
	}

	contextValueRole := r.Context().Value(auth.UserRoleKey)
	editorRole, ok := contextValueRole.(string)
	if !ok {
		log.Println("Error: role not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}
	contextValueSchoolID := r.Context().Value(auth.UserSchoolKey)
	schoolID, ok := contextValueSchoolID.(uuid.UUID)
	if !ok {
		log.Println("Error: school ID not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}

	if !(editorRole == "admin") {
		helpers.RespondWithError(w, http.StatusForbidden, "Forbidden", errors.New("Forbidden"))
		log.Printf("Authorization failed: non-admin user attempted to delete user %v", userToDelete)
		return
	}

	contextValueID := r.Context().Value(auth.UserIDKey)
	editorUserID, ok := contextValueID.(uuid.UUID)
	if !ok {
		log.Println("Error: userID not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}
	if userToDelete == editorUserID {
		helpers.RespondWithError(w, http.StatusBadRequest, "Cannot delete own account", nil)
		return
	}

	rowsAffected, err := dbq.DeleteUser(r.Context(), database.DeleteUserParams{
		ID:       userToDelete,
		SchoolID: schoolID,
	})
	if err != nil {
		log.Printf("Error deleting user %s from school %s: %v", userToDelete, schoolID, err)
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not delete user", err)
		return
	}

	if rowsAffected == 0 {
		helpers.RespondWithError(w, http.StatusNotFound, "User not found in school", nil)
		return
	}

	log.Printf("Admin %s deleted user %s from school %s", editorUserID, userToDelete, schoolID)
	w.WriteHeader(http.StatusNoContent)
}
