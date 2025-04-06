package targets

import (
	"net/http"

	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
)

func GetDivisions(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	divisions, err := dbq.GetDivisions(r.Context())
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not look up divisions", err)
		return
	}
	helpers.RespondWithJSON(w, http.StatusOK, divisions)
}

func GetYearGroups(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	yearGroups, err := dbq.GetYearGroups(r.Context())
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not look up year groups", err)
		return
	}
	helpers.RespondWithJSON(w, http.StatusOK, yearGroups)
}

func GetClasses(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	classes, err := dbq.GetClasses(r.Context())
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not look up classes", err)
		return
	}
	helpers.RespondWithJSON(w, http.StatusOK, classes)
}

func GetPupils(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	pupils, err := dbq.GetPupils(r.Context())
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not look up pupils", err)
		return
	}
	helpers.RespondWithJSON(w, http.StatusOK, pupils)
}
