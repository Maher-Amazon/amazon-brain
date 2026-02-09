/**
 * Amazon Brain - Supabase Sync Script
 *
 * This script syncs data from Amazon APIs to Supabase.
 * Run with: node scripts/sync-to-supabase.js
 *
 * Options:
 *   --orders    Sync orders data
 *   --ads       Sync advertising data (SP + SD campaigns)
 *   --targeting Sync target ASIN data (competitor/detail-page targeting)
 *   --inventory Sync inventory data (deprecated, use --products)
 *   --products  Sync products/SKUs with brand extraction
 *   --all       Sync everything
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
const syncTargeting = syncAll || args.includes('--targeting');
const syncInventory = args.includes('--inventory'); // deprecated
const syncProducts = syncAll || args.includes('--products');

// Cache for brand lookups (ASIN -> brand name)
const brandCache = {};
// Cache for brand IDs (brand name -> id)
const brandIdCache = {};

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

// Truncate title to max length (default 150 chars)
function truncateTitle(title, maxLen = 150) {
  if (!title) return '';
  if (title.length <= maxLen) return title;
  return title.substring(0, maxLen - 3) + '...';
}

// Get or create brand (with caching)
async function getOrCreateBrand(name) {
  // Check cache first
  if (brandIdCache[name]) {
    return brandIdCache[name];
  }

  const { data, error } = await supabase
    .from('brands')
    .select('id')
    .eq('name', name)
    .single();

  if (data) {
    brandIdCache[name] = data.id;
    return data.id;
  }

  const { data: newBrand, error: insertError } = await supabase
    .from('brands')
    .insert({ name, mode: 'growth' })
    .select('id')
    .single();

  if (insertError) {
    console.error('Error creating brand:', insertError);
    return null;
  }

  brandIdCache[name] = newBrand.id;
  return newBrand.id;
}

// Get or create SKU (and update if brand changed)
async function getOrCreateSku(sku, asin, title, brandId) {
  const truncatedTitle = truncateTitle(title);

  const { data, error } = await supabase
    .from('skus')
    .select('id, brand_id')
    .eq('sku', sku)
    .single();

  if (data) {
    // Update brand_id if it changed (e.g., from Default to real brand)
    if (brandId && data.brand_id !== brandId) {
      await supabase
        .from('skus')
        .update({ brand_id: brandId, asin, title: truncatedTitle })
        .eq('id', data.id);
    }
    return data.id;
  }

  const { data: newSku, error: insertError } = await supabase
    .from('skus')
    .insert({ sku, asin, title: truncatedTitle, brand_id: brandId })
    .select('id')
    .single();

  if (insertError) {
    console.error('Error creating SKU:', insertError);
    return null;
  }

  return newSku.id;
}

// Create SP-API client
function createSpClient() {
  const SellingPartner = require('amazon-sp-api');
  return new SellingPartner({
    region: 'eu',
    refresh_token: process.env.REFRESH_TOKEN,
    credentials: {
      SELLING_PARTNER_APP_CLIENT_ID: process.env.LWA_CLIENT_ID,
      SELLING_PARTNER_APP_CLIENT_SECRET: process.env.LWA_CLIENT_SECRET,
    },
  });
}

// Get brand for a SKU using Listings Items API (with attributes)
async function getBrandForSku(sp, sku) {
  // Check cache first (keyed by SKU)
  if (brandCache[sku]) {
    return brandCache[sku];
  }

  try {
    const listing = await sp.callAPI({
      operation: 'getListingsItem',
      endpoint: 'listingsItems',
      path: {
        sellerId: process.env.SELLER_ID,
        sku: sku,
      },
      query: {
        marketplaceIds: [process.env.MARKETPLACE_ID],
        includedData: ['attributes'],
      },
    });

    // Extract brand from attributes
    const brand = listing.attributes?.brand?.[0]?.value || 'Unknown';
    brandCache[sku] = brand;
    return brand;
  } catch (error) {
    // If API call fails, return Unknown
    brandCache[sku] = 'Unknown';
    return 'Unknown';
  }
}

// Get brands for multiple SKUs (sequential to avoid rate limits)
async function getBrandsForSkus(sp, skus) {
  let processed = 0;
  const total = skus.length;

  for (const sku of skus) {
    if (!brandCache[sku]) {
      await getBrandForSku(sp, sku);
      processed++;
      // Log progress every 10 SKUs
      if (processed % 10 === 0) {
        console.log(`  Processed ${processed}/${total} SKUs for brand lookup...`);
      }
    }
  }

  return brandCache;
}

// Get active listings from merchant listings report
async function getActiveListings(sp) {
  const report = await sp.downloadReport({
    body: {
      reportType: 'GET_MERCHANT_LISTINGS_ALL_DATA',
      marketplaceIds: [process.env.MARKETPLACE_ID],
    },
    interval: 8000,
    timeout: 120000,
  });

  let rows = [];
  if (Array.isArray(report)) {
    rows = report;
  } else if (typeof report === 'string') {
    const lines = report.split('\n').filter(l => l.trim());
    if (lines.length > 1) {
      const headers = lines[0].split('\t');
      rows = lines.slice(1).map(line => {
        const vals = line.split('\t');
        const obj = {};
        headers.forEach((h, i) => { obj[h.trim()] = vals[i]?.trim() || ''; });
        return obj;
      });
    }
  }

  return rows
    .filter(r => (r['status'] || '') === 'Active')
    .map(r => ({
      sku: r['seller-sku'] || r['sku'] || '',
      asin: r['asin1'] || r['asin'] || '',
      name: r['item-name'] || r['product-name'] || '',
      price: r['price'] || '',
      channel: r['fulfillment-channel'] || '',
      quantity: parseInt(r['quantity'] || r['afn-fulfillable-quantity'] || '0', 10),
    }));
}

// Sync products (SKUs with real brands) using Listings Items API
async function syncProductsData() {
  console.log('\n=== Syncing Products ===\n');

  try {
    const sp = createSpClient();

    // Step 1: Get all active listings from report
    console.log('Fetching merchant listings...');
    const listings = await getActiveListings(sp);
    console.log(`Found ${listings.length} active listing(s)`);

    if (listings.length === 0) {
      console.log('No active listings found');
      return;
    }

    // Step 2: Look up brands for each SKU using Listings Items API
    const skus = listings.map(l => l.sku).filter(Boolean);
    console.log(`Looking up brands for ${skus.length} SKU(s) using Listings Items API...`);
    await getBrandsForSkus(sp, skus);

    // Count brands found
    const uniqueBrands = [...new Set(Object.values(brandCache))];
    console.log(`Found ${uniqueBrands.length} unique brand(s): ${uniqueBrands.join(', ')}`);

    // Step 3: Create brands and SKUs in Supabase
    const weekStart = getWeekStart(new Date()).toISOString().split('T')[0];
    let created = 0;

    for (const listing of listings) {
      const brandName = brandCache[listing.sku] || 'Unknown';
      const brandId = await getOrCreateBrand(brandName);

      if (!brandId) {
        console.error(`Failed to get/create brand: ${brandName}`);
        continue;
      }

      const skuId = await getOrCreateSku(listing.sku, listing.asin, listing.name, brandId);
      if (!skuId) continue;

      // Update sku_week with stock level
      const stockDays = listing.quantity > 0 ? Math.min(listing.quantity / 2, 999) : 0;
      const { error } = await supabase.from('sku_week').upsert({
        sku_id: skuId,
        week_start: weekStart,
        stock_level: listing.quantity,
        stock_days: stockDays,
      }, { onConflict: 'sku_id,week_start' });

      if (error) {
        console.error('Error upserting SKU week:', error);
      }

      created++;
    }

    console.log(`Synced ${created} SKU(s) with real brands`);
  } catch (error) {
    console.error('Error syncing products:', error.message);
  }
}

// Sync orders using SP-API with real brand mapping
async function syncOrdersData() {
  console.log('\n=== Syncing Orders ===\n');

  try {
    const sp = createSpClient();

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
    const brandAggregates = {}; // brandId -> { revenue, units, orders }
    const skuAggregates = {}; // skuId -> { revenue, units, orders }

    // Collect all SKUs from order items to batch lookup brands
    const allSkus = new Set();
    const orderItemsMap = {}; // orderId -> items

    // First pass: get all order items and collect SKUs
    for (const order of orders.Orders || []) {
      try {
        const itemsRes = await sp.callAPI({
          operation: 'getOrderItems',
          endpoint: 'orders',
          path: { orderId: order.AmazonOrderId },
        });
        orderItemsMap[order.AmazonOrderId] = itemsRes.OrderItems || [];
        (itemsRes.OrderItems || []).forEach(item => {
          if (item.SellerSKU) allSkus.add(item.SellerSKU);
        });
      } catch (e) {
        console.error(`Error getting items for order ${order.AmazonOrderId}:`, e.message);
        orderItemsMap[order.AmazonOrderId] = [];
      }
    }

    // Lookup brands for all SKUs (uses cache populated by syncProductsData if run first)
    if (allSkus.size > 0) {
      const uncachedSkus = [...allSkus].filter(sku => !brandCache[sku]);
      if (uncachedSkus.length > 0) {
        console.log(`Looking up brands for ${uncachedSkus.length} SKU(s) from orders...`);
        await getBrandsForSkus(sp, uncachedSkus);
      }
    }

    // Second pass: aggregate by brand
    for (const order of orders.Orders || []) {
      const orderItems = orderItemsMap[order.AmazonOrderId] || [];

      for (const item of orderItems) {
        const asin = item.ASIN || '';
        const sku = item.SellerSKU || '';
        const quantity = item.QuantityOrdered || 0;
        const itemPrice = parseFloat(item.ItemPrice?.Amount || 0);
        const title = item.Title || '';

        // Get brand from cache (keyed by SKU, populated by syncProductsData or batch lookup)
        const brandName = brandCache[sku] || 'Unknown';
        const brandId = await getOrCreateBrand(brandName);

        if (!brandId) continue;

        // Aggregate by brand
        if (!brandAggregates[brandId]) {
          brandAggregates[brandId] = { revenue: 0, units: 0, orders: new Set() };
        }
        brandAggregates[brandId].revenue += itemPrice;
        brandAggregates[brandId].units += quantity;
        brandAggregates[brandId].orders.add(order.AmazonOrderId);

        // Create/update SKU and aggregate
        if (sku) {
          const skuId = await getOrCreateSku(sku, asin, title, brandId);
          if (skuId) {
            if (!skuAggregates[skuId]) {
              skuAggregates[skuId] = { revenue: 0, units: 0, orders: 0 };
            }
            skuAggregates[skuId].revenue += itemPrice;
            skuAggregates[skuId].units += quantity;
            skuAggregates[skuId].orders += 1;
          }
        }
      }
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
        orders: agg.orders.size, // Convert Set to count
      }, { onConflict: 'brand_id,week_start' });

      if (error) {
        console.error('Error upserting brand week:', error);
      }
    }

    // Upsert SKU weekly data (note: sku_week doesn't have 'orders' column)
    for (const [skuId, agg] of Object.entries(skuAggregates)) {
      const { error } = await supabase.from('sku_week').upsert({
        sku_id: skuId,
        week_start: weekStart,
        revenue: agg.revenue,
        units: agg.units,
      }, { onConflict: 'sku_id,week_start' });

      if (error) {
        console.error('Error upserting SKU week:', error);
      }
    }

    const brandNames = await Promise.all(
      Object.keys(brandAggregates).map(async id => {
        const { data } = await supabase.from('brands').select('name').eq('id', id).single();
        return data?.name || id;
      })
    );
    console.log(`Synced orders for ${Object.keys(brandAggregates).length} brand(s): ${brandNames.join(', ')}`);
    console.log(`Updated ${Object.keys(skuAggregates).length} SKU(s) with order data`);
  } catch (error) {
    console.error('Error syncing orders:', error.message);
  }
}

// Helper to get ads access token
async function getAdsAccessToken() {
  const https = require('https');

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

  return tokenResponse.access_token;
}

// Helper to get ads profile ID
async function getAdsProfileId(accessToken) {
  const https = require('https');

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
    return null;
  }

  return process.env.ADS_PROFILE_ID || profiles[0].profileId;
}

// Fetch SP campaigns
async function fetchSpCampaigns(accessToken, profileId) {
  const https = require('https');

  const response = await new Promise((resolve, reject) => {
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

  return (response.campaigns || []).map(c => ({ ...c, adType: 'SP' }));
}

// Fetch SD campaigns
async function fetchSdCampaigns(accessToken, profileId) {
  const https = require('https');

  const response = await new Promise((resolve, reject) => {
    const postData = JSON.stringify({});
    const req = https.request({
      hostname: 'advertising-api-eu.amazon.com',
      path: '/sd/campaigns/list',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': process.env.ADS_CLIENT_ID || process.env.LWA_CLIENT_ID,
        'Amazon-Advertising-API-Scope': profileId,
        'Content-Type': 'application/vnd.sdcampaign.v3+json',
        'Accept': 'application/vnd.sdcampaign.v3+json',
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

  return (response.campaigns || []).map(c => ({ ...c, adType: 'SD' }));
}

// Sync ads data (SP + SD campaigns)
async function syncAdsData() {
  console.log('\n=== Syncing Ads ===\n');

  try {
    const accessToken = await getAdsAccessToken();
    if (!accessToken) {
      console.error('Failed to get access token');
      return;
    }

    const profileId = await getAdsProfileId(accessToken);
    if (!profileId) {
      console.log('No advertising profiles found');
      return;
    }
    console.log(`Using profile ID: ${profileId}`);

    // Fetch SP and SD campaigns in parallel
    const [spCampaigns, sdCampaigns] = await Promise.all([
      fetchSpCampaigns(accessToken, profileId),
      fetchSdCampaigns(accessToken, profileId),
    ]);

    console.log(`Found ${spCampaigns.length} SP campaigns`);
    console.log(`Found ${sdCampaigns.length} SD campaigns`);

    const allCampaigns = [...spCampaigns, ...sdCampaigns];

    // Store campaigns
    const brandId = await getOrCreateBrand('Default');

    for (const campaign of allCampaigns) {
      const { error } = await supabase.from('campaigns').upsert({
        campaign_id: campaign.campaignId,
        brand_id: brandId,
        name: campaign.name,
        type: campaign.adType, // 'SP' or 'SD'
        state: campaign.state,
        budget: campaign.budget?.budget || 0,
        targeting_type: campaign.targetingType || campaign.tactic || null,
      }, { onConflict: 'campaign_id' });

      if (error) {
        console.error('Error upserting campaign:', error);
      }
    }

    console.log(`Synced ${allCampaigns.length} total campaigns (SP: ${spCampaigns.length}, SD: ${sdCampaigns.length})`);
  } catch (error) {
    console.error('Error syncing ads:', error.message);
  }
}

// Sync target ASIN data (competitor/detail-page targeting)
async function syncTargetingData() {
  console.log('\n=== Syncing Targeting Data ===\n');

  try {
    const accessToken = await getAdsAccessToken();
    if (!accessToken) {
      console.error('Failed to get access token');
      return;
    }

    const profileId = await getAdsProfileId(accessToken);
    if (!profileId) {
      console.log('No advertising profiles found');
      return;
    }

    const weekStart = getWeekStart(new Date()).toISOString().split('T')[0];
    const brandId = await getOrCreateBrand('Default');

    // Get SP product targeting report
    console.log('Fetching SP product targeting data...');
    const spTargetingData = await fetchSpTargetingReport(accessToken, profileId);
    console.log(`Found ${spTargetingData.length} SP targeting records`);

    // Get SD matched targets report
    console.log('Fetching SD matched targets data...');
    const sdTargetingData = await fetchSdTargetingReport(accessToken, profileId);
    console.log(`Found ${sdTargetingData.length} SD targeting records`);

    // Process SP targeting data
    for (const target of spTargetingData) {
      if (!target.targetAsin) continue;

      // Get campaign ID from our database
      let campaignId = null;
      if (target.campaignId) {
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('id')
          .eq('campaign_id', target.campaignId)
          .single();
        campaignId = campaign?.id;
      }

      const acos = target.sales > 0 ? (target.spend / target.sales) * 100 : 0;

      const { error } = await supabase.from('target_asin_week').upsert({
        target_asin: target.targetAsin,
        campaign_id: campaignId,
        brand_id: brandId,
        ad_type: 'SP',
        week_start: weekStart,
        impressions: target.impressions || 0,
        clicks: target.clicks || 0,
        spend: target.spend || 0,
        sales: target.sales || 0,
        orders: target.orders || 0,
        acos: acos,
      }, { onConflict: 'target_asin,campaign_id,ad_type,week_start' });

      if (error) {
        console.error('Error upserting SP target ASIN:', error);
      }
    }

    // Process SD targeting data
    for (const target of sdTargetingData) {
      if (!target.targetAsin) continue;

      let campaignId = null;
      if (target.campaignId) {
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('id')
          .eq('campaign_id', target.campaignId)
          .single();
        campaignId = campaign?.id;
      }

      const acos = target.sales > 0 ? (target.spend / target.sales) * 100 : 0;

      const { error } = await supabase.from('target_asin_week').upsert({
        target_asin: target.targetAsin,
        campaign_id: campaignId,
        brand_id: brandId,
        ad_type: 'SD',
        week_start: weekStart,
        impressions: target.impressions || 0,
        clicks: target.clicks || 0,
        spend: target.spend || 0,
        sales: target.sales || 0,
        orders: target.orders || 0,
        acos: acos,
      }, { onConflict: 'target_asin,campaign_id,ad_type,week_start' });

      if (error) {
        console.error('Error upserting SD target ASIN:', error);
      }
    }

    console.log(`Synced ${spTargetingData.length + sdTargetingData.length} targeting records`);
  } catch (error) {
    console.error('Error syncing targeting data:', error.message);
  }
}

// Fetch SP product targeting report data
async function fetchSpTargetingReport(accessToken, profileId) {
  const https = require('https');

  // Request report
  const reportResponse = await new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      reportDate: new Date().toISOString().split('T')[0],
      metrics: ['impressions', 'clicks', 'cost', 'sales14d', 'purchases14d'],
    });

    const req = https.request({
      hostname: 'advertising-api-eu.amazon.com',
      path: '/v2/sp/targets/report',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': process.env.ADS_CLIENT_ID || process.env.LWA_CLIENT_ID,
        'Amazon-Advertising-API-Scope': profileId,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ reportId: null });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  if (!reportResponse.reportId) {
    console.log('No SP targeting report available');
    return [];
  }

  // Poll for report completion and download
  const reportData = await downloadReport(accessToken, profileId, reportResponse.reportId);

  // Parse and filter for ASIN targets only
  return reportData
    .filter(r => r.targetingExpression && r.targetingExpression.includes('asin='))
    .map(r => {
      const asinMatch = r.targetingExpression.match(/asin="([A-Z0-9]+)"/);
      return {
        targetAsin: asinMatch ? asinMatch[1] : null,
        campaignId: r.campaignId,
        impressions: r.impressions || 0,
        clicks: r.clicks || 0,
        spend: r.cost || 0,
        sales: r.sales14d || 0,
        orders: r.purchases14d || 0,
      };
    })
    .filter(r => r.targetAsin);
}

// Fetch SD matched targets report data
async function fetchSdTargetingReport(accessToken, profileId) {
  const https = require('https');

  const reportResponse = await new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      reportDate: new Date().toISOString().split('T')[0],
      metrics: ['impressions', 'clicks', 'cost', 'sales', 'purchases'],
      tactic: 'T00020', // Product targeting tactic
    });

    const req = https.request({
      hostname: 'advertising-api-eu.amazon.com',
      path: '/sd/targets/report',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': process.env.ADS_CLIENT_ID || process.env.LWA_CLIENT_ID,
        'Amazon-Advertising-API-Scope': profileId,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ reportId: null });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  if (!reportResponse.reportId) {
    console.log('No SD targeting report available');
    return [];
  }

  const reportData = await downloadReport(accessToken, profileId, reportResponse.reportId);

  return reportData
    .filter(r => r.targetingExpression && r.targetingExpression.includes('asin'))
    .map(r => {
      const asinMatch = r.targetingExpression.match(/asin="([A-Z0-9]+)"/);
      return {
        targetAsin: asinMatch ? asinMatch[1] : null,
        campaignId: r.campaignId,
        impressions: r.impressions || 0,
        clicks: r.clicks || 0,
        spend: r.cost || 0,
        sales: r.sales || 0,
        orders: r.purchases || 0,
      };
    })
    .filter(r => r.targetAsin);
}

// Helper to download and decompress a report
async function downloadReport(accessToken, profileId, reportId, maxRetries = 10) {
  const https = require('https');
  const zlib = require('zlib');

  for (let i = 0; i < maxRetries; i++) {
    // Check report status
    const status = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'advertising-api-eu.amazon.com',
        path: `/v2/reports/${reportId}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': process.env.ADS_CLIENT_ID || process.env.LWA_CLIENT_ID,
          'Amazon-Advertising-API-Scope': profileId,
        },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({ status: 'FAILURE' });
          }
        });
      });
      req.on('error', reject);
      req.end();
    });

    if (status.status === 'SUCCESS' && status.location) {
      // Download the report
      const reportData = await new Promise((resolve, reject) => {
        https.get(status.location, (res) => {
          const chunks = [];
          res.on('data', chunk => chunks.push(chunk));
          res.on('end', () => {
            const buffer = Buffer.concat(chunks);
            // Try to decompress if gzipped
            try {
              const decompressed = zlib.gunzipSync(buffer);
              resolve(JSON.parse(decompressed.toString()));
            } catch (e) {
              // Not gzipped, parse directly
              try {
                resolve(JSON.parse(buffer.toString()));
              } catch (e2) {
                resolve([]);
              }
            }
          });
        }).on('error', reject);
      });

      return reportData;
    }

    if (status.status === 'FAILURE') {
      console.log('Report generation failed');
      return [];
    }

    // Wait before retrying
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log('Report download timed out');
  return [];
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

  // Sync products first to populate brand cache
  if (syncProducts) await syncProductsData();
  if (syncOrders) await syncOrdersData();
  if (syncAds) await syncAdsData();
  if (syncTargeting) await syncTargetingData();
  // Legacy inventory sync (deprecated, use --products instead)
  if (syncInventory) {
    console.log('\n⚠️  --inventory is deprecated. Use --products instead.');
    await syncInventoryData();
  }

  await updateSyncTime();

  console.log('\n✅ Sync complete!');
}

main().catch(console.error);
