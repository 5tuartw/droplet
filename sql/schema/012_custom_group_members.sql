-- +goose Up
CREATE TABLE custom_group_members (
    group_id INT NOT NULL,
    pupil_id INT NOT NULL,
    FOREIGN KEY (group_id) REFERENCES custom_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (pupil_id) REFERENCES pupils(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, pupil_id)
);

-- +goose Down
DROP TABLE custom_group_members;