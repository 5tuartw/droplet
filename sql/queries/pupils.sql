-- name: CreatePupil :one
INSERT INTO pupils (first_name, surname, class_id, school_id)
VALUES (
    $1,
    $2,
    $3,
    $4
)
RETURNING *;

-- name: GetAllPupils :many
SELECT p.id, p.school_id, p.first_name, p.surname, p.class_id,
COALESCE(c.class_name, 'Unassigned') AS class_name
FROM pupils p
LEFT JOIN classes c ON p.class_id = c.id
WHERE p.school_id = $1
ORDER BY c.class_name, p.surname, p.first_name;