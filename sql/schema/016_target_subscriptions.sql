-- +goose Up
CREATE TABLE target_subscriptions (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type target_type NOT NULL,
    target_id INT NOT NULL,
    PRIMARY KEY (user_id, type, target_id)
);

-- +goose Down
DROP TABLE target_subscriptions;