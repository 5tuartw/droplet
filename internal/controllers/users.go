package controllers

import (
	"encoding/json"
	"net/http"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/5tuartw/droplet/internal/models"
	"github.com/google/uuid"
)

func (c *Api) CreateUser(w http.ResponseWriter, r *http.Request) {
	var requestBody struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Role     string `json:"role"`
	}

	decoder := json.NewDecoder(r.Body)
	defer r.Body.Close()
	err := decoder.Decode(&requestBody)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Error decoding json data", err)
		return
	}

	if requestBody.Email == "" {
		helpers.RespondWithError(w, http.StatusBadRequest, "Email is required", err)
		return
	}

	if requestBody.Password == "" {
		helpers.RespondWithError(w, http.StatusBadRequest, "Password is required", err)
		return
	}

	hashedPword, err := auth.HashPassword(requestBody.Password)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not create hashed password", err)
		return
	}

	user, err := c.Config.DB.CreateUser(r.Context(), database.CreateUserParams{
		Email:          requestBody.Email,
		HashedPassword: string(hashedPword),
		Role:           database.UserRole(requestBody.Role),
	})

	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Error adding user to database", err)
		return
	}

	userData := models.User{
		ID:        user.ID,
		CreatedAt: user.CreatedAt,
		UpdatedAt: user.UpdatedAt,
		Email:     user.Email,
		Role:      string(user.Role),
	}

	helpers.RespondWithJSON(w, 201, userData)

}

func (c *Api) GetUsers(w http.ResponseWriter, r *http.Request) {
	users, err := c.Config.DB.GetUsers(r.Context())
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Failed to get users", err)
		return
	}

	helpers.RespondWithJSON(w, http.StatusOK, users)

}

func (c *Api) GetUserById(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("userID"))
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not prase user id", err)
		return
	}

	user, err := c.Config.DB.GetUserById(r.Context(), id)
	if err != nil {
		helpers.RespondWithError(w, 404, "Could not fetch chirp", err)
	}

	helpers.RespondWithJSON(w, http.StatusOK, user)
}

func (c *Api) ChangePasswordOrRole(w http.ResponseWriter, r *http.Request) {
	var requestBody struct {
		Password string `json:"password"`
		Email    string `json:"email"`
		Role     string `json:"role"`
	}

	decoder := json.NewDecoder(r.Body)
	err := decoder.Decode(&requestBody)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Could not decode request", err)
		return
	}

	if requestBody.Password != "" {
		hashedPassword, err := auth.HashPassword(requestBody.Password)
		if err != nil {
			helpers.RespondWithError(w, http.StatusInternalServerError, "Could not create password hash", err)
			return
		}
		err = c.Config.DB.ChangePassword(r.Context(), database.ChangePasswordParams{
			Email:          requestBody.Email,
			HashedPassword: string(hashedPassword),
		})
		if err != nil {
			helpers.RespondWithError(w, http.StatusInternalServerError, "Could not save new password", err)
			return
		}
	}
	if requestBody.Role != "" {
		err = c.Config.DB.ChangeRole(r.Context(), database.ChangeRoleParams{
			Email: requestBody.Email,
			Role:  database.UserRole(requestBody.Role),
		})
		if err != nil {
			helpers.RespondWithError(w, http.StatusInternalServerError, "Could not change role", err)
			return
		}
	}
	//get userby email and respond with json user
	user, err := c.Config.DB.GetUserByEmail(r.Context(), requestBody.Email)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not fetch user from database", err)
		return
	}
	userData := models.User{
		ID:        user.ID,
		CreatedAt: user.CreatedAt,
		UpdatedAt: user.UpdatedAt,
		Email:     user.Email,
		Role:      string(user.Role),
	}

	helpers.RespondWithJSON(w, 200, userData)
}

/*

-- name: GetUserByEmail :one
SELECT id, created_at, updated_at, email, role FROM users where email = $1;

-- name: DeleteUser :exec
DELETE FROM users WHERE id = $1;

-- name: DeleteUsers :exec
DELETE FROM users;

-- name: GetUsercount :one
SELECT count(*) from users;*/
