-- +goose Up
CREATE TABLE drops (
    id UUID PRIMARY KEY,
    user_id UUID,
    title VARCHAR(255),
    content TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    post_date TIMESTAMP,
    expire_date TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- +goose Down
DROP TABLE drops;