-- name: GetDivisions :many
SELECT id, division_name FROM divisions where school_id = $1;

-- name: CreateDivision :one
INSERT INTO divisions (division_name, school_id)
VALUES ($1, $2)
RETURNING *;

-- name: UpdateDivision :one
UPDATE divisions SET division_name = $1
WHERE id = $2 and school_id = $3
RETURNING *;

-- name: DeleteDivision :execrows
DELETE FROM divisions WHERE id = $1 AND school_id = $2;

-- name: GetDivisionByID :one
SELECT * FROM divisions WHERE id = $1 AND school_id = $2;