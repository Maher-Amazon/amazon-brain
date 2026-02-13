-- Amazon Brain Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Brands table
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  mode VARCHAR(50) NOT NULL DEFAULT 'growth',
  tacos_target DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  acos_target DECIMAL(5,2) NOT NULL DEFAULT 25.00,
  min_stock_days INTEGER NOT NULL DEFAULT 14,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SKUs table
CREATE TABLE skus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku VARCHAR(100) NOT NULL,
  asin VARCHAR(20) NOT NULL,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  mode_override VARCHAR(50),
  tacos_override DECIMAL(5,2),
  acos_override DECIMAL(5,2),
  min_stock_override INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sku)
);

-- Brand weekly aggregates
CREATE TABLE brand_week (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  revenue_ex_vat DECIMAL(12,2) NOT NULL DEFAULT 0,
  units INTEGER NOT NULL DEFAULT 0,
  orders INTEGER NOT NULL DEFAULT 0,
  ad_spend DECIMAL(10,2) NOT NULL DEFAULT 0,
  ad_sales DECIMAL(12,2) NOT NULL DEFAULT 0,
  tacos DECIMAL(5,2) NOT NULL DEFAULT 0,
  acos DECIMAL(5,2) NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(brand_id, week_start)
);

-- SKU weekly aggregates
CREATE TABLE sku_week (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  revenue_ex_vat DECIMAL(12,2) NOT NULL DEFAULT 0,
  units INTEGER NOT NULL DEFAULT 0,
  ad_spend DECIMAL(10,2) NOT NULL DEFAULT 0,
  ad_sales DECIMAL(12,2) NOT NULL DEFAULT 0,
  tacos DECIMAL(5,2) NOT NULL DEFAULT 0,
  acos DECIMAL(5,2) NOT NULL DEFAULT 0,
  stock_level INTEGER NOT NULL DEFAULT 0,
  stock_days DECIMAL(5,1) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sku_id, week_start)
);

-- Campaigns table
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id VARCHAR(100) NOT NULL,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name VARCHAR(500) NOT NULL,
  type VARCHAR(50) NOT NULL,
  state VARCHAR(50) NOT NULL DEFAULT 'enabled',
  budget DECIMAL(10,2) NOT NULL DEFAULT 0,
  targeting_type VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id)
);

-- Campaign weekly aggregates
CREATE TABLE campaign_week (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  spend DECIMAL(10,2) NOT NULL DEFAULT 0,
  sales DECIMAL(12,2) NOT NULL DEFAULT 0,
  orders INTEGER NOT NULL DEFAULT 0,
  acos DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, week_start)
);

-- Search terms weekly aggregates
CREATE TABLE searchterm_week (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  term VARCHAR(500) NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  week_start DATE NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  orders INTEGER NOT NULL DEFAULT 0,
  spend DECIMAL(10,2) NOT NULL DEFAULT 0,
  sales DECIMAL(12,2) NOT NULL DEFAULT 0,
  acos DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(term, campaign_id, week_start)
);

-- Decisions log (mode changes, etc.)
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(50) NOT NULL, -- 'brand', 'sku', 'campaign'
  entity_id UUID NOT NULL,
  old_mode VARCHAR(50),
  new_mode VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- UAE events calendar
CREATE TABLE events_uae (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'tbc', -- 'tbc', 'confirmed', 'cancelled'
  impact_level VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'high', 'medium', 'low'
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Target ASIN weekly data (competitor/detail-page targeting)
CREATE TABLE target_asin_week (
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

-- Promotions tracker
CREATE TABLE promos_tracker (
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

-- Campaign flags (strategic annotations for Google Sheets)
CREATE TABLE campaign_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  flag VARCHAR(20) NOT NULL, -- 'DEFEND', 'AGGRESS', 'TEST', 'PAUSE', 'SCALE'
  reason TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id) -- One active flag per campaign
);

-- Weekly notes (manual commentary per week)
CREATE TABLE weekly_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_start DATE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL, -- NULL = account-level note
  note TEXT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general', -- 'general', 'ads', 'inventory', 'promo', 'event'
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Goals history tracking
CREATE TABLE goals_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(50) NOT NULL, -- 'account', 'brand', 'sku'
  entity_id UUID,
  field VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'viewer', -- 'admin', 'viewer'
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alerts table
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL, -- 'stock', 'tacos', 'budget', 'general'
  entity_type VARCHAR(50) NOT NULL, -- 'brand', 'sku', 'campaign'
  entity_id UUID NOT NULL,
  message TEXT NOT NULL,
  level VARCHAR(20) NOT NULL DEFAULT 'info', -- 'critical', 'warning', 'info'
  sent_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Account settings (single row table for global settings)
CREATE TABLE account_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  default_tacos_target DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  default_acos_target DECIMAL(5,2) NOT NULL DEFAULT 25.00,
  default_min_stock_days INTEGER NOT NULL DEFAULT 14,
  tacos_high_threshold DECIMAL(5,2) NOT NULL DEFAULT 25.00, -- TACoS above this is "high"
  vat_rate DECIMAL(4,2) NOT NULL DEFAULT 5.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'AED',
  timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Dubai',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default account settings
INSERT INTO account_settings (id) VALUES (uuid_generate_v4());

-- Create indexes for better query performance
CREATE INDEX idx_skus_brand_id ON skus(brand_id);
CREATE INDEX idx_brand_week_brand_id ON brand_week(brand_id);
CREATE INDEX idx_brand_week_week_start ON brand_week(week_start);
CREATE INDEX idx_sku_week_sku_id ON sku_week(sku_id);
CREATE INDEX idx_sku_week_week_start ON sku_week(week_start);
CREATE INDEX idx_campaigns_brand_id ON campaigns(brand_id);
CREATE INDEX idx_campaign_week_campaign_id ON campaign_week(campaign_id);
CREATE INDEX idx_campaign_week_week_start ON campaign_week(week_start);
CREATE INDEX idx_searchterm_week_week_start ON searchterm_week(week_start);
CREATE INDEX idx_searchterm_week_term ON searchterm_week(term);
CREATE INDEX idx_decisions_entity ON decisions(entity_type, entity_id);
CREATE INDEX idx_alerts_entity ON alerts(entity_type, entity_id);
CREATE INDEX idx_alerts_level ON alerts(level);
CREATE INDEX idx_alerts_resolved ON alerts(resolved_at);
CREATE INDEX idx_target_asin_week_asin ON target_asin_week(target_asin);
CREATE INDEX idx_target_asin_week_campaign ON target_asin_week(campaign_id);
CREATE INDEX idx_target_asin_week_week ON target_asin_week(week_start);
CREATE INDEX idx_promos_tracker_asin ON promos_tracker(asin);
CREATE INDEX idx_promos_tracker_sku ON promos_tracker(sku_id);
CREATE INDEX idx_promos_tracker_status ON promos_tracker(status);
CREATE INDEX idx_promos_tracker_dates ON promos_tracker(start_date, end_date);
CREATE INDEX idx_events_uae_dates ON events_uae(start_date, end_date);
CREATE INDEX idx_campaign_flags_campaign ON campaign_flags(campaign_id);
CREATE INDEX idx_campaign_flags_flag ON campaign_flags(flag);
CREATE INDEX idx_weekly_notes_week ON weekly_notes(week_start);
CREATE INDEX idx_weekly_notes_brand ON weekly_notes(brand_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skus_updated_at BEFORE UPDATE ON skus
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_account_settings_updated_at BEFORE UPDATE ON account_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_uae_updated_at BEFORE UPDATE ON events_uae
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promos_tracker_updated_at BEFORE UPDATE ON promos_tracker
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_flags_updated_at BEFORE UPDATE ON campaign_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_notes_updated_at BEFORE UPDATE ON weekly_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_week ENABLE ROW LEVEL SECURITY;
ALTER TABLE sku_week ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_week ENABLE ROW LEVEL SECURITY;
ALTER TABLE searchterm_week ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events_uae ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_asin_week ENABLE ROW LEVEL SECURITY;
ALTER TABLE promos_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_notes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all data
CREATE POLICY "Allow authenticated read" ON brands FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON skus FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON brand_week FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON sku_week FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON campaign_week FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON searchterm_week FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON decisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON events_uae FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON goals_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON account_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON target_asin_week FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON promos_tracker FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON campaign_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON weekly_notes FOR SELECT TO authenticated USING (true);

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON users FOR SELECT TO authenticated USING (auth.uid() = id);

-- Admin policies (check user role for write operations)
CREATE POLICY "Admins can insert" ON brands FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update" ON brands FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete" ON brands FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Similar policies for other tables that require admin access
CREATE POLICY "Admins can manage skus" ON skus FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can manage decisions" ON decisions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can manage alerts" ON alerts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can manage goals_history" ON goals_history FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can manage account_settings" ON account_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can manage target_asin_week" ON target_asin_week FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can manage promos_tracker" ON promos_tracker FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can manage events_uae" ON events_uae FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can manage campaign_flags" ON campaign_flags FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can manage weekly_notes" ON weekly_notes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Service role can do everything (for sync scripts)
CREATE POLICY "Service role full access brands" ON brands FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access skus" ON skus FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access brand_week" ON brand_week FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access sku_week" ON sku_week FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access campaigns" ON campaigns FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access campaign_week" ON campaign_week FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access searchterm_week" ON searchterm_week FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access alerts" ON alerts FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access target_asin_week" ON target_asin_week FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access promos_tracker" ON promos_tracker FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access events_uae" ON events_uae FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access campaign_flags" ON campaign_flags FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access weekly_notes" ON weekly_notes FOR ALL TO service_role USING (true);

-- Insert sample UAE events
INSERT INTO events_uae (name, start_date, end_date, status, impact_level, description) VALUES
  ('Ramadan', '2025-02-28', '2025-03-29', 'confirmed', 'high', 'Holy month - significant impact on buying patterns'),
  ('Eid Al Fitr', '2025-03-30', '2025-04-02', 'confirmed', 'high', 'End of Ramadan celebration'),
  ('Dubai Summer Surprises', '2025-06-28', '2025-09-03', 'tbc', 'medium', 'Annual summer shopping festival'),
  ('UAE National Day', '2025-12-02', '2025-12-03', 'confirmed', 'medium', 'National holiday celebrations'),
  ('White Friday', '2025-11-28', '2025-12-01', 'tbc', 'high', 'Black Friday equivalent - major sales event');
