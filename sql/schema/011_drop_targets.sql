-- +goose Up
CREATE TYPE target_type AS ENUM ('Student', 'Class', 'YearGroup', 'Division', 'CustomGroup','General');

CREATE TABLE drop_targets (
    id SERIAL PRIMARY KEY,
    drop_id UUID NOT NULL,
    type target_type NOT NULL,
    target_id INT,
    FOREIGN KEY (drop_id) REFERENCES drops(id) ON DELETE CASCADE,
    CONSTRAINT unique_target UNIQUE (drop_id, type, target_id)
);

-- +goose Down
DROP TABLE drop_targets;
DROP TYPE target_type;