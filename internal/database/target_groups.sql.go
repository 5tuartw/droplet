// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.28.0
// source: target_groups.sql

package database

import (
	"context"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

const countValidClassesForSchool = `-- name: CountValidClassesForSchool :one
SELECT count(*) FROM classes
WHERE school_id = $1 AND id = ANY($2::integer[])
`

type CountValidClassesForSchoolParams struct {
	SchoolID uuid.UUID `json:"school_id"`
	Column2  []int32   `json:"column_2"`
}

// VALIDATE TARGETS
func (q *Queries) CountValidClassesForSchool(ctx context.Context, arg CountValidClassesForSchoolParams) (int64, error) {
	row := q.db.QueryRowContext(ctx, countValidClassesForSchool, arg.SchoolID, pq.Array(arg.Column2))
	var count int64
	err := row.Scan(&count)
	return count, err
}

const countValidDivisionsForSchool = `-- name: CountValidDivisionsForSchool :one
SELECT count(*) FROM divisions
WHERE school_id = $1 AND id = ANY($2::integer[])
`

type CountValidDivisionsForSchoolParams struct {
	SchoolID uuid.UUID `json:"school_id"`
	Column2  []int32   `json:"column_2"`
}

func (q *Queries) CountValidDivisionsForSchool(ctx context.Context, arg CountValidDivisionsForSchoolParams) (int64, error) {
	row := q.db.QueryRowContext(ctx, countValidDivisionsForSchool, arg.SchoolID, pq.Array(arg.Column2))
	var count int64
	err := row.Scan(&count)
	return count, err
}

const countValidPupilsForSchool = `-- name: CountValidPupilsForSchool :one
SELECT count(*) FROM pupils
WHERE school_id = $1 AND id = ANY($2::integer[])
`

type CountValidPupilsForSchoolParams struct {
	SchoolID uuid.UUID `json:"school_id"`
	Column2  []int32   `json:"column_2"`
}

func (q *Queries) CountValidPupilsForSchool(ctx context.Context, arg CountValidPupilsForSchoolParams) (int64, error) {
	row := q.db.QueryRowContext(ctx, countValidPupilsForSchool, arg.SchoolID, pq.Array(arg.Column2))
	var count int64
	err := row.Scan(&count)
	return count, err
}

const countValidYearGroupsForSchool = `-- name: CountValidYearGroupsForSchool :one
SELECT count(*) FROM year_groups
WHERE school_id = $1 AND id = ANY($2::integer[])
`

type CountValidYearGroupsForSchoolParams struct {
	SchoolID uuid.UUID `json:"school_id"`
	Column2  []int32   `json:"column_2"`
}

func (q *Queries) CountValidYearGroupsForSchool(ctx context.Context, arg CountValidYearGroupsForSchoolParams) (int64, error) {
	row := q.db.QueryRowContext(ctx, countValidYearGroupsForSchool, arg.SchoolID, pq.Array(arg.Column2))
	var count int64
	err := row.Scan(&count)
	return count, err
}

const getPupils = `-- name: GetPupils :many
SELECT id, first_name, surname FROM pupils where school_id = $1
`

type GetPupilsRow struct {
	ID        int32  `json:"id"`
	FirstName string `json:"first_name"`
	Surname   string `json:"surname"`
}

func (q *Queries) GetPupils(ctx context.Context, schoolID uuid.UUID) ([]GetPupilsRow, error) {
	rows, err := q.db.QueryContext(ctx, getPupils, schoolID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetPupilsRow
	for rows.Next() {
		var i GetPupilsRow
		if err := rows.Scan(&i.ID, &i.FirstName, &i.Surname); err != nil {
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
