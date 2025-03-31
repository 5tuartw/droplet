-- +goose Up
CREATE TABLE pupils (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    surname VARCHAR(255) NOT NULL,
    class_id INT REFERENCES classes(id) ON DELETE SET NULL
);

-- +goose Down
DROP TABLE pupils;