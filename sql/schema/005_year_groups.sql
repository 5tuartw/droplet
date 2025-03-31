-- +goose Up
CREATE TABLE year_groups (
    id SERIAL PRIMARY KEY,
    year_group_name VARCHAR(255) UNIQUE NOT NULL,
    division_id INT REFERENCES divisions(id) ON DELETE SET NULL
);

-- +goose Down
DROP TABLE year_groups;