-- Add auto-increment functionality to the Repair Center id field
CREATE SEQUENCE IF NOT EXISTS repair_center_id_seq;
ALTER TABLE public."Repair Center" ALTER COLUMN id SET DEFAULT nextval('repair_center_id_seq');
ALTER SEQUENCE repair_center_id_seq OWNED BY public."Repair Center".id;