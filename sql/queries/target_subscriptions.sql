-- name: AddTargetSubscription :exec
INSERT INTO target_subscriptions (user_id, school_id, type, target_id)
VALUES ($1, $2, $3, $4);

-- name: DeleteTargetSubscriptions :exec
DELETE FROM target_subscriptions WHERE user_id = $1 AND school_id = $2;

-- name: GetSubscriptionsForUser :many
SELECT
    ts.type AS target_type,
    ts.target_id AS target_id,
    COALESCE(
        cls.class_name,
        yg.year_group_name,
        div.division_name
    )::text AS target_name      -- Cast result to text for sqlc string mapping

FROM
    target_subscriptions ts
-- LEFT JOINs to get names
LEFT JOIN
    classes cls ON ts.type = 'Class' AND ts.target_id = cls.id
LEFT JOIN
    year_groups yg ON ts.type = 'YearGroup' AND ts.target_id = yg.id
LEFT JOIN
    divisions div ON ts.type = 'Division' AND ts.target_id = div.id

WHERE
    ts.user_id = $1 and ts.school_id = $2

ORDER BY
    ts.type, target_name; -- Order predictably