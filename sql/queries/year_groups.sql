-- name: GetYearGroups :many
SELECT id, year_group_name FROM year_groups where school_id = $1;

-- name: CreateYearGroup :one
INSERT INTO year_groups (year_group_name, division_id, school_id)
VALUES ($1, $2, $3)
RETURNING *;

-- name: UpdateYearGroup :one
UPDATE year_groups SET year_group_name = $1, division_id = $2
WHERE id = $3 and school_id = $4
RETURNING *;

-- name: DeleteYearGroup :execrows
DELETE FROM year_groups WHERE id = $1 AND school_id = $2;

-- name: GetYearGroupByID :one
SELECT * FROM year_groups WHERE id = $1 AND school_id = $2;

-- name: GetYearGroupsInDivision :many
SELECT * FROM year_groups WHERE division_id = $1 and school_id = $2;

-- name: CountYearGroupsInDivision :one
SELECT count(*) from year_groups
WHERE division_id = $1 AND school_id = $2;