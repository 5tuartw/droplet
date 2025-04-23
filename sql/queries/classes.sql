-- name: GetClassID :one
SELECT id FROM classes WHERE class_name = $1 and school_id = $2;

-- name: ValidateClassInSchool :one
SELECT COUNT(*) from classes WHERE school_id = $1 and id = $2;