-- name: GetDivisions :many
SELECT id, division_name FROM divisions;

-- name: GetYearGroups :many
SELECT id, year_group_name FROM year_groups;

-- name: GetClasses :many
SELECT id, class_name FROM classes;

-- name: GetPupils :many
SELECT id, first_name, surname FROM pupils;