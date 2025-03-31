-- +goose Up
CREATE TABLE custom_groups (
    id SERIAL PRIMARY KEY,
    group_name VARCHAR(255) NOT NULL,
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE
);

-- +goose Down
DROP TABLE custom_groups;