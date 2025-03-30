package auth

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/5tuartw/droplet/internal/models"
)

type Api struct {
	Config config.ApiConfig
}

func (c *Api) Login(w http.ResponseWriter, r *http.Request) {
	if c.Config.DB == nil {
		http.Error(w, "Database connection is not initialized", http.StatusInternalServerError)
		return
	}
	var requestBody struct {
		Email    string `json:"email"`
		Password string `json:"password"`
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

	const oneHourInSeconds int64 = 3600

	user, err := c.Config.DB.GetUserByEmail(r.Context(), requestBody.Email)
	if err != nil {
		helpers.RespondWithError(w, http.StatusUnauthorized, "Unable to find user", err)
		return
	}
	hashedPassword, err := c.Config.DB.GetPasswordByEmail(r.Context(), requestBody.Email)
	if err != nil {
		helpers.RespondWithError(w, http.StatusUnauthorized, "Unable to find user", err)
		return
	}
	err = CheckPasswordHash(requestBody.Password, hashedPassword)
	if err != nil {
		helpers.RespondWithError(w, http.StatusUnauthorized, "Incorrect email or password", err)
		return
	}

	token, err := MakeJWT(user.ID, c.Config.JWTSecret, time.Duration(oneHourInSeconds)*time.Second)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "could not create access token", err)
		return
	}

	refreshToken, err := MakeRefreshToken()
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "could not create refresh token", err)
		return
	}
	sixtyDaysInSeconds := 60 * 60 * 24 * 60
	expiry := time.Now().Add(time.Duration(sixtyDaysInSeconds) * time.Second)
	rToken, err := c.Config.DB.CreateRefreshToken(r.Context(), database.CreateRefreshTokenParams{
		Token:     refreshToken,
		UserID:    user.ID,
		ExpiresAt: expiry,
	})
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not add new token to database", err)
		return
	}

	thisRToken := rToken.Token

	userData := models.TokenUser{
		ID:           user.ID,
		CreatedAt:    user.CreatedAt,
		UpdatedAt:    user.UpdatedAt,
		Email:        user.Email,
		Role:         string(user.Role),
		Token:        token,
		RefreshToken: thisRToken,
	}

	helpers.RespondWithJSON(w, 200, userData)

}
