



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