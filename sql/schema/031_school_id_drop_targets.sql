-- +goose Up
ALTER TABLE drop_targets ADD COLUMN school_id UUID;

UPDATE drop_targets SET school_id = '1ba13e47-ca2d-44af-9f4d-fb7326d83999' WHERE school_id IS NULL;

ALTER TABLE drop_targets ALTER COLUMN school_id SET NOT NULL;

ALTER TABLE drop_targets
ADD CONSTRAINT fk_drop_targets_school
FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;

CREATE INDEX idx_drop_targets_school_id ON drop_targets(school_id);
CREATE INDEX idx_drop_targets_drop_id ON drop_targets(drop_id);

-- +goose Down
DROP INDEX IF EXISTS idx_drop_targets_school_id;
DROP INDEX IF EXISTS idx_drop_targets_drop_id;
ALTER TABLE drop_targets DROP CONSTRAINT IF EXISTS fk_drop_targets_school;
ALTER TABLE drop_targets ALTER COLUMN school_id DROP NOT NULL;
ALTER TABLE drop_targets DROP COLUMN school_id;