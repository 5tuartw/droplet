-- +goose Up
ALTER TABLE custom_groups ADD COLUMN school_id UUID;

UPDATE custom_groups SET school_id = '1ba13e47-ca2d-44af-9f4d-fb7326d83999' WHERE school_id IS NULL;

ALTER TABLE custom_groups ALTER COLUMN school_id SET NOT NULL;

ALTER TABLE custom_groups
ADD CONSTRAINT fk_custom_groups_school
FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;

CREATE INDEX idx_custom_groups_school_id ON custom_groups(school_id);

-- +goose Down
DROP INDEX IF EXISTS idx_custom_groups_school_id;
ALTER TABLE custom_groups DROP CONSTRAINT IF EXISTS fk_custom_groups_school;
ALTER TABLE custom_groups ALTER COLUMN school_id DROP NOT NULL;
ALTER TABLE custom_groups DROP COLUMN school_id;