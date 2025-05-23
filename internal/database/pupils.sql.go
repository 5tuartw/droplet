// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.28.0
// source: pupils.sql

package database

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
)

const countPupilsAllClasses = `-- name: CountPupilsAllClasses :many
SELECT class_id, count(*) FROM pupils WHERE school_id = $1 AND class_id IS NOT NULL GROUP BY class_id
`

type CountPupilsAllClassesRow struct {
	ClassID sql.NullInt32 `json:"class_id"`
	Count   int64         `json:"count"`
}

func (q *Queries) CountPupilsAllClasses(ctx context.Context, schoolID uuid.UUID) ([]CountPupilsAllClassesRow, error) {
	rows, err := q.db.QueryContext(ctx, countPupilsAllClasses, schoolID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []CountPupilsAllClassesRow
	for rows.Next() {
		var i CountPupilsAllClassesRow
		if err := rows.Scan(&i.ClassID, &i.Count); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const countPupilsInClass = `-- name: CountPupilsInClass :one
SELECT count(*) from pupils
WHERE class_id = $1 AND school_id = $2
`

type CountPupilsInClassParams struct {
	ClassID  sql.NullInt32 `json:"class_id"`
	SchoolID uuid.UUID     `json:"school_id"`
}

func (q *Queries) CountPupilsInClass(ctx context.Context, arg CountPupilsInClassParams) (int64, error) {
	row := q.db.QueryRowContext(ctx, countPupilsInClass, arg.ClassID, arg.SchoolID)
	var count int64
	err := row.Scan(&count)
	return count, err
}

const createPupil = `-- name: CreatePupil :one
INSERT INTO pupils (first_name, surname, class_id, school_id)
VALUES (
    $1,
    $2,
    $3,
    $4
)
RETURNING id, first_name, surname, class_id, school_id
`

type CreatePupilParams struct {
	FirstName string        `json:"first_name"`
	Surname   string        `json:"surname"`
	ClassID   sql.NullInt32 `json:"class_id"`
	SchoolID  uuid.UUID     `json:"school_id"`
}

func (q *Queries) CreatePupil(ctx context.Context, arg CreatePupilParams) (Pupil, error) {
	row := q.db.QueryRowContext(ctx, createPupil,
		arg.FirstName,
		arg.Surname,
		arg.ClassID,
		arg.SchoolID,
	)
	var i Pupil
	err := row.Scan(
		&i.ID,
		&i.FirstName,
		&i.Surname,
		&i.ClassID,
		&i.SchoolID,
	)
	return i, err
}

const deletePupil = `-- name: DeletePupil :exec
DELETE FROM pupils WHERE id = $1 and school_id = $2
`

type DeletePupilParams struct {
	ID       int32     `json:"id"`
	SchoolID uuid.UUID `json:"school_id"`
}

func (q *Queries) DeletePupil(ctx context.Context, arg DeletePupilParams) error {
	_, err := q.db.ExecContext(ctx, deletePupil, arg.ID, arg.SchoolID)
	return err
}

const getAllPupils = `-- name: GetAllPupils :many
SELECT p.id, p.school_id, p.first_name, p.surname, p.class_id,
COALESCE(c.class_name, 'Unassigned') AS class_name
FROM pupils p
LEFT JOIN classes c ON p.class_id = c.id
WHERE p.school_id = $1
ORDER BY c.class_name, p.surname, p.first_name
`

type GetAllPupilsRow struct {
	ID        int32         `json:"id"`
	SchoolID  uuid.UUID     `json:"school_id"`
	FirstName string        `json:"first_name"`
	Surname   string        `json:"surname"`
	ClassID   sql.NullInt32 `json:"class_id"`
	ClassName string        `json:"class_name"`
}

func (q *Queries) GetAllPupils(ctx context.Context, schoolID uuid.UUID) ([]GetAllPupilsRow, error) {
	rows, err := q.db.QueryContext(ctx, getAllPupils, schoolID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetAllPupilsRow
	for rows.Next() {
		var i GetAllPupilsRow
		if err := rows.Scan(
			&i.ID,
			&i.SchoolID,
			&i.FirstName,
			&i.Surname,
			&i.ClassID,
			&i.ClassName,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getPupil = `-- name: GetPupil :one
SELECT pupils.id, first_name, surname, class_id, pupils.school_id, c.id, class_name, year_group_id, teacher_id, c.school_id FROM pupils LEFT JOIN classes c ON pupils.class_id = c.id
WHERE pupils.id = $1 and pupils.school_id = $2
`

type GetPupilParams struct {
	ID       int32     `json:"id"`
	SchoolID uuid.UUID `json:"school_id"`
}

type GetPupilRow struct {
	ID          int32          `json:"id"`
	FirstName   string         `json:"first_name"`
	Surname     string         `json:"surname"`
	ClassID     sql.NullInt32  `json:"class_id"`
	SchoolID    uuid.UUID      `json:"school_id"`
	ID_2        sql.NullInt32  `json:"id_2"`
	ClassName   sql.NullString `json:"class_name"`
	YearGroupID sql.NullInt32  `json:"year_group_id"`
	TeacherID   uuid.NullUUID  `json:"teacher_id"`
	SchoolID_2  uuid.NullUUID  `json:"school_id_2"`
}

func (q *Queries) GetPupil(ctx context.Context, arg GetPupilParams) (GetPupilRow, error) {
	row := q.db.QueryRowContext(ctx, getPupil, arg.ID, arg.SchoolID)
	var i GetPupilRow
	err := row.Scan(
		&i.ID,
		&i.FirstName,
		&i.Surname,
		&i.ClassID,
		&i.SchoolID,
		&i.ID_2,
		&i.ClassName,
		&i.YearGroupID,
		&i.TeacherID,
		&i.SchoolID_2,
	)
	return i, err
}

const updatePupil = `-- name: UpdatePupil :exec
UPDATE pupils
SET first_name = $3, surname = $4, class_id = $5
WHERE id = $1 and school_id = $2
`

type UpdatePupilParams struct {
	ID        int32         `json:"id"`
	SchoolID  uuid.UUID     `json:"school_id"`
	FirstName string        `json:"first_name"`
	Surname   string        `json:"surname"`
	ClassID   sql.NullInt32 `json:"class_id"`
}

func (q *Queries) UpdatePupil(ctx context.Context, arg UpdatePupilParams) error {
	_, err := q.db.ExecContext(ctx, updatePupil,
		arg.ID,
		arg.SchoolID,
		arg.FirstName,
		arg.Surname,
		arg.ClassID,
	)
	return err
}
