package school_structure

import (
	"net/http"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/helpers"
	"github.com/5tuartw/droplet/internal/models"
	"github.com/google/uuid"
)

func GetSchoolStructure(dbq *database.Queries, w http.ResponseWriter, r *http.Request) {
	contextValueSchool := r.Context().Value(auth.UserSchoolKey)
	schoolID, ok := contextValueSchool.(uuid.UUID)
	if !ok {
		helpers.RespondWithError(w, http.StatusInternalServerError, "School id missing from context", nil)
		return
	}

	schoolName, err := dbq.GetSchoolName(r.Context(), schoolID)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not look up school name", err)
		return
	}

	divisions, err := dbq.GetDivisions(r.Context(), schoolID)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not look up divisions", err)
		return
	}
	yearGroups, err := dbq.GetYearGroups(r.Context(), schoolID)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not look up year groups", err)
		return
	}
	classes, err := dbq.GetClasses(r.Context(), schoolID)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not look up classes", err)
		return
	}

	pupilCounts, err := dbq.CountPupilsAllClasses(r.Context(), schoolID)
	if err != nil {
		helpers.RespondWithError(w, http.StatusInternalServerError, "could not look up pupil counts", err)
		return
	}

	pupilCountsMap := make(map[int32]int64)
	for _, pc := range pupilCounts {
		pupilCountsMap[pc.ClassID.Int32] = pc.Count
	}

	classesByYearGroupID := make(map[int32][]models.ClassInfo)
	for _, class := range classes {
		pupilCount := pupilCountsMap[class.ID]
		classInfo := models.ClassInfo{
			ID:    class.ID,
			Name:  class.ClassName,
			PupilCount: pupilCount,
		}
		yearGroupID := class.YearGroupID.Int32
		classesByYearGroupID[yearGroupID] = append(classesByYearGroupID[yearGroupID], classInfo)
	}

	yearGroupsByDivisionID := make(map[int32][]models.YearGroupInfo)
	for _, yearGroup := range yearGroups {
		classesForThisYearGroup := classesByYearGroupID[yearGroup.ID]
		if classesForThisYearGroup == nil {
			classesForThisYearGroup = []models.ClassInfo{}
		}
		yearGroupInfo := models.YearGroupInfo{
			ID:   yearGroup.ID,
			Name: yearGroup.YearGroupName,
			Classes:       classesForThisYearGroup,
		}
		divisionID := yearGroup.DivisionID
		yearGroupsByDivisionID[divisionID.Int32] = append(yearGroupsByDivisionID[divisionID.Int32], yearGroupInfo)
	}

	finalDivisions := make([]models.DivisionInfo, 0, len(divisions))
	for _, division := range divisions {
		yearGroupsForThisDivision := yearGroupsByDivisionID[division.ID]
		if yearGroupsForThisDivision == nil {
			yearGroupsForThisDivision = []models.YearGroupInfo{}
		}
		divisionInfo := models.DivisionInfo{
			ID:   division.ID,
			Name: division.DivisionName,
			YearGroups:   yearGroupsForThisDivision,
		}
		finalDivisions = append(finalDivisions, divisionInfo)
	}

	responsePayload := models.SchoolStructureResponse{
		ID:   schoolID,
		Name: schoolName,
		Divisions:  finalDivisions,
	}

	helpers.RespondWithJSON(w, http.StatusOK, responsePayload)

}



/*
{
  "school_id": "uuid-school",
  "school_name": "Test School",
  "divisions": [
    {
      "id": 1, // Division ID (int32)
      "name": "Upper School",
      "year_groups": [
        {
          "id": 3, // YearGroup ID (int32)
          "name": "Year 3",
          "classes": [
            {
              "id": 5, // Class ID (int32)
              "name": "3A",
              "pupil_count": 15 // Added count
            },
            {
              "id": 6,
              "name": "3B",
              "pupil_count": 18
            }
          ]
        },
        {
          "id": 4,
          "name": "Year 4",
          "classes": [ /* ...  ]
        }
        // ... more year groups in Upper School
      ]
    },
    {
      "id": 2,
      "name": "Lower School",
      "year_groups": [ /* ... ]
    }
    // ... more divisions
  ]
}
*/