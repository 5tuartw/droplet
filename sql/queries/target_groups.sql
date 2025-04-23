-- name: GetDivisions :many
SELECT id, division_name FROM divisions where school_id = $1;

-- name: GetYearGroups :many
SELECT id, year_group_name FROM year_groups where school_id = $1;

-- name: GetClasses :many
SELECT id, class_name FROM classes where school_id = $1;

-- name: GetPupils :many
SELECT id, first_name, surname FROM pupils where school_id = $1;

-- VALIDATE TARGETS
-- name: CountValidClassesForSchool :one
SELECT count(*) FROM classes
WHERE school_id = $1 AND id = ANY($2::integer[]);

-- name: CountValidYearGroupsForSchool :one
SELECT count(*) FROM year_groups
WHERE school_id = $1 AND id = ANY($2::integer[]);

-- name: CountValidDivisionsForSchool :one
SELECT count(*) FROM divisions
WHERE school_id = $1 AND id = ANY($2::integer[]);

-- name: CountValidPupilsForSchool :one
SELECT count(*) FROM pupils
WHERE school_id = $1 AND id = ANY($2::integer[]);

-- DELETE TARGET GROUPS

-- name: DeleteClass :exec
DELETE FROM classes WHERE school_id = $1 AND id = $2;

-- name: DeleteYearGroup :exec
DELETE FROM year_groups WHERE school_id = $1 AND id = $2;

-- name: DeleteDivision :exec
DELETE FROM divisions WHERE school_id = $1 AND id = $2;