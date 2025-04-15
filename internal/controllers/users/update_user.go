package users

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/5tuartw/droplet/internal/models"
	"github.com/google/uuid"
)

func ChangePassword(c *config.ApiConfig, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	// --- DEMO MODE CHECK ---
	if c.IsDemoMode {
		log.Println("Attempted admin password reset in demo mode - Forbidden.")
		helpers.RespondWithError(w, http.StatusForbidden, "Password reset is disabled in demo mode", errors.New("demo mode restriction"))
		return
	}

	targetUserID, err := uuid.Parse(r.PathValue("userID"))
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Could not parse user ID in path", err)
		return
	}

	var requestBody struct {
		Password string `json:"password"`
	}

	decoder := json.NewDecoder(r.Body)
	err = decoder.Decode(&requestBody)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Could not decode request", err)
		return
	}

	contextValueID := r.Context().Value(auth.UserIDKey)
	editorUserID, ok := contextValueID.(uuid.UUID)
	if !ok {
		log.Println("Error: userID not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}

	contextValueRole := r.Context().Value(auth.UserRoleKey)
	editorRole, ok := contextValueRole.(string)
	if !ok {
		log.Println("Error: role not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}

	if !(targetUserID == editorUserID || editorRole == "admin") {
		helpers.RespondWithError(w, http.StatusForbidden, "Forbidden", errors.New("Forbidden"))
		log.Printf("Authorization failed: User %s (Role: %s) attempted to change password for user %s", editorUserID, editorRole, targetUserID)
		return
	}

	if requestBody.Password == "" {
		helpers.RespondWithError(w, http.StatusBadRequest, "Password field is required.", nil)
		return
	}

	err = auth.ValidatePassword(requestBody.Password)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, fmt.Sprintf("Invalid password: %v", err), err)
		return
	}

	hashedPassword, err := auth.HashPassword(requestBody.Password)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not create password hash", err)
		return
	}
	err = dbq.ChangePassword(r.Context(), database.ChangePasswordParams{
		ID:             targetUserID,
		HashedPassword: string(hashedPassword),
	})
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not save new password", err)
		return
	}

	//get userby id and respond with json user
	user, err := dbq.GetUserById(r.Context(), targetUserID)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not fetch user from database", err)
		return
	}
	userData := models.User{
		ID:        user.ID,
		UpdatedAt: user.UpdatedAt,
		Email:     user.Email,
	}

	helpers.RespondWithJSON(w, 200, userData)
}

func ChangeMyPassword(c *config.ApiConfig, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	// --- DEMO MODE CHECK ---
	if c.IsDemoMode {
		log.Println("Attempted password reset in demo mode - Forbidden.")
		helpers.RespondWithError(w, http.StatusForbidden, "Password reset is disabled in demo mode", errors.New("demo mode restriction"))
		return
	}
	contextValue := r.Context().Value(auth.UserIDKey)
	userID, ok := contextValue.(uuid.UUID)
	if !ok {
		log.Println("Error: userID not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}

	var requestBody struct {
		OldPassword string `json:"current_password"`
		NewPassword string `json:"new_password"`
	}

	decoder := json.NewDecoder(r.Body)
	err := decoder.Decode(&requestBody)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Could not decode request", err)
		return
	}

	fetchedPassword, err := dbq.GetPasswordByID(r.Context(), userID)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not lookup password", err)
		return
	}

	err = auth.CheckPasswordHash(requestBody.OldPassword, fetchedPassword)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Bad request", err)
		return
	}

	err = auth.ValidatePassword(requestBody.NewPassword)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Invalid new password", err)
		return
	}

	hashedPword, err := auth.HashPassword(requestBody.NewPassword)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not create hashed password", err)
		return
	}

	err = dbq.ChangePassword(r.Context(), database.ChangePasswordParams{
		ID:             userID,
		HashedPassword: string(hashedPword),
	})
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not change password", err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func ChangeRole(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	targetUserID, err := uuid.Parse(r.PathValue("userID"))
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Could not parse user ID in path", err)
		return
	}

	// --- Authorization ---
	contextValueRole := r.Context().Value(auth.UserRoleKey)
	editorRole, okRole := contextValueRole.(string)
	contextValueID := r.Context().Value(auth.UserIDKey)
	editorUserID, okID := contextValueID.(uuid.UUID)

	if !okID || !okRole {
		log.Println("Error: userID or role not found in context for ChangeRole")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}

	if !(editorRole == "admin") {
		helpers.RespondWithError(w, http.StatusForbidden, "Forbidden: Admin access required", errors.New("admin required"))
		return
	}

	if targetUserID == editorUserID {
		helpers.RespondWithError(w, http.StatusBadRequest, "Admin cannot change their own role via this endpoint", nil)
		return
	}
	// --- End Authorization ---

	// --- Decode Request Body ---
	var requestBody struct {
		Role database.UserRole `json:"role"` // Assuming UserRole is string or enum-like
	}
	decoder := json.NewDecoder(r.Body)
	err = decoder.Decode(&requestBody)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Could not decode request body", err)
		return
	}

	// --- Fetch User (to check current role - optional depending on DB constraints/logic) ---
	user, err := dbq.GetUserById(r.Context(), targetUserID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			helpers.RespondWithError(w, http.StatusNotFound, "User not found", err)
		} else {
			helpers.RespondWithError(w, http.StatusInternalServerError, "Could not fetch user data", err)
		}
		return
	}

	// --- Perform Update only if Role is Different ---
	if requestBody.Role != user.Role {
		err = dbq.ChangeRole(r.Context(), database.ChangeRoleParams{
			ID:   targetUserID,
			Role: requestBody.Role, // Pass the validated role from request
		})
		if err != nil {
			// Check if user was deleted between fetch and update? Unlikely but possible.
			if errors.Is(err, sql.ErrNoRows) {
				helpers.RespondWithError(w, http.StatusNotFound, "User not found during update", err)
			} else {
				helpers.RespondWithError(w, http.StatusInternalServerError, "Could not change role in database", err)
			}
			return // <<< Return on DB error
		}
		// Role successfully changed
		log.Printf("User %s role changed to %s by admin %s", targetUserID, requestBody.Role, editorUserID)

	} else {
		// Role is the same, no DB update needed. Return No Content
		log.Printf("Role for user %s not changed by admin %s (already %s)", targetUserID, editorUserID, requestBody.Role)
		w.WriteHeader(http.StatusNoContent)
		return
	}

	// --- Respond with Success (204) ---
	w.WriteHeader(http.StatusNoContent)
}

func ChangeName(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	targetUserID, err := uuid.Parse(r.PathValue("userID"))
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Could not parse user ID in path", err)
		return
	}

	contextValue := r.Context().Value(auth.UserIDKey)
	editorUserID, ok := contextValue.(uuid.UUID)
	if !ok {
		log.Println("Error: userID not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}

	contextValueRole := r.Context().Value(auth.UserRoleKey)
	editorRole, ok := contextValueRole.(string)
	if !ok {
		log.Println("Error: role not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}

	if !(targetUserID == editorUserID || editorRole == "admin") {
		helpers.RespondWithError(w, http.StatusForbidden, "Forbidden", errors.New("Forbidden"))
		log.Printf("Authorization failed: User %s (Role: %s) attempted to change name for user %s", editorUserID, editorRole, targetUserID)
		return
	}

	var requestBody struct {
		Title     string `json:"title"`
		FirstName string `json:"first_name"`
		Surname   string `json:"surname"`
	}

	decoder := json.NewDecoder(r.Body)
	err = decoder.Decode(&requestBody)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Could not decode request", err)
		return
	}

	if requestBody.Title == "" || requestBody.FirstName == "" || requestBody.Surname == "" {
		helpers.RespondWithError(w, http.StatusBadRequest, "Title, first name, and surname cannot be empty", errors.New("empty name field"))
		return
	}

	err = dbq.UpdateUserName(r.Context(), database.UpdateUserNameParams{
		ID:        targetUserID,
		Title:     requestBody.Title,
		FirstName: requestBody.FirstName,
		Surname:   requestBody.Surname,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			helpers.RespondWithError(w, http.StatusNotFound, "User not found to update", err)
		} else {
			helpers.RespondWithError(w, http.StatusInternalServerError, "Could not update user name", err)
		}
		return
	}

	user, err := dbq.GetUserById(r.Context(), targetUserID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			helpers.RespondWithError(w, http.StatusNotFound, "User not found", err)
		} else {
			helpers.RespondWithError(w, http.StatusInternalServerError, "Could not fetch user data", err)
		}
		return // <<< Added missing return
	}

	userData := models.User{
		ID:        user.ID,
		UpdatedAt: user.UpdatedAt,
		Title:     user.Title,
		FirstName: user.FirstName,
		Surname:   user.Surname,
	}

	helpers.RespondWithJSON(w, http.StatusOK, userData)

}
