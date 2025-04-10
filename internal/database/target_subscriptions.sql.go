// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.28.0
// source: target_subscriptions.sql

package database

import (
	"context"

	"github.com/google/uuid"
)

const addTargetSubscription = `-- name: AddTargetSubscription :exec
INSERT INTO target_subscriptions (user_id, type, target_id)
VALUES ($1, $2, $3)
`

type AddTargetSubscriptionParams struct {
	UserID   uuid.UUID
	Type     TargetType
	TargetID int32
}

func (q *Queries) AddTargetSubscription(ctx context.Context, arg AddTargetSubscriptionParams) error {
	_, err := q.db.ExecContext(ctx, addTargetSubscription, arg.UserID, arg.Type, arg.TargetID)
	return err
}

const deleteTargetSubscriptions = `-- name: DeleteTargetSubscriptions :exec
DELETE FROM target_subscriptions WHERE user_id = $1
`

func (q *Queries) DeleteTargetSubscriptions(ctx context.Context, userID uuid.UUID) error {
	_, err := q.db.ExecContext(ctx, deleteTargetSubscriptions, userID)
	return err
}

const getSubscriptionsForUser = `-- name: GetSubscriptionsForUser :many
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
LEFT JOIN
    classes cls ON ts.type = 'Class' AND ts.target_id = cls.id
LEFT JOIN
    year_groups yg ON ts.type = 'YearGroup' AND ts.target_id = yg.id
LEFT JOIN
    divisions div ON ts.type = 'Division' AND ts.target_id = div.id

WHERE
    ts.user_id = $1

ORDER BY
    ts.type, target_name
`

type GetSubscriptionsForUserRow struct {
	TargetType TargetType
	TargetID   int32
	TargetName string
}

// LEFT JOINs to get names
func (q *Queries) GetSubscriptionsForUser(ctx context.Context, userID uuid.UUID) ([]GetSubscriptionsForUserRow, error) {
	rows, err := q.db.QueryContext(ctx, getSubscriptionsForUser, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetSubscriptionsForUserRow
	for rows.Next() {
		var i GetSubscriptionsForUserRow
		if err := rows.Scan(&i.TargetType, &i.TargetID, &i.TargetName); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
