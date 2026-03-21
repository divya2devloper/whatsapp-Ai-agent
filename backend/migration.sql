-- Migration to add owner details and listing status to properties
-- And make listing URL optional

ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_number TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS listing_status TEXT DEFAULT 'Active'; -- Options: Active, Inactive, Sold
ALTER TABLE properties ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE properties ALTER COLUMN url DROP NOT NULL;
