-- Migration 003: Add unique constraint to searchterm_week
-- This enables upsert functionality for search term data sync

-- Add unique constraint for upsert operations
ALTER TABLE searchterm_week
ADD CONSTRAINT searchterm_week_unique UNIQUE (term, campaign_id, week_start);

-- Add index for better query performance on campaign lookups
CREATE INDEX IF NOT EXISTS idx_searchterm_week_campaign ON searchterm_week(campaign_id);
