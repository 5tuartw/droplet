-- name: AddTargetSubscription :exec
INSERT INTO target_subscriptions (user_id, type, target_id)
VALUES ($1, $2, $3);

-- name: DeleteTargetSubscriptions :exec
DELETE FROM target_subscriptions WHERE user_id = $1;