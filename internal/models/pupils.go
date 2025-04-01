package models

type Pupil struct {
	ID        int    `json:"id"`
	FirstName string `json:"first_name"`
	Surname   string `json:"surname"`
	ClassID   int    `json:"class_id"`
}
