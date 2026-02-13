-- Migration: Add ad metrics columns to sku_week table
-- Run this in Supabase SQL Editor

-- Add new columns for ad metrics
ALTER TABLE sku_week ADD COLUMN IF NOT EXISTS impressions INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sku_week ADD COLUMN IF NOT EXISTS clicks INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sku_week ADD COLUMN IF NOT EXISTS ad_orders INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sku_week ADD COLUMN IF NOT EXISTS ctr DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE sku_week ADD COLUMN IF NOT EXISTS cpc DECIMAL(8,2) NOT NULL DEFAULT 0;
ALTER TABLE sku_week ADD COLUMN IF NOT EXISTS cvr DECIMAL(5,2) NOT NULL DEFAULT 0;

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'sku_week'
AND column_name IN ('impressions', 'clicks', 'ad_orders', 'ctr', 'cpc', 'cvr');
