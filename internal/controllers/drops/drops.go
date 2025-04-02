package drops

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/5tuartw/droplet/internal/models"
	"github.com/google/uuid"
)

func CreateDrop(c *config.ApiConfig, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
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

	var postTime time.Time
	if requestBody.PostDate != nil && *requestBody.PostDate != "" {
		t, err := time.Parse("2006-01-02", *requestBody.PostDate)
		if err != nil {
			helpers.RespondWithError(w, http.StatusBadRequest, "Invalid post_date format. Use YYYY-MM-DD.", err)
			return
		}
		postTime = t
	} else {
		//default if not provided or empty string
		postTime = time.Now()
	}

	// --- Handle ExpireDate - Default to +1 Year if empty ---
	var expireTime time.Time // Use non-nullable time.Time
	// FIRST check if the pointer itself is not nil
	if requestBody.ExpireDate != nil {
		// If the pointer is not nil, THEN dereference it to get the string value
		dateString := *requestBody.ExpireDate
		// Also check if the string value is non-empty
		if dateString != "" {
			// Attempt to parse the date string
			t, err := time.Parse("2006-01-02", dateString)
			if err != nil {
				// Handle parsing error (invalid date format entered)
				helpers.RespondWithError(w, http.StatusBadRequest, "Invalid expire_date format. Use YYYY-MM-DD.", err)
				return
			}
			// Use the parsed date
			expireTime = t
		} else {
			// The pointer wasn't nil, but the string it pointed to was empty. Use default.
			expireTime = time.Now().AddDate(1, 0, 0) // Default +1 Year
		}
	} else {
		// The pointer requestBody.ExpireDate WAS nil (meaning expire_date was omitted in JSON). Use default.
		expireTime = time.Now().AddDate(1, 0, 0) // Default +1 Year
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

func DeleteDrop(c *config.ApiConfig, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValue := r.Context().Value(auth.UserIDKey)
	userID, ok := contextValue.(uuid.UUID)
	if !ok {
		log.Println("Error: userID not found in context or is of wrong type in DeleteDrop")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}

	//check the request data
	dropId, err := uuid.Parse(r.PathValue("dropID"))
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "invalid drop id", err)
		return
	}

	//check person logged in is writer of drop or admin or developer
	dropAuthorId, err := dbq.GetUserIdFromDropID(r.Context(), dropId)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not retrieve user id", err)
		return
	}

	user, err := dbq.GetUserById(r.Context(), userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			helpers.RespondWithError(w, http.StatusNotFound, "Drop not found", err)
		} else {
			helpers.RespondWithError(w, http.StatusInternalServerError, "could not retrieve user from database", err)
		}
		return
	}

	if !(dropAuthorId == userID || user.Role == "admin") {
		helpers.RespondWithError(w, http.StatusForbidden, "Forbidden", errors.New("Forbidden"))
		log.Printf("Cannot perform drop deletion unless logged in as admin or drop creator")
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
	rows, err := dbq.GetActiveDropsWithTargets(r.Context())
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not get drops", err)
		return
	}
	aggregatedDrops := database.AggregateDropRows(rows)
	helpers.RespondWithJSON(w, http.StatusOK, aggregatedDrops)
}

func GetDropsForUser(c *config.ApiConfig, dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValue := r.Context().Value(auth.UserIDKey)
	userID, ok := contextValue.(uuid.UUID)
	if !ok {
		log.Println("Error: userID not found in context or is of wrong type in GetDropsForUser")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}

	rows, err := dbq.GetDropsForUserWithTargets(r.Context(), uuid.NullUUID{UUID: userID, Valid: true})
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not get drops", err)
		return
	}
	aggregatedDrops := database.AggregateCurrentUserDropRows(rows)
	helpers.RespondWithJSON(w, http.StatusOK, aggregatedDrops)
}
