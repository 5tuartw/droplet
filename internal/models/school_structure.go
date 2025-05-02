package models

import "github.com/google/uuid"

type ClassInfo struct {
	ID         int32  `json:"id"`
	Name       string `json:"name"`
	PupilCount int64  `json:"pupil_count"`
}

type YearGroupInfo struct {
	ID      int32       `json:"id"`
	Name    string      `json:"name"`
	Classes []ClassInfo `json:"classes"`
}

type DivisionInfo struct {
	ID         int32           `json:"id"`
	Name       string          `json:"name"`
	YearGroups []YearGroupInfo `json:"year_groups"`
}

type SchoolStructureResponse struct {
	ID        uuid.UUID      `json:"id"`
	Name      string         `json:"name"`
	Divisions []DivisionInfo `json:"divisions"`
}
