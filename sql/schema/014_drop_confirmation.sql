-- +goose Up
CREATE TABLE drop_confirmations (
    drop_id UUID REFERENCES drops(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    confirmed_at TIMESTAMP,
    confirmed BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (drop_id, user_id)
);

-- +goose Down
DROP TABLE drop_confirmations;