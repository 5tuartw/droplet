package auth

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/5tuartw/droplet/internal/models"
)

func Login(c *config.ApiConfig, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	if dbq == nil {
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

	user, err := dbq.GetUserByEmail(r.Context(), requestBody.Email)
	if err != nil {
		helpers.RespondWithError(w, http.StatusUnauthorized, "Unable to find user", err)
		return
	}
	hashedPassword, err := dbq.GetPasswordByEmail(r.Context(), requestBody.Email)
	if err != nil {
		helpers.RespondWithError(w, http.StatusUnauthorized, "Unable to find user", err)
		return
	}
	err = CheckPasswordHash(requestBody.Password, hashedPassword)
	if err != nil {
		helpers.RespondWithError(w, http.StatusUnauthorized, "Incorrect email or password", err)
		return
	}

	token, err := MakeJWT(user.ID, c.JWTSecret, time.Duration(oneHourInSeconds)*time.Second)
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
	rToken, err := dbq.CreateRefreshToken(r.Context(), database.CreateRefreshTokenParams{
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

	if c.DevMode {
		c.DevModeUser = &models.User{
			ID:    user.ID,
			Email: user.Email,
			Role:  string(user.Role),
		}
		fmt.Printf("DevMode: Switched to user: %s\n", user.Email)
	}
	helpers.RespondWithJSON(w, 200, userData)

}
