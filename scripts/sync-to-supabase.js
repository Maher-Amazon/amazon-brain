/**
 * Amazon Brain - Supabase Sync Script
 *
 * This script syncs data from Amazon APIs to Supabase.
 * Run with: node scripts/sync-to-supabase.js
 *
 * Options:
 *   --orders   Sync orders data
 *   --ads      Sync advertising data
 *   --inventory Sync inventory data
 *   --all      Sync everything
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Parse command line arguments
const args = process.argv.slice(2);
const syncAll = args.includes('--all') || args.length === 0;
const syncOrders = syncAll || args.includes('--orders');
const syncAds = syncAll || args.includes('--ads');
const syncInventory = syncAll || args.includes('--inventory');

// Helper functions
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function removeVat(amount, vatRate = 5) {
  return amount / (1 + vatRate / 100);
}

// Get or create brand
async function getOrCreateBrand(name) {
  const { data, error } = await supabase
    .from('brands')
    .select('id')
    .eq('name', name)
    .single();

  if (data) return data.id;

  const { data: newBrand, error: insertError } = await supabase
    .from('brands')
    .insert({ name, mode: 'growth' })
    .select('id')
    .single();

  if (insertError) {
    console.error('Error creating brand:', insertError);
    return null;
  }

  return newBrand.id;
}

// Get or create SKU
async function getOrCreateSku(sku, asin, title, brandId) {
  const { data, error } = await supabase
    .from('skus')
    .select('id')
    .eq('sku', sku)
    .single();

  if (data) return data.id;

  const { data: newSku, error: insertError } = await supabase
    .from('skus')
    .insert({ sku, asin, title, brand_id: brandId })
    .select('id')
    .single();

  if (insertError) {
    console.error('Error creating SKU:', insertError);
    return null;
  }

  return newSku.id;
}

// Sync orders using SP-API
async function syncOrdersData() {
  console.log('\n=== Syncing Orders ===\n');

  try {
    const SellingPartner = require('amazon-sp-api');
    const sp = new SellingPartner({
      region: 'eu',
      refresh_token: process.env.REFRESH_TOKEN,
      credentials: {
        SELLING_PARTNER_APP_CLIENT_ID: process.env.LWA_CLIENT_ID,
        SELLING_PARTNER_APP_CLIENT_SECRET: process.env.LWA_CLIENT_SECRET,
      },
    });

    // Get orders from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const orders = await sp.callAPI({
      operation: 'getOrders',
      endpoint: 'orders',
      query: {
        MarketplaceIds: [process.env.MARKETPLACE_ID],
        CreatedAfter: sevenDaysAgo.toISOString(),
        OrderStatuses: ['Shipped', 'Unshipped', 'PartiallyShipped'],
      },
    });

    console.log(`Found ${orders.Orders?.length || 0} orders`);

    const weekStart = getWeekStart(new Date()).toISOString().split('T')[0];
    const brandAggregates = {};

    for (const order of orders.Orders || []) {
      const total = parseFloat(order.OrderTotal?.Amount || 0);
      const units = (order.NumberOfItemsShipped || 0) + (order.NumberOfItemsUnshipped || 0);

      // For now, aggregate to a default brand
      // In production, you'd match SKUs to brands
      const brandId = await getOrCreateBrand('Default');

      if (!brandAggregates[brandId]) {
        brandAggregates[brandId] = { revenue: 0, units: 0, orders: 0 };
      }
      brandAggregates[brandId].revenue += total;
      brandAggregates[brandId].units += units;
      brandAggregates[brandId].orders += 1;
    }

    // Upsert brand weekly data
    for (const [brandId, agg] of Object.entries(brandAggregates)) {
      const revenueExVat = removeVat(agg.revenue);

      const { error } = await supabase.from('brand_week').upsert({
        brand_id: brandId,
        week_start: weekStart,
        revenue: agg.revenue,
        revenue_ex_vat: revenueExVat,
        units: agg.units,
        orders: agg.orders,
      }, { onConflict: 'brand_id,week_start' });

      if (error) {
        console.error('Error upserting brand week:', error);
      }
    }

    console.log(`Synced ${Object.keys(brandAggregates).length} brand(s)`);
  } catch (error) {
    console.error('Error syncing orders:', error.message);
  }
}

// Sync ads data
async function syncAdsData() {
  console.log('\n=== Syncing Ads ===\n');

  try {
    const https = require('https');
    const zlib = require('zlib');

    // Get access token
    const tokenResponse = await new Promise((resolve, reject) => {
      const postData = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: process.env.ADS_REFRESH_TOKEN || process.env.REFRESH_TOKEN,
        client_id: process.env.ADS_CLIENT_ID || process.env.LWA_CLIENT_ID,
        client_secret: process.env.ADS_CLIENT_SECRET || process.env.LWA_CLIENT_SECRET,
      }).toString();

      const req = https.request({
        hostname: 'api.amazon.com',
        path: '/auth/o2/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
        },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    const accessToken = tokenResponse.access_token;
    if (!accessToken) {
      console.error('Failed to get access token');
      return;
    }

    // Get profiles
    const profiles = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'advertising-api-eu.amazon.com',
        path: '/v2/profiles',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': process.env.ADS_CLIENT_ID || process.env.LWA_CLIENT_ID,
        },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.end();
    });

    if (!profiles || profiles.length === 0) {
      console.log('No advertising profiles found');
      return;
    }

    const profileId = process.env.ADS_PROFILE_ID || profiles[0].profileId;
    console.log(`Using profile ID: ${profileId}`);

    // Get campaigns
    const campaignsResponse = await new Promise((resolve, reject) => {
      const postData = JSON.stringify({});
      const req = https.request({
        hostname: 'advertising-api-eu.amazon.com',
        path: '/sp/campaigns/list',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': process.env.ADS_CLIENT_ID || process.env.LWA_CLIENT_ID,
          'Amazon-Advertising-API-Scope': profileId,
          'Content-Type': 'application/vnd.spCampaign.v3+json',
          'Accept': 'application/vnd.spCampaign.v3+json',
          'Content-Length': Buffer.byteLength(postData),
        },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({ campaigns: [] });
          }
        });
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    const campaigns = campaignsResponse.campaigns || [];
    console.log(`Found ${campaigns.length} campaigns`);

    // Store campaigns
    const brandId = await getOrCreateBrand('Default');

    for (const campaign of campaigns) {
      const { error } = await supabase.from('campaigns').upsert({
        campaign_id: campaign.campaignId,
        brand_id: brandId,
        name: campaign.name,
        type: 'SP',
        state: campaign.state,
        budget: campaign.budget?.budget || 0,
        targeting_type: campaign.targetingType,
      }, { onConflict: 'campaign_id' });

      if (error) {
        console.error('Error upserting campaign:', error);
      }
    }

    console.log(`Synced ${campaigns.length} campaigns`);
  } catch (error) {
    console.error('Error syncing ads:', error.message);
  }
}

// Sync inventory data
async function syncInventoryData() {
  console.log('\n=== Syncing Inventory ===\n');

  try {
    const SellingPartner = require('amazon-sp-api');
    const sp = new SellingPartner({
      region: 'eu',
      refresh_token: process.env.REFRESH_TOKEN,
      credentials: {
        SELLING_PARTNER_APP_CLIENT_ID: process.env.LWA_CLIENT_ID,
        SELLING_PARTNER_APP_CLIENT_SECRET: process.env.LWA_CLIENT_SECRET,
      },
    });

    // Get FBA inventory report
    const report = await sp.downloadReport({
      body: {
        reportType: 'GET_FBA_MYI_UNSUPPRESSED_INVENTORY_DATA',
        marketplaceIds: [process.env.MARKETPLACE_ID],
      },
      interval: 8000,
      timeout: 120000,
    });

    if (!report || (Array.isArray(report) && report.length === 0)) {
      console.log('No inventory data returned');
      return;
    }

    let rows = report;
    if (typeof report === 'string') {
      const lines = report.split('\n').filter(l => l.trim());
      if (lines.length <= 1) {
        console.log('No inventory items found');
        return;
      }
      const headers = lines[0].split('\t');
      rows = lines.slice(1).map(line => {
        const vals = line.split('\t');
        const obj = {};
        headers.forEach((h, i) => { obj[h.trim()] = vals[i]?.trim() || ''; });
        return obj;
      });
    }

    console.log(`Found ${rows.length} inventory items`);

    const weekStart = getWeekStart(new Date()).toISOString().split('T')[0];
    const brandId = await getOrCreateBrand('Default');

    for (const item of rows) {
      const sku = item['sku'] || item['seller-sku'] || '';
      const asin = item['asin'] || '';
      const title = item['product-name'] || '';
      const fulfillable = parseInt(item['afn-fulfillable-quantity'] || 0, 10);

      if (!sku) continue;

      const skuId = await getOrCreateSku(sku, asin, title, brandId);
      if (!skuId) continue;

      // Estimate stock days (would need sales velocity in production)
      const stockDays = fulfillable > 0 ? Math.min(fulfillable / 2, 999) : 0;

      const { error } = await supabase.from('sku_week').upsert({
        sku_id: skuId,
        week_start: weekStart,
        stock_level: fulfillable,
        stock_days: stockDays,
      }, { onConflict: 'sku_id,week_start' });

      if (error) {
        console.error('Error upserting SKU week:', error);
      }
    }

    console.log(`Synced inventory for ${rows.length} SKUs`);
  } catch (error) {
    console.error('Error syncing inventory:', error.message);
  }
}

// Update last sync timestamp
async function updateSyncTime() {
  await supabase
    .from('account_settings')
    .update({ last_sync_at: new Date().toISOString() })
    .not('id', 'is', null);
}

// Main
async function main() {
  console.log('Amazon Brain - Data Sync');
  console.log('========================');

  if (syncOrders) await syncOrdersData();
  if (syncAds) await syncAdsData();
  if (syncInventory) await syncInventoryData();

  await updateSyncTime();

  console.log('\n✅ Sync complete!');
}

main().catch(console.error);
