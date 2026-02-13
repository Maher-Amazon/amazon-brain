-- Migration 004: Fix missing tables and constraints
-- Run this in Supabase SQL Editor to enable search terms and targeting sync

-- =====================================================
-- 1. Add unique constraint to searchterm_week (if missing)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'searchterm_week_unique'
  ) THEN
    ALTER TABLE searchterm_week
    ADD CONSTRAINT searchterm_week_unique UNIQUE (term, campaign_id, week_start);
  END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_searchterm_week_campaign ON searchterm_week(campaign_id);

-- =====================================================
-- 2. Create target_asin_week table (if missing)
-- =====================================================
CREATE TABLE IF NOT EXISTS target_asin_week (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_asin VARCHAR(20) NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  ad_type VARCHAR(10) NOT NULL, -- 'SP' or 'SD'
  week_start DATE NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  spend DECIMAL(10,2) NOT NULL DEFAULT 0,
  sales DECIMAL(12,2) NOT NULL DEFAULT 0,
  orders INTEGER NOT NULL DEFAULT 0,
  acos DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(target_asin, campaign_id, ad_type, week_start)
);

-- Indexes for target_asin_week
CREATE INDEX IF NOT EXISTS idx_target_asin_week_asin ON target_asin_week(target_asin);
CREATE INDEX IF NOT EXISTS idx_target_asin_week_campaign ON target_asin_week(campaign_id);
CREATE INDEX IF NOT EXISTS idx_target_asin_week_week ON target_asin_week(week_start);

-- =====================================================
-- 3. Row Level Security for target_asin_week
-- =====================================================
ALTER TABLE target_asin_week ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'target_asin_week' AND policyname = 'Allow authenticated read'
  ) THEN
    CREATE POLICY "Allow authenticated read" ON target_asin_week FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Allow service role full access (for sync scripts)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'target_asin_week' AND policyname = 'Service role full access target_asin_week'
  ) THEN
    CREATE POLICY "Service role full access target_asin_week" ON target_asin_week FOR ALL TO service_role USING (true);
  END IF;
END $$;

-- Admin policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'target_asin_week' AND policyname = 'Admins can manage target_asin_week'
  ) THEN
    CREATE POLICY "Admins can manage target_asin_week" ON target_asin_week FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- =====================================================
-- Done! Run sync commands to verify:
--   node scripts/sync-to-supabase.js --searchterms --days=14
--   node scripts/sync-to-supabase.js --targeting --days=14
-- =====================================================
