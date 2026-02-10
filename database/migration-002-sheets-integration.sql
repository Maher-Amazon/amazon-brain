-- Migration 002: Add tables for Google Sheets integration
-- Run this migration to add campaign flags and weekly notes

-- 1. Campaign flags table (strategic annotations)
CREATE TABLE IF NOT EXISTS campaign_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  flag VARCHAR(20) NOT NULL, -- 'DEFEND', 'AGGRESS', 'TEST', 'PAUSE', 'SCALE'
  reason TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id) -- One active flag per campaign
);

-- 2. Weekly notes table (manual commentary per week)
CREATE TABLE IF NOT EXISTS weekly_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_start DATE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL, -- NULL = account-level note
  note TEXT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general', -- 'general', 'ads', 'inventory', 'promo', 'event'
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_campaign_flags_campaign ON campaign_flags(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_flags_flag ON campaign_flags(flag);
CREATE INDEX IF NOT EXISTS idx_weekly_notes_week ON weekly_notes(week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_notes_brand ON weekly_notes(brand_id);

-- 4. Create updated_at triggers
DROP TRIGGER IF EXISTS update_campaign_flags_updated_at ON campaign_flags;
CREATE TRIGGER update_campaign_flags_updated_at BEFORE UPDATE ON campaign_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_weekly_notes_updated_at ON weekly_notes;
CREATE TRIGGER update_weekly_notes_updated_at BEFORE UPDATE ON weekly_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Enable RLS
ALTER TABLE campaign_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_notes ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
DROP POLICY IF EXISTS "Allow authenticated read" ON campaign_flags;
CREATE POLICY "Allow authenticated read" ON campaign_flags FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read" ON weekly_notes;
CREATE POLICY "Allow authenticated read" ON weekly_notes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage campaign_flags" ON campaign_flags;
CREATE POLICY "Admins can manage campaign_flags" ON campaign_flags FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can manage weekly_notes" ON weekly_notes;
CREATE POLICY "Admins can manage weekly_notes" ON weekly_notes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Service role full access campaign_flags" ON campaign_flags;
CREATE POLICY "Service role full access campaign_flags" ON campaign_flags FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role full access weekly_notes" ON weekly_notes;
CREATE POLICY "Service role full access weekly_notes" ON weekly_notes FOR ALL TO service_role USING (true);

-- Done!
SELECT 'Migration 002 completed successfully' as status;
