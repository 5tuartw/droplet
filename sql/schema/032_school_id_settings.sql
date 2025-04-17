-- +goose Up
ALTER TABLE user_settings ADD COLUMN school_id UUID;

UPDATE user_settings SET school_id = '1ba13e47-ca2d-44af-9f4d-fb7326d83999' WHERE school_id IS NULL;

ALTER TABLE user_settings ALTER COLUMN school_id SET NOT NULL;

ALTER TABLE user_settings
ADD CONSTRAINT fk_user_settings_school
FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;


-- +goose Down
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS fk_user_settings_school;
ALTER TABLE user_settings ALTER COLUMN school_id DROP NOT NULL;
ALTER TABLE user_settings DROP COLUMN school_id;