package drops

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/controllers/users"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/5tuartw/droplet/internal/models"
	"github.com/google/uuid"
)

func CreateDrop(c *config.ApiConfig, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
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

	drop, err := dbq.CreateDrop(r.Context(), database.CreateDropParams{
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

func DeleteDrop(c *config.ApiConfig, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	//check the request data
	dropId, err := uuid.Parse(r.PathValue("dropID"))
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "invalid drop id", err)
		return
	}

	//check person logged in is writer of drop or admin or developer
	userId, err := dbq.GetUserIdFromDropID(r.Context(), dropId)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not retrieve user id", err)
		return
	}

	currentUser, err := users.GetCurrentUser(c)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "", err)
		return
	}

	if !(c.DevMode || currentUser.ID == userId || currentUser.Role == "Admin") {
		helpers.RespondWithError(w, http.StatusBadRequest, "unauthorized", errors.New("unauthorized"))
		fmt.Printf("Cannot perform drop deletion unless logged in as developer, admin or drop creator")
		return
	}

	//delete the drop
	err = dbq.DeleteDrop(r.Context(), dropId)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not delete drop from db", err)
		return
	}

	//respond with success/no content
	w.WriteHeader(http.StatusNoContent)
}

func GetActiveDrops(c *config.ApiConfig, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	_, err := users.GetCurrentUser(c)
	if err != nil || !c.DevMode {
		helpers.RespondWithError(w, http.StatusUnauthorized, "Must be logged in to view drops", err)
		return
	}
	drops, err := dbq.GetActiveDrops(r.Context())
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not get drops", err)
		return
	}

	helpers.RespondWithJSON(w, http.StatusOK, drops)
}

func GetDropsForUser(c *config.ApiConfig, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	user, err := users.GetCurrentUser(c)
	if err != nil || !c.DevMode {
		helpers.RespondWithError(w, http.StatusUnauthorized, "Must be logged in to view drops", err)
		return
	}
	drops, err := dbq.GetDropsForCurrentUser(r.Context(), uuid.NullUUID{UUID: user.ID, Valid: true})
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not get drops", err)
		return
	}

	helpers.RespondWithJSON(w, http.StatusOK, drops)
}
