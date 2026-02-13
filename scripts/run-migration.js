/**
 * Run database migrations for search terms and targeting tables
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running database migrations...\n');

  // 1. Check if target_asin_week table exists
  console.log('1. Checking target_asin_week table...');
  const { data: tables } = await supabase
    .from('target_asin_week')
    .select('id')
    .limit(1);

  if (tables === null) {
    console.log('   Table does not exist - needs to be created in Supabase SQL Editor');
    console.log('   The Supabase JS client cannot create tables directly.');
    console.log('   Please run the SQL from database/migration-004-fix-missing-tables.sql');
  } else {
    console.log('   ✓ Table exists');
  }

  // 2. Test searchterm_week upsert
  console.log('\n2. Testing searchterm_week unique constraint...');
  const testTerm = '__migration_test__';
  const testWeek = '2020-01-06';

  // Try to upsert - if constraint is missing, this will fail
  const { error: upsertError } = await supabase
    .from('searchterm_week')
    .upsert({
      term: testTerm,
      campaign_id: null,
      brand_id: null,
      week_start: testWeek,
      impressions: 0,
      clicks: 0,
      spend: 0,
      sales: 0,
      orders: 0,
      acos: 0,
    }, { onConflict: 'term,campaign_id,week_start' });

  if (upsertError && upsertError.code === '42P10') {
    console.log('   ✗ Unique constraint missing - needs to be added in Supabase SQL Editor');
    console.log('   Run: ALTER TABLE searchterm_week ADD CONSTRAINT searchterm_week_unique UNIQUE (term, campaign_id, week_start);');
  } else if (upsertError) {
    console.log('   Error:', upsertError.message);
  } else {
    console.log('   ✓ Constraint exists');
    // Clean up test record
    await supabase.from('searchterm_week').delete().eq('term', testTerm);
  }

  console.log('\n---');
  console.log('Note: Supabase JS client cannot run DDL (CREATE TABLE, ALTER TABLE).');
  console.log('You must run the SQL directly in Supabase SQL Editor.');
  console.log('\nSQL to run:');
  console.log(`
-- 1. Create target_asin_week table
CREATE TABLE IF NOT EXISTS target_asin_week (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_asin VARCHAR(20) NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  ad_type VARCHAR(10) NOT NULL,
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

ALTER TABLE target_asin_week ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON target_asin_week FOR ALL TO service_role USING (true);

-- 2. Add searchterm constraint (ignore error if exists)
ALTER TABLE searchterm_week ADD CONSTRAINT searchterm_week_unique UNIQUE (term, campaign_id, week_start);
`);
}

runMigration().catch(console.error);
