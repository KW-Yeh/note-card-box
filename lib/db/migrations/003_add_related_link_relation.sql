ALTER TABLE links
DROP CONSTRAINT IF EXISTS links_relation_check;

ALTER TABLE links
ADD CONSTRAINT links_relation_check
CHECK (relation IN ('EXTENSION', 'OPPOSITION', 'RELATED'));
