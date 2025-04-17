package models

import "github.com/google/uuid"

type Pupil struct {
	ID        int       `json:"id"`
	SchoolID  uuid.UUID `json:"school_id"`
	FirstName string    `json:"first_name"`
	Surname   string    `json:"surname"`
	ClassID   int       `json:"class_id"`
}
