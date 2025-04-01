package auth

import (
	"net/http"
	"time"

	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
)

func Refresh(c *config.ApiConfig, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	var responseBody struct {
		Token string `json:"token"`
	}

	token, err := GetBearerToken(r.Header)
	if err != nil {
		helpers.RespondWithError(w, 401, "Unauthorized, cannot get token", err)
		return
	}

	rToken, err := dbq.GetRefreshToken(r.Context(), token)
	if err != nil {
		helpers.RespondWithError(w, 401, "No valid token found", err)
		return
	}

	// Check if token is expired
	if time.Now().After(rToken.ExpiresAt) {
		helpers.RespondWithError(w, 401, "Token expired", err)
		return
	}

	// Check if token is revoked
	if rToken.RevokedAt.Valid {
		helpers.RespondWithError(w, 401, "Token revoked", err)
		return
	}

	const oneHourInSeconds int64 = 3600
	accessToken, err := MakeJWT(rToken.UserID, c.JWTSecret, time.Duration(oneHourInSeconds)*time.Second)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "could not create access token", err)
		return
	}

	responseBody.Token = accessToken
	helpers.RespondWithJSON(w, 200, responseBody)
}

func Revoke(c *config.ApiConfig, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	token, err := GetBearerToken(r.Header)
	if err != nil {
		helpers.RespondWithError(w, 401, "Unauthorized, cannot get token", err)
		return
	}

	// Check if the token exists first
	rToken, err := dbq.GetRefreshToken(r.Context(), token)
	if err != nil {
		helpers.RespondWithError(w, 401, "No valid token found", err)
		return
	}

	// Check if token is already revoked
	if rToken.RevokedAt.Valid {
		helpers.RespondWithError(w, 400, "Token already revoked", err)
		return
	}

	// Now attempt to revoke the token
	err = dbq.RevokeToken(r.Context(), token)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not revoke token", err)
		return
	}

	w.WriteHeader(204)
}

