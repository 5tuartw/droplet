package drops

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/controllers/users"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/5tuartw/droplet/internal/models"
)

func CreateDrop(c *config.ApiConfig, w http.ResponseWriter, r *http.Request) {
	requestBody := models.CreateDropRequest{}

	decoder := json.NewDecoder(r.Body)
	defer r.Body.Close()
	err := decoder.Decode(&requestBody)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Error decoding json data", err)
		return
	}

	//logic to check drop data - NYI length check
	if requestBody.Content == "" && requestBody.Title == "" {
		helpers.RespondWithError(w, http.StatusBadRequest, "Title and Content cannot both be empty", errors.New("title and content both tempty"))
	}
	var postDate time.Time
	if requestBody.PostDate != nil {
		postDate = *requestBody.PostDate
	}
	var expireDate time.Time
	if requestBody.ExpireDate != nil {
		expireDate = *requestBody.ExpireDate
	}

	user, err := users.GetCurrentUser(c)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not get current user", err)
		return
	}

	drop, err := c.DB.CreateDrop(r.Context(), database.CreateDropParams{
		UserID:     user.ID,
		Title:      requestBody.Title,
		Content:    requestBody.Content,
		PostDate:   postDate,
		ExpireDate: expireDate,
	})
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not create new drop", err)
		return
	}

	helpers.RespondWithJSON(w, http.StatusOK, drop)

}
