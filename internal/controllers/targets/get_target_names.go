package targets

import (
	"net/http"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/google/uuid"
)

func GetDivisions(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, ok := contextValueSchool.(uuid.UUID)
	if !ok {
		helpers.RespondWithError(w, http.StatusBadRequest, "School id missing from context", nil)
		return
	}

	divisions, err := dbq.GetDivisions(r.Context(), schoolID)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not look up divisions", err)
		return
	}
	helpers.RespondWithJSON(w, http.StatusOK, divisions)
}

func GetYearGroups(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, ok := contextValueSchool.(uuid.UUID)
	if !ok {
		helpers.RespondWithError(w, http.StatusBadRequest, "School id missing from context", nil)
		return
	}
	yearGroups, err := dbq.GetYearGroups(r.Context(), schoolID)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not look up year groups", err)
		return
	}
	helpers.RespondWithJSON(w, http.StatusOK, yearGroups)
}

func GetClasses(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, ok := contextValueSchool.(uuid.UUID)
	if !ok {
		helpers.RespondWithError(w, http.StatusBadRequest, "School id missing from context", nil)
		return
	}

	classes, err := dbq.GetClasses(r.Context(), schoolID)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not look up classes", err)
		return
	}
	helpers.RespondWithJSON(w, http.StatusOK, classes)
}

func GetPupils(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, ok := contextValueSchool.(uuid.UUID)
	if !ok {
		helpers.RespondWithError(w, http.StatusBadRequest, "School id missing from context", nil)
		return
	}

	pupils, err := dbq.GetPupils(r.Context(), schoolID)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not look up pupils", err)
		return
	}
	helpers.RespondWithJSON(w, http.StatusOK, pupils)
}
