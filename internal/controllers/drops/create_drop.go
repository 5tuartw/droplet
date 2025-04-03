package drops

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/5tuartw/droplet/internal/models"
	"github.com/google/uuid"
)

func CreateDrop(db *sql.DB, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValue := r.Context().Value(auth.UserIDKey)
	userID, ok := contextValue.(uuid.UUID)
	if !ok {
		log.Println("Error: userID not found in context or is of wrong type in CreateDrop")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}

	requestBody := models.CreateDropRequest{}
	decoder := json.NewDecoder(r.Body)
	defer r.Body.Close()
	err := decoder.Decode(&requestBody)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Error decoding json data", err)
		return
	}

	postTime, err := helpers.ParsePostDate(requestBody.PostDate)
	if err != nil {
		// Use the specific error message returned by the helper
		helpers.RespondWithError(w, http.StatusBadRequest, err.Error(), err)
		return
	}

	expireTime, err := helpers.ParseExpireDate(requestBody.ExpireDate)
	if err != nil {
		// Use the specific error message returned by the helper
		helpers.RespondWithError(w, http.StatusBadRequest, err.Error(), err)
		return
	}

	//logic to check drop data - NYI length check
	if requestBody.Content == "" && requestBody.Title == "" {
		helpers.RespondWithError(w, http.StatusBadRequest, "Title and Content cannot both be empty", errors.New("title and content both tempty"))
	}

	drop, err := dbq.CreateDrop(r.Context(), database.CreateDropParams{
		UserID:     userID,
		Title:      requestBody.Title,
		Content:    requestBody.Content,
		PostDate:   postTime,
		ExpireDate: expireTime,
	})
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not create new drop", err)
		return
	}

	helpers.RespondWithJSON(w, http.StatusCreated, drop)
}
