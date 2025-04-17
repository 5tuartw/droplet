-- +goose Up
ALTER TABLE refresh_tokens ADD COLUMN school_id UUID;

UPDATE refresh_tokens SET school_id = '1ba13e47-ca2d-44af-9f4d-fb7326d83999' WHERE school_id IS NULL;

ALTER TABLE refresh_tokens ALTER COLUMN school_id SET NOT NULL;

ALTER TABLE refresh_tokens
ADD CONSTRAINT fk_rtokens_school
FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

CREATE INDEX idx_rtokens_school_id ON refresh_tokens(school_id);
CREATE INDEX idx_rtokens_user_id on refresh_tokens(user_id);

-- +goose Down
DROP INDEX IF EXISTS idx_rtokens_user_id;
DROP INDEX IF EXISTS idx_rtokens_school_id;
ALTER TABLE refresh_tokens DROP CONSTRAINT IF EXISTS fk_rtokens_school;
ALTER TABLE refresh_tokens ALTER COLUMN school_id DROP NOT NULL;
ALTER TABLE refresh_tokens DROP COLUMN school_id;