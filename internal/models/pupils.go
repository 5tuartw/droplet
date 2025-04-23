package models

import "github.com/google/uuid"

type Pupil struct {
	ID        int32     `json:"id"`
	SchoolID  uuid.UUID `json:"school_id"`
	FirstName string    `json:"first_name"`
	Surname   string    `json:"surname"`
	ClassID   int32     `json:"class_id"`
	ClassName string    `json:"class_name"`
}
