package settings

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/5tuartw/droplet/internal/models"
	"github.com/google/uuid"
)

const (
	DefaultColorTheme = "default"
	DefaultLayoutPref = "2 columns"
)

func GetMySettings(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueID := r.Context().Value(auth.UserIDKey)
	userID, idOk := contextValueID.(uuid.UUID)
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, schoolOk := contextValueSchool.(uuid.UUID)

	if !idOk || !schoolOk {
		log.Println("Error: userID not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}

	responsePayload := models.AllUserSettingsResponse{
		Preferences:   models.UserSettingsPreferences{},
		Subscriptions: make([]database.TargetInfo, 0),
	}

	getPreferences, err := dbq.GetUserSettings(r.Context(), database.GetUserSettingsParams{
		UserID:   userID,
		SchoolID: schoolID,
	})

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			log.Printf("No settings found for user %s, returning default settings", userID)
			responsePayload.Preferences.ColorTheme = DefaultColorTheme
			responsePayload.Preferences.LayoutPref = DefaultLayoutPref
		} else {
			log.Printf("Error fetching settings for user %s: %v", userID, err)
			helpers.RespondWithError(w, http.StatusInternalServerError, "Could not get user settings", err)
			return
		}
	} else {
		responsePayload.Preferences.ColorTheme = getPreferences.ColorTheme
		responsePayload.Preferences.LayoutPref = getPreferences.LayoutPref
	}

	getSubscriptionRows, err := dbq.GetSubscriptionsForUser(r.Context(), database.GetSubscriptionsForUserParams{
		UserID:   userID,
		SchoolID: schoolID,
	})
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		log.Printf("Could not fetch subscriptions for user %s. %v", userID, err)
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not get user's subscriptions", err)
		return
	}

	responsePayload.Subscriptions = database.MapSubscriptionsRowsToInfo(getSubscriptionRows)

	helpers.RespondWithJSON(w, http.StatusOK, responsePayload)
}

type UpdatePreferencesRequest struct {
	ColorTheme string `json:"color_theme"`
	LayoutPref string `json:"layout_pref"`
}

func UpdateUserSettings(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueID := r.Context().Value(auth.UserIDKey)
	userID, idOk := contextValueID.(uuid.UUID)
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, schoolOk := contextValueSchool.(uuid.UUID)

	if !idOk || !schoolOk {
		log.Println("Error: userID not found in context")
		helpers.RespondWithError(w, http.StatusInternalServerError, "Internal Server Error (context error)", nil)
		return
	}

	requestBody := UpdatePreferencesRequest{}
	decoder := json.NewDecoder(r.Body)
	defer r.Body.Close()
	err := decoder.Decode(&requestBody)
	if err != nil {
		helpers.RespondWithError(w, http.StatusBadRequest, "Error decoding settings json", err)
		return
	}

	allowedThemes := map[string]bool{"default": true, "dark": true, "light": true, "colourful": true}
	allowedLayouts := map[string]bool{"list": true, "2 columns": true, "3 columns": true}
	if !allowedThemes[strings.ToLower(requestBody.ColorTheme)] || !allowedLayouts[strings.ToLower(requestBody.LayoutPref)] {
		helpers.RespondWithError(w, http.StatusBadRequest, "Invalid value provided for theme or layout", nil)
		return
	}

	err = dbq.UpsertUserSettings(r.Context(), database.UpsertUserSettingsParams{
		UserID:     userID,
		SchoolID:   schoolID,
		ColorTheme: requestBody.ColorTheme,
		LayoutPref: requestBody.LayoutPref,
	})
	if err != nil {
		log.Printf("Error upserting settings for user %s: %v", userID, err) // Log the error
		helpers.RespondWithError(w, http.StatusInternalServerError, "Could not update user settings", err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
