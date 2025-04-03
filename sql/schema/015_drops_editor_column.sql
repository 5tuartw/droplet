-- +goose Up
ALTER TABLE drops
ADD COLUMN edited_by UUID NULL REFERENCES users(id);

-- +goose Down
ALTER TABLE drops
DROP COLUMN edited_by;

