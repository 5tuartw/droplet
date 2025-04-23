package targets

import (
	"context"
	"fmt"
	"log"

	"github.com/5tuartw/droplet/internal/database"
	"github.com/5tuartw/droplet/internal/models"
	"github.com/google/uuid"
)

func ValidateTargetsBelongToSchool(ctx context.Context, dbq *database.Queries, schoolID uuid.UUID, targets []models.Target) error {
	if len(targets) == 0 {
		return nil // nothing to validate
	}

	//collect IDs for each type
	classIDs := make(map[int32]bool)
	yearGroupIDs := make(map[int32]bool)
	divisionIDs := make(map[int32]bool)
	pupilIDs := make(map[int32]bool)

	for _, target := range targets {
		// ignore 'General'
		if target.Type == "General" || target.ID == 0 {
			continue
		}

		switch target.Type {
		case "Class":
			classIDs[target.ID] = true
		case "YearGroup":
			yearGroupIDs[target.ID] = true
		case "Division":
			divisionIDs[target.ID] = true
		case "Student":
			pupilIDs[target.ID] = true
		default:
			return fmt.Errorf("invalid target type submitted: %s", target.Type)
		}
	}

	classList := mapsToInt32Slice(classIDs)
	if len(classList) > 0 {
		count, err := dbq.CountValidClassesForSchool(ctx, database.CountValidClassesForSchoolParams{
			SchoolID: schoolID,
			Column2:  classList,
		})
		if err != nil {
			log.Printf("DB error validating class targets for school %s: %v", schoolID, err)
			return fmt.Errorf("failed to validate class targets")
		}
		if count != int64(len(classList)) {
			log.Printf("Validation failed: Class count mismatch for school %s. Expect %d, DB found %d", schoolID, len(classList), count)
			return fmt.Errorf("one or more submitted Class IDs are invalid for this school")
		}
		log.Printf("Validated %d class targets for school %s.", count, schoolID)
	}

	yearGroupList := mapsToInt32Slice(yearGroupIDs)
	if len(yearGroupList) > 0 {
		count, err := dbq.CountValidYearGroupsForSchool(ctx, database.CountValidYearGroupsForSchoolParams{
			SchoolID: schoolID,
			Column2:  yearGroupList,
		})
		if err != nil {
			log.Printf("DB error validating Year Group targets for school %s: %v", schoolID, err)
			return fmt.Errorf("failed to validate class targets")
		}
		if count != int64(len(yearGroupList)) {
			log.Printf("Validation failed: Year Group count mismatch for school %s. Expect %d, DB found %d", schoolID, len(yearGroupList), count)
			return fmt.Errorf("one or more submitted Year Group IDs are invalid for this school")
		}
		log.Printf("Validated %d Year Group targets for school %s.", count, schoolID)
	}

	divisionList := mapsToInt32Slice(divisionIDs)
	if len(divisionList) > 0 {
		count, err := dbq.CountValidDivisionsForSchool(ctx, database.CountValidDivisionsForSchoolParams{
			SchoolID: schoolID,
			Column2:  divisionList,
		})
		if err != nil {
			log.Printf("DB error validating Division targets for school %s: %v", schoolID, err)
			return fmt.Errorf("failed to validate class targets")
		}
		if count != int64(len(divisionList)) {
			log.Printf("Validation failed: Division count mismatch for school %s. Expect %d, DB found %d", schoolID, len(divisionList), count)
			return fmt.Errorf("one or more submitted Division IDs are invalid for this school")
		}
		log.Printf("Validated %d Division targets for school %s.", count, schoolID)
	}

	pupilList := mapsToInt32Slice(pupilIDs)
	if len(pupilList) > 0 {
		count, err := dbq.CountValidPupilsForSchool(ctx, database.CountValidPupilsForSchoolParams{
			SchoolID: schoolID,
			Column2:  pupilList,
		})
		if err != nil {
			log.Printf("DB error validating Pupil targets for school %s: %v", schoolID, err)
			return fmt.Errorf("failed to validate class targets")
		}
		if count != int64(len(pupilList)) {
			log.Printf("Validation failed: Pupil count mismatch for school %s. Expect %d, DB found %d", schoolID, len(pupilList), count)
			return fmt.Errorf("one or more submitted Pupil IDs are invalid for this school")
		}
		log.Printf("Validated %d Pupil targets for school %s.", count, schoolID)
	}

	log.Printf("All submitted targets validated for school %s", schoolID)
	return nil
}

func mapsToInt32Slice(m map[int32]bool) []int32 {
	s := make([]int32, 0, len(m))
	for k := range m {
		s = append(s, k)
	}
	return s
}
