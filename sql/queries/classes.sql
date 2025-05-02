-- name: GetClassID :one
SELECT id FROM classes WHERE class_name = $1 and school_id = $2;

-- name: ValidateClassInSchool :one
SELECT COUNT(*) from classes WHERE school_id = $1 and id = $2;

-- name: GetClasses :many
SELECT id, class_name, year_group_id FROM classes where school_id = $1 ORDER BY class_name;

-- name: CreateClass :one
INSERT INTO classes (class_name, year_group_id, school_id)
VALUES ($1, $2, $3)
RETURNING *;

-- name: RenameClass :execrows
UPDATE classes SET class_name = $1
WHERE id = $2 and school_id = $3;

-- name: MoveClass :execrows
UPDATE classes set year_group_id = $1
WHERE id = $2 and school_id = $3;

-- name: DeleteClass :execrows
DELETE FROM classes WHERE id = $1 AND school_id = $2;

-- name: CountClassesInYearGroup :one
SELECT count(*) from classes
WHERE year_group_id = $1 AND school_id = $2;

