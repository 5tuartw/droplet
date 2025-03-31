-- +goose Up
CREATE TABLE drop_views (
    drop_id UUID REFERENCES drops(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP NOT NULL,
    PRIMARY KEY (drop_id, user_id)
);

-- +goose Down
DROP TABLE drop_views;