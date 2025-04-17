-- +goose Up
ALTER TABLE drop_confirmations ADD COLUMN school_id UUID;

UPDATE drop_confirmations SET school_id = '1ba13e47-ca2d-44af-9f4d-fb7326d83999' WHERE school_id IS NULL;

ALTER TABLE drop_confirmations ALTER COLUMN school_id SET NOT NULL;

ALTER TABLE drop_confirmations
ADD CONSTRAINT fk_drop_confirmations_school
FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;

CREATE INDEX idx_drop_confirmations_school_id ON drop_confirmations(school_id);
CREATE INDEX idx_drop_confirmations_user_id ON drop_confirmations(user_id);

-- +goose Down
DROP INDEX IF EXISTS idx_drop_confirmations_school_id;
DROP INDEX IF EXISTS idx_drop_confirmations_user_id;
ALTER TABLE drop_confirmations DROP CONSTRAINT IF EXISTS fk_drop_confirmations_school;
ALTER TABLE drop_confirmations ALTER COLUMN school_id DROP NOT NULL;
ALTER TABLE drop_confirmations DROP COLUMN school_id;