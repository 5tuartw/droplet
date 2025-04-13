package users

import (
	"database/sql"
	"encoding/json"
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

func ChangePassword(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
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

	contextValue := r.Context().Value(auth.UserIDKey)
	editorUserID, ok := contextValue.(uuid.UUID)
	if !ok {
		log.Println("Error: userID not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}

	editorRole, err := dbq.GetRole(r.Context(), editorUserID)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not assertain role", nil)
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

func ChangeMyPassword(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
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

	var requestBody struct {
		Role database.UserRole `json:"role"`
	}

	decoder := json.NewDecoder(r.Body)
	err = decoder.Decode(&requestBody)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Could not decode request", err)
		return
	}

	//get userby id
	user, err := dbq.GetUserById(r.Context(), targetUserID)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not fetch user from database", err)
		return
	}

	contextValue := r.Context().Value(auth.UserIDKey)
	editorUserID, ok := contextValue.(uuid.UUID)
	if !ok {
		log.Println("Error: userID not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}

	editorRole, err := dbq.GetRole(r.Context(), editorUserID)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not assertain role", nil)
		return
	}

	if !(editorRole == "admin") {
		helpers.RespondWithError(w, http.StatusForbidden, "Forbidden", errors.New("Forbidden"))
		log.Printf("Authorization failed: User %s (Role: %s) attempted to change role for user %s", editorUserID, editorRole, targetUserID)
		return
	}

	if requestBody.Role != user.Role {
		err = dbq.ChangeRole(r.Context(), database.ChangeRoleParams{
			ID:   targetUserID,
			Role: database.UserRole(requestBody.Role),
		})
		if err != nil {
			helpers.RespondWithError(w, http.StatusInternalServerError, "Could not change role", err)
			return
		}
	} else {
		helpers.RespondWithError(w, http.StatusBadRequest, "No new role entered", nil)
	}

	userData := models.User{
		ID:        user.ID,
		UpdatedAt: user.UpdatedAt,
		Email:     user.Email,
		Role:      string(requestBody.Role),
	}

	helpers.RespondWithJSON(w, 200, userData)
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

	editorRole, err := dbq.GetRole(r.Context(), editorUserID)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not assertain role", nil)
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
		Title:     requestBody.Title,
		FirstName: requestBody.FirstName,
		Surname:   requestBody.Surname,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			helpers.RespondWithError(w, http.StatusNotFound, "User not found", err)
		} else {
			helpers.RespondWithError(w, http.StatusInternalServerError, "Could not update user", err)
		}
		return
	}

	user, err := dbq.GetUserById(r.Context(), targetUserID)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not fetch user data", err)
		return
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
