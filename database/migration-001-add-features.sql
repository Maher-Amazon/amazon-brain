-- Migration 001: Add TACoS high threshold, target_asin_week, promos_tracker
-- Run this migration to add new features to an existing database

-- 1. Add TACoS high threshold to account_settings
ALTER TABLE account_settings
ADD COLUMN IF NOT EXISTS tacos_high_threshold DECIMAL(5,2) NOT NULL DEFAULT 25.00;

-- 2. Add updated_at to events_uae if missing
ALTER TABLE events_uae
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. Update events_uae status values
UPDATE events_uae SET status = 'tbc' WHERE status = 'upcoming';

-- 4. Create target_asin_week table
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

-- 5. Create promos_tracker table
CREATE TABLE IF NOT EXISTS promos_tracker (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asin VARCHAR(20) NOT NULL,
  sku_id UUID REFERENCES skus(id) ON DELETE SET NULL,
  promo_type VARCHAR(50) NOT NULL, -- 'discount', 'coupon', 'ped', 'deal', 'lightning_deal'
  discount_percent DECIMAL(5,2),
  discount_amount DECIMAL(10,2),
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'ended', 'scheduled'
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_target_asin_week_asin ON target_asin_week(target_asin);
CREATE INDEX IF NOT EXISTS idx_target_asin_week_campaign ON target_asin_week(campaign_id);
CREATE INDEX IF NOT EXISTS idx_target_asin_week_week ON target_asin_week(week_start);
CREATE INDEX IF NOT EXISTS idx_promos_tracker_asin ON promos_tracker(asin);
CREATE INDEX IF NOT EXISTS idx_promos_tracker_sku ON promos_tracker(sku_id);
CREATE INDEX IF NOT EXISTS idx_promos_tracker_status ON promos_tracker(status);
CREATE INDEX IF NOT EXISTS idx_promos_tracker_dates ON promos_tracker(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_events_uae_dates ON events_uae(start_date, end_date);

-- 7. Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_events_uae_updated_at ON events_uae;
CREATE TRIGGER update_events_uae_updated_at BEFORE UPDATE ON events_uae
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_promos_tracker_updated_at ON promos_tracker;
CREATE TRIGGER update_promos_tracker_updated_at BEFORE UPDATE ON promos_tracker
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Enable RLS on new tables
ALTER TABLE target_asin_week ENABLE ROW LEVEL SECURITY;
ALTER TABLE promos_tracker ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for new tables
DROP POLICY IF EXISTS "Allow authenticated read" ON target_asin_week;
CREATE POLICY "Allow authenticated read" ON target_asin_week FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read" ON promos_tracker;
CREATE POLICY "Allow authenticated read" ON promos_tracker FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage target_asin_week" ON target_asin_week;
CREATE POLICY "Admins can manage target_asin_week" ON target_asin_week FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can manage promos_tracker" ON promos_tracker;
CREATE POLICY "Admins can manage promos_tracker" ON promos_tracker FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can manage events_uae" ON events_uae;
CREATE POLICY "Admins can manage events_uae" ON events_uae FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Service role full access target_asin_week" ON target_asin_week;
CREATE POLICY "Service role full access target_asin_week" ON target_asin_week FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role full access promos_tracker" ON promos_tracker;
CREATE POLICY "Service role full access promos_tracker" ON promos_tracker FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role full access events_uae" ON events_uae;
CREATE POLICY "Service role full access events_uae" ON events_uae FOR ALL TO service_role USING (true);

-- Done!
SELECT 'Migration 001 completed successfully' as status;
