-- +goose Up
CREATE TYPE target_type AS ENUM ('Student', 'Class', 'YearGroup', 'Division', 'CustomGroup','General');

CREATE TABLE drop_targets (
    drop_id UUID,
    type target_type NOT NULL,
    target_id INT NOT NULL,
    PRIMARY KEY (drop_id, type, target_id),
    FOREIGN KEY (drop_id) REFERENCES drops(id),
    CONSTRAINT unique_target_or_general UNIQUE (drop_id, type, target_id)
);

-- +goose Down
DROP TABLE drop_targets;
DROP TYPE target_type;