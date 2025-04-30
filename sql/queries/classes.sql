-- name: GetClassID :one
SELECT id FROM classes WHERE class_name = $1 and school_id = $2;

-- name: ValidateClassInSchool :one
SELECT COUNT(*) from classes WHERE school_id = $1 and id = $2;

-- name: GetClasses :many
SELECT id, class_name FROM classes where school_id = $1;

-- name: CreateClass :one
INSERT INTO classes (class_name, year_group_id, school_id)
VALUES ($1, $2, $3)
RETURNING *;

-- name: UpdateClass :one
UPDATE classes SET class_name = $1, year_group_id = $2
WHERE id = $3 and school_id = $4
RETURNING *;

-- name: DeleteClass :execrows
DELETE FROM classes WHERE id = $1 AND school_id = $2;

-- name: CountClassesInYearGroup :one
SELECT count(*) from classes
WHERE year_group_id = $1 AND school_id = $2;

