/**
 * Amazon Brain - Supabase Sync Script
 *
 * This script syncs data from Amazon APIs to Supabase.
 * Run with: node scripts/sync-to-supabase.js
 *
 * Options:
 *   --orders      Sync orders data
 *   --ads         Sync advertising data (SP + SD campaigns)
 *   --targeting   Sync target ASIN data (competitor/detail-page targeting)
 *   --searchterms Sync search term report data
 *   --inventory   Sync inventory data (deprecated, use --products)
 *   --products    Sync products/SKUs with brand extraction
 *   --all         Sync everything
 *   --days=N      Number of days to sync (default: 90, max 60 for ads data)
 *
 * Examples:
 *   node scripts/sync-to-supabase.js --all --days=90
 *   node scripts/sync-to-supabase.js --orders --days=30
 *   SYNC_DAYS_BACK=90 node scripts/sync-to-supabase.js --all
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
const syncSearchTerms = syncAll || args.includes('--searchterms');

// Parse --days=N argument (default to env var or 90 days)
const daysArg = args.find(a => a.startsWith('--days='));
const syncDaysBack = daysArg
  ? parseInt(daysArg.split('=')[1], 10)
  : parseInt(process.env.SYNC_DAYS_BACK || '90', 10);

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
  console.log(`Fetching orders from the last ${syncDaysBack} days...`);

  try {
    const sp = createSpClient();

    // Get orders from the configured date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - syncDaysBack);

    // Fetch all orders with pagination
    let allOrders = [];
    let nextToken = null;

    do {
      const query = {
        MarketplaceIds: [process.env.MARKETPLACE_ID],
        CreatedAfter: startDate.toISOString(),
        OrderStatuses: ['Shipped', 'Unshipped', 'PartiallyShipped'],
      };

      if (nextToken) {
        query.NextToken = nextToken;
      }

      const response = await sp.callAPI({
        operation: 'getOrders',
        endpoint: 'orders',
        query,
      });

      const orders = response.Orders || [];
      allOrders = allOrders.concat(orders);
      nextToken = response.NextToken;

      if (nextToken) {
        console.log(`  Fetched ${allOrders.length} orders so far, getting more...`);
      }
    } while (nextToken);

    const orders = { Orders: allOrders };
    console.log(`Found ${orders.Orders?.length || 0} orders total`);

    // Aggregates by week: { weekStart -> { brandId -> { revenue, units, orders } } }
    const brandWeekAggregates = {};
    // Aggregates by week: { weekStart -> { skuId -> { revenue, units } } }
    const skuWeekAggregates = {};

    // Collect all SKUs from order items to batch lookup brands
    const allSkus = new Set();
    const orderItemsMap = {}; // orderId -> items
    const orderDatesMap = {}; // orderId -> purchaseDate

    // First pass: get all order items and collect SKUs
    const totalOrders = (orders.Orders || []).length;
    let processedOrders = 0;
    console.log(`Fetching order items for ${totalOrders} orders (this may take a while)...`);

    for (const order of orders.Orders || []) {
      orderDatesMap[order.AmazonOrderId] = order.PurchaseDate;
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

      processedOrders++;
      if (processedOrders % 100 === 0 || processedOrders === totalOrders) {
        console.log(`  Processed order items: ${processedOrders}/${totalOrders}`);
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

    // Second pass: aggregate by brand and week
    for (const order of orders.Orders || []) {
      const orderItems = orderItemsMap[order.AmazonOrderId] || [];
      const orderDate = new Date(orderDatesMap[order.AmazonOrderId] || new Date());
      const weekStart = getWeekStart(orderDate).toISOString().split('T')[0];

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

        // Initialize week aggregates if needed
        if (!brandWeekAggregates[weekStart]) {
          brandWeekAggregates[weekStart] = {};
        }
        if (!brandWeekAggregates[weekStart][brandId]) {
          brandWeekAggregates[weekStart][brandId] = { revenue: 0, units: 0, orders: new Set() };
        }
        brandWeekAggregates[weekStart][brandId].revenue += itemPrice;
        brandWeekAggregates[weekStart][brandId].units += quantity;
        brandWeekAggregates[weekStart][brandId].orders.add(order.AmazonOrderId);

        // Create/update SKU and aggregate by week
        if (sku) {
          const skuId = await getOrCreateSku(sku, asin, title, brandId);
          if (skuId) {
            if (!skuWeekAggregates[weekStart]) {
              skuWeekAggregates[weekStart] = {};
            }
            if (!skuWeekAggregates[weekStart][skuId]) {
              skuWeekAggregates[weekStart][skuId] = { revenue: 0, units: 0 };
            }
            skuWeekAggregates[weekStart][skuId].revenue += itemPrice;
            skuWeekAggregates[weekStart][skuId].units += quantity;
          }
        }
      }
    }

    // Upsert brand weekly data for each week
    const weeksProcessed = Object.keys(brandWeekAggregates);
    console.log(`Processing ${weeksProcessed.length} week(s) of brand data...`);

    for (const [weekStart, brands] of Object.entries(brandWeekAggregates)) {
      for (const [brandId, agg] of Object.entries(brands)) {
        const revenueExVat = removeVat(agg.revenue);

        const { error } = await supabase.from('brand_week').upsert({
          brand_id: brandId,
          week_start: weekStart,
          revenue: agg.revenue,
          revenue_ex_vat: revenueExVat,
          units: agg.units,
          orders: agg.orders.size,
        }, { onConflict: 'brand_id,week_start' });

        if (error) {
          console.error('Error upserting brand week:', error);
        }
      }
    }

    // Upsert SKU weekly data for each week
    for (const [weekStart, skus] of Object.entries(skuWeekAggregates)) {
      for (const [skuId, agg] of Object.entries(skus)) {
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
    }

    // Get unique brands across all weeks
    const allBrandIds = new Set();
    for (const brands of Object.values(brandWeekAggregates)) {
      Object.keys(brands).forEach(id => allBrandIds.add(id));
    }
    const brandNames = await Promise.all(
      [...allBrandIds].map(async id => {
        const { data } = await supabase.from('brands').select('name').eq('id', id).single();
        return data?.name || id;
      })
    );

    // Count total SKUs across all weeks
    const allSkuIds = new Set();
    for (const skus of Object.values(skuWeekAggregates)) {
      Object.keys(skus).forEach(id => allSkuIds.add(id));
    }

    console.log(`Synced ${weeksProcessed.length} week(s) of orders for ${allBrandIds.size} brand(s): ${brandNames.join(', ')}`);
    console.log(`Updated ${allSkuIds.size} SKU(s) with order data`);
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

    // Store campaigns - preserve existing brand assignments
    const defaultBrandId = await getOrCreateBrand('Default');

    // Get existing campaigns to preserve brand assignments
    const { data: existingCampaigns } = await supabase
      .from('campaigns')
      .select('campaign_id, brand_id');

    const existingBrandMap = {};
    for (const c of existingCampaigns || []) {
      existingBrandMap[c.campaign_id] = c.brand_id;
    }

    for (const campaign of allCampaigns) {
      // Preserve existing brand_id if set, otherwise use default
      const campaignBrandId = existingBrandMap[campaign.campaignId] || defaultBrandId;

      const { error } = await supabase.from('campaigns').upsert({
        campaign_id: campaign.campaignId,
        brand_id: campaignBrandId,
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

    // Now fetch campaign performance data and aggregate to brand_week
    await syncCampaignPerformance(accessToken, profileId);
  } catch (error) {
    console.error('Error syncing ads:', error.message);
  }
}

// Sync campaign performance data and aggregate to brand_week
async function syncCampaignPerformance(accessToken, profileId) {
  console.log('\nFetching campaign performance data...');

  // Use 14-day chunks for faster report generation (31 days often times out)
  const maxAdsDays = Math.min(syncDaysBack, 60);
  const chunkSize = 7; // Reduced from 14 to minimize report generation time

  let allPerformanceData = [];

  // Fetch in 31-day chunks
  for (let daysBack = 0; daysBack < maxAdsDays; daysBack += chunkSize) {
    const chunkEnd = new Date();
    chunkEnd.setDate(chunkEnd.getDate() - daysBack);

    const chunkStart = new Date();
    chunkStart.setDate(chunkStart.getDate() - Math.min(daysBack + chunkSize, maxAdsDays));

    if (chunkStart >= chunkEnd) break;

    console.log(`  Requesting performance data: ${chunkStart.toISOString().split('T')[0]} to ${chunkEnd.toISOString().split('T')[0]}`);

    const chunkData = await fetchCampaignPerformanceReport(accessToken, profileId, chunkStart, chunkEnd);
    allPerformanceData = allPerformanceData.concat(chunkData);
  }

  console.log(`Found ${allPerformanceData.length} campaign performance records`);

  if (allPerformanceData.length === 0) {
    console.log('No campaign performance data to aggregate');
    return;
  }

  // Get campaign -> brand mapping from database
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('campaign_id, brand_id');

  const campaignBrandMap = {};
  for (const c of campaigns || []) {
    campaignBrandMap[c.campaign_id] = c.brand_id;
  }

  // Aggregate by brand and week
  const brandWeekAggregates = {}; // { `${brandId}-${weekStart}` -> { spend, sales, impressions, clicks } }

  // Debug: log first few records and mapping
  console.log('Sample performance records:');
  for (let i = 0; i < Math.min(3, allPerformanceData.length); i++) {
    const r = allPerformanceData[i];
    console.log(`  campaignId: ${r.campaignId} (type: ${typeof r.campaignId}), spend: ${r.spend}, sales: ${r.sales}`);
  }
  console.log(`Campaign-brand map has ${Object.keys(campaignBrandMap).length} entries`);

  let unmappedCount = 0;
  for (const record of allPerformanceData) {
    const brandId = campaignBrandMap[record.campaignId] || campaignBrandMap[String(record.campaignId)];
    if (!brandId) {
      unmappedCount++;
      if (unmappedCount <= 3) {
        console.log(`  Unmapped campaign: ${record.campaignId}`);
      }
      continue;
    }

    const recordDate = record.date ? new Date(record.date) : new Date();
    const weekStart = getWeekStart(recordDate).toISOString().split('T')[0];
    const key = `${brandId}-${weekStart}`;

    if (!brandWeekAggregates[key]) {
      brandWeekAggregates[key] = {
        brand_id: brandId,
        week_start: weekStart,
        ad_spend: 0,
        ad_sales: 0,
        impressions: 0,
        clicks: 0,
      };
    }

    brandWeekAggregates[key].ad_spend += record.spend || 0;
    brandWeekAggregates[key].ad_sales += record.sales || 0;
    brandWeekAggregates[key].impressions += record.impressions || 0;
    brandWeekAggregates[key].clicks += record.clicks || 0;
  }

  console.log(`Total unmapped campaigns: ${unmappedCount}`);

  // Update brand_week with ad metrics
  const aggregates = Object.values(brandWeekAggregates);
  console.log(`Updating ${aggregates.length} brand-week records with ad metrics...`);

  for (const agg of aggregates) {
    console.log(`  Processing: brand_id=${agg.brand_id}, week_start=${agg.week_start}, ad_spend=${agg.ad_spend}, ad_sales=${agg.ad_sales}`);

    // First get the existing brand_week record to calculate TACoS
    const { data: existing, error: selectError } = await supabase
      .from('brand_week')
      .select('id, revenue')
      .eq('brand_id', agg.brand_id)
      .eq('week_start', agg.week_start)
      .single();

    if (selectError) {
      console.log(`    No existing record found: ${selectError.message}`);
      continue;
    }

    console.log(`    Found existing record id=${existing.id}, revenue=${existing.revenue}`);

    const revenue = existing?.revenue || 0;
    const tacos = revenue > 0 ? (agg.ad_spend / revenue) * 100 : 0;
    const acos = agg.ad_sales > 0 ? (agg.ad_spend / agg.ad_sales) * 100 : 0;

    const { error, count } = await supabase
      .from('brand_week')
      .update({
        ad_spend: agg.ad_spend,
        ad_sales: agg.ad_sales,
        impressions: agg.impressions,
        clicks: agg.clicks,
        tacos: tacos,
        acos: acos,
      })
      .eq('brand_id', agg.brand_id)
      .eq('week_start', agg.week_start);

    if (error) {
      console.error('    Error updating brand_week with ad metrics:', error);
    } else {
      console.log(`    Updated successfully`);
    }
  }

  console.log(`Updated ${aggregates.length} brand-week records with ad performance data`);

  // Also sync SKU-level ad data
  await syncSkuAdPerformance(accessToken, profileId);
}

// Sync SKU-level ad performance data to sku_week
async function syncSkuAdPerformance(accessToken, profileId) {
  console.log('\nFetching SKU-level ad performance data...');

  const maxAdsDays = Math.min(syncDaysBack, 60);
  const chunkSize = 7;

  let allSkuAdData = [];

  // Fetch in 7-day chunks
  for (let daysBack = 0; daysBack < maxAdsDays; daysBack += chunkSize) {
    const chunkEnd = new Date();
    chunkEnd.setDate(chunkEnd.getDate() - daysBack);

    const chunkStart = new Date();
    chunkStart.setDate(chunkStart.getDate() - Math.min(daysBack + chunkSize, maxAdsDays));

    if (chunkStart >= chunkEnd) break;

    console.log(`  Requesting SKU ad data: ${chunkStart.toISOString().split('T')[0]} to ${chunkEnd.toISOString().split('T')[0]}`);

    const chunkData = await fetchSkuAdReport(accessToken, profileId, chunkStart, chunkEnd);
    allSkuAdData = allSkuAdData.concat(chunkData);
  }

  console.log(`Found ${allSkuAdData.length} SKU ad performance records`);

  if (allSkuAdData.length === 0) {
    console.log('No SKU ad data to aggregate');
    return;
  }

  // Get SKU mappings from database (ASIN -> sku_id)
  const { data: skus } = await supabase.from('skus').select('id, asin');
  const asinToSkuId = {};
  for (const sku of skus || []) {
    asinToSkuId[sku.asin] = sku.id;
  }

  // Aggregate by SKU and week
  const skuWeekAggregates = {}; // { `${skuId}-${weekStart}` -> { spend, sales } }

  let unmappedCount = 0;
  for (const record of allSkuAdData) {
    const skuId = asinToSkuId[record.asin];
    if (!skuId) {
      unmappedCount++;
      continue;
    }

    const recordDate = record.date ? new Date(record.date) : new Date();
    const weekStart = getWeekStart(recordDate).toISOString().split('T')[0];
    const key = `${skuId}-${weekStart}`;

    if (!skuWeekAggregates[key]) {
      skuWeekAggregates[key] = {
        sku_id: skuId,
        week_start: weekStart,
        ad_spend: 0,
        ad_sales: 0,
        impressions: 0,
        clicks: 0,
        ad_orders: 0,
      };
    }

    skuWeekAggregates[key].ad_spend += record.spend || 0;
    skuWeekAggregates[key].ad_sales += record.sales || 0;
    skuWeekAggregates[key].impressions += record.impressions || 0;
    skuWeekAggregates[key].clicks += record.clicks || 0;
    skuWeekAggregates[key].ad_orders += record.orders || 0;
  }

  if (unmappedCount > 0) {
    console.log(`  ${unmappedCount} records with unmapped ASINs (not in skus table)`);
  }

  // Update sku_week with ad metrics
  const aggregates = Object.values(skuWeekAggregates);
  console.log(`Updating ${aggregates.length} SKU-week records with ad metrics...`);

  let updated = 0;
  for (const agg of aggregates) {
    // First get existing revenue to calculate TACoS
    const { data: existing } = await supabase
      .from('sku_week')
      .select('id, revenue')
      .eq('sku_id', agg.sku_id)
      .eq('week_start', agg.week_start)
      .single();

    const revenue = existing?.revenue || 0;
    const tacos = revenue > 0 ? (agg.ad_spend / revenue) * 100 : 0;
    const acos = agg.ad_sales > 0 ? (agg.ad_spend / agg.ad_sales) * 100 : 0;

    // Calculate derived metrics
    const ctr = agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0;
    const cpc = agg.clicks > 0 ? agg.ad_spend / agg.clicks : 0;
    const cvr = agg.clicks > 0 ? (agg.ad_orders / agg.clicks) * 100 : 0;

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('sku_week')
        .update({
          ad_spend: agg.ad_spend,
          ad_sales: agg.ad_sales,
          impressions: agg.impressions,
          clicks: agg.clicks,
          ad_orders: agg.ad_orders,
          tacos: tacos,
          acos: acos,
          ctr: ctr,
          cpc: cpc,
          cvr: cvr,
        })
        .eq('sku_id', agg.sku_id)
        .eq('week_start', agg.week_start);

      if (!error) updated++;
    } else {
      // Create new record if it doesn't exist
      const { error } = await supabase.from('sku_week').upsert({
        sku_id: agg.sku_id,
        week_start: agg.week_start,
        ad_spend: agg.ad_spend,
        ad_sales: agg.ad_sales,
        impressions: agg.impressions,
        clicks: agg.clicks,
        ad_orders: agg.ad_orders,
        tacos: tacos,
        acos: acos,
        ctr: ctr,
        cpc: cpc,
        cvr: cvr,
      }, { onConflict: 'sku_id,week_start' });

      if (!error) updated++;
    }
  }

  console.log(`Updated ${updated} SKU-week records with ad data`);
}

// Fetch SKU-level ad report (Advertised Product report)
async function fetchSkuAdReport(accessToken, profileId, startDate, endDate) {
  const https = require('https');

  const formatDate = (d) => d.toISOString().split('T')[0];

  // Request SP Advertised Product report
  const reportRequest = {
    name: 'SP Advertised Product Report',
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    configuration: {
      adProduct: 'SPONSORED_PRODUCTS',
      groupBy: ['advertiser'],
      columns: [
        'date',
        'advertisedAsin',
        'advertisedSku',
        'campaignId',
        'impressions',
        'clicks',
        'cost',
        'sales14d',
        'purchases14d',
      ],
      reportTypeId: 'spAdvertisedProduct',
      timeUnit: 'DAILY',
      format: 'GZIP_JSON',
    },
  };

  const reportResponse = await new Promise((resolve, reject) => {
    const postData = JSON.stringify(reportRequest);
    const req = https.request({
      hostname: 'advertising-api-eu.amazon.com',
      path: '/reporting/reports',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': process.env.ADS_CLIENT_ID || process.env.LWA_CLIENT_ID,
        'Amazon-Advertising-API-Scope': profileId,
        'Content-Type': 'application/vnd.createasyncreportrequest.v3+json',
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
    console.log('    No SKU ad report ID returned. Response:', JSON.stringify(reportResponse));
    return [];
  }

  console.log(`    SKU Ad Report ID: ${reportResponse.reportId}, polling...`);

  const reportData = await downloadReportV3(accessToken, profileId, reportResponse.reportId, 90);

  // Transform to our format
  return reportData.map(r => ({
    date: r.date,
    asin: r.advertisedAsin,
    sku: r.advertisedSku,
    campaignId: r.campaignId,
    impressions: r.impressions || 0,
    clicks: r.clicks || 0,
    spend: r.cost || 0,
    sales: r.sales14d || 0,
    orders: r.purchases14d || 0,
  }));
}

// Fetch campaign performance report from Ads API
async function fetchCampaignPerformanceReport(accessToken, profileId, startDate, endDate) {
  const https = require('https');

  const formatDate = (d) => d.toISOString().split('T')[0];

  // Request SP campaign report using v3 reporting API
  const reportRequest = {
    name: 'SP Campaign Performance Report',
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    configuration: {
      adProduct: 'SPONSORED_PRODUCTS',
      groupBy: ['campaign'],
      columns: [
        'date',
        'campaignId',
        'campaignName',
        'impressions',
        'clicks',
        'cost',
        'sales14d',
      ],
      reportTypeId: 'spCampaigns',
      timeUnit: 'DAILY',
      format: 'GZIP_JSON',
    },
  };

  const reportResponse = await new Promise((resolve, reject) => {
    const postData = JSON.stringify(reportRequest);
    const req = https.request({
      hostname: 'advertising-api-eu.amazon.com',
      path: '/reporting/reports',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': process.env.ADS_CLIENT_ID || process.env.LWA_CLIENT_ID,
        'Amazon-Advertising-API-Scope': profileId,
        'Content-Type': 'application/vnd.createasyncreportrequest.v3+json',
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
    console.log('    No campaign performance report ID returned');
    return [];
  }

  console.log(`    Report ID: ${reportResponse.reportId}, polling for completion...`);

  // Poll for report completion using v3 API with extended timeout for performance reports
  const reportData = await downloadReportV3(accessToken, profileId, reportResponse.reportId, 90);

  // Transform to our format
  return reportData.map(r => ({
    date: r.date,
    campaignId: r.campaignId,
    impressions: r.impressions || 0,
    clicks: r.clicks || 0,
    spend: r.cost || 0,
    sales: r.sales14d || 0,
  }));
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

    const brandId = await getOrCreateBrand('Default');

    // Use 14-day chunks like search terms (v3 API with date ranges)
    const maxAdsDays = Math.min(syncDaysBack, 60);
    const chunkSize = 14;

    let allSpTargetingData = [];
    let allSdTargetingData = [];

    // Fetch in 14-day chunks
    for (let daysBack = 0; daysBack < maxAdsDays; daysBack += chunkSize) {
      const chunkEnd = new Date();
      chunkEnd.setDate(chunkEnd.getDate() - daysBack);

      const chunkStart = new Date();
      chunkStart.setDate(chunkStart.getDate() - Math.min(daysBack + chunkSize, maxAdsDays));

      if (chunkStart >= chunkEnd) break;

      console.log(`  Requesting targeting data: ${chunkStart.toISOString().split('T')[0]} to ${chunkEnd.toISOString().split('T')[0]}`);

      // Fetch SP and SD targeting in parallel for this chunk
      const [spChunkData, sdChunkData] = await Promise.all([
        fetchSpTargetingReport(accessToken, profileId, chunkStart, chunkEnd),
        fetchSdTargetingReport(accessToken, profileId, chunkStart, chunkEnd),
      ]);

      allSpTargetingData = allSpTargetingData.concat(spChunkData);
      allSdTargetingData = allSdTargetingData.concat(sdChunkData);
    }

    console.log(`Found ${allSpTargetingData.length} SP targeting records total`);
    console.log(`Found ${allSdTargetingData.length} SD targeting records total`);

    // Aggregate by week and upsert
    const processTargetingData = async (targetingData, adType) => {
      // Aggregate by week, target ASIN, and campaign
      const weekAggregates = {}; // { `${weekStart}|${targetAsin}|${campaignId}` -> data }

      for (const target of targetingData) {
        if (!target.targetAsin) continue;

        const recordDate = target.date ? new Date(target.date) : new Date();
        const weekStart = getWeekStart(recordDate).toISOString().split('T')[0];
        const key = `${weekStart}|${target.targetAsin}|${target.campaignId || 'unknown'}`;

        if (!weekAggregates[key]) {
          weekAggregates[key] = {
            weekStart,
            targetAsin: target.targetAsin,
            campaignId: target.campaignId,
            impressions: 0,
            clicks: 0,
            spend: 0,
            sales: 0,
            orders: 0,
          };
        }

        weekAggregates[key].impressions += target.impressions || 0;
        weekAggregates[key].clicks += target.clicks || 0;
        weekAggregates[key].spend += target.spend || 0;
        weekAggregates[key].sales += target.sales || 0;
        weekAggregates[key].orders += target.orders || 0;
      }

      // Upsert aggregated data
      let upserted = 0;
      for (const data of Object.values(weekAggregates)) {
        let campaignId = null;
        if (data.campaignId) {
          const { data: campaign } = await supabase
            .from('campaigns')
            .select('id')
            .eq('campaign_id', data.campaignId)
            .single();
          campaignId = campaign?.id;
        }

        const acos = data.sales > 0 ? (data.spend / data.sales) * 100 : 0;

        const { error } = await supabase.from('target_asin_week').upsert({
          target_asin: data.targetAsin,
          campaign_id: campaignId,
          brand_id: brandId,
          ad_type: adType,
          week_start: data.weekStart,
          impressions: data.impressions,
          clicks: data.clicks,
          spend: data.spend,
          sales: data.sales,
          orders: data.orders,
          acos: acos,
        }, { onConflict: 'target_asin,campaign_id,ad_type,week_start' });

        if (error) {
          console.error(`Error upserting ${adType} target ASIN:`, error);
        } else {
          upserted++;
        }
      }
      return upserted;
    };

    const spUpserted = await processTargetingData(allSpTargetingData, 'SP');
    const sdUpserted = await processTargetingData(allSdTargetingData, 'SD');

    console.log(`Synced ${spUpserted} SP + ${sdUpserted} SD = ${spUpserted + sdUpserted} targeting records`);
  } catch (error) {
    console.error('Error syncing targeting data:', error.message);
  }
}

// Sync search term data from SP Search Term Report
async function syncSearchTermsData() {
  console.log('\n=== Syncing Search Terms ===\n');

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

    // Fetch search term data in 14-day chunks (31-day chunks were timing out)
    const maxAdsDays = Math.min(syncDaysBack, 60);
    console.log(`Fetching search term data for the last ${maxAdsDays} days (14-day chunks)...`);

    // Fetch in 14-day chunks (31-day chunks were timing out)
    const chunkSize = 14;
    let allSearchTermData = [];
    const endDate = new Date();

    for (let daysBack = 0; daysBack < maxAdsDays; daysBack += chunkSize) {
      const chunkEnd = new Date();
      chunkEnd.setDate(chunkEnd.getDate() - daysBack);

      const chunkStart = new Date();
      chunkStart.setDate(chunkStart.getDate() - Math.min(daysBack + chunkSize, maxAdsDays));

      if (chunkStart >= chunkEnd) break;

      console.log(`  Requesting chunk: ${chunkStart.toISOString().split('T')[0]} to ${chunkEnd.toISOString().split('T')[0]}`);

      const chunkData = await fetchSpSearchTermReport(accessToken, profileId, chunkStart, chunkEnd);
      allSearchTermData = allSearchTermData.concat(chunkData);
    }

    const searchTermData = allSearchTermData;
    console.log(`Found ${searchTermData.length} search term records total`);

    if (searchTermData.length === 0) {
      console.log('No search term data to sync');
      return;
    }

    // Aggregate by week and search term
    const weekAggregates = {}; // { weekStart -> { query -> { ... } } }

    for (const record of searchTermData) {
      // Parse the date from the record (if available) or use report date
      const recordDate = record.date ? new Date(record.date) : new Date();
      const weekStart = getWeekStart(recordDate).toISOString().split('T')[0];

      if (!weekAggregates[weekStart]) {
        weekAggregates[weekStart] = {};
      }

      const query = record.query || '';
      if (!query) continue;

      // Create a unique key for this search term + campaign combination
      const key = `${query}|${record.campaignId || 'unknown'}`;

      if (!weekAggregates[weekStart][key]) {
        weekAggregates[weekStart][key] = {
          query,
          campaignId: record.campaignId,
          impressions: 0,
          clicks: 0,
          spend: 0,
          sales: 0,
          orders: 0,
        };
      }

      weekAggregates[weekStart][key].impressions += record.impressions || 0;
      weekAggregates[weekStart][key].clicks += record.clicks || 0;
      weekAggregates[weekStart][key].spend += record.spend || 0;
      weekAggregates[weekStart][key].sales += record.sales || 0;
      weekAggregates[weekStart][key].orders += record.orders || 0;
    }

    // Get default brand for now (search terms can be linked to campaigns which have brands)
    const defaultBrandId = await getOrCreateBrand('Default');

    // Upsert aggregated data
    let upserted = 0;
    const weeksProcessed = Object.keys(weekAggregates);
    console.log(`Processing ${weeksProcessed.length} week(s) of search term data...`);

    for (const [weekStart, terms] of Object.entries(weekAggregates)) {
      for (const [, data] of Object.entries(terms)) {
        // Look up campaign in our database
        let campaignId = null;
        let brandId = defaultBrandId;

        if (data.campaignId) {
          const { data: campaign } = await supabase
            .from('campaigns')
            .select('id, brand_id')
            .eq('campaign_id', data.campaignId)
            .single();

          if (campaign) {
            campaignId = campaign.id;
            brandId = campaign.brand_id || defaultBrandId;
          }
        }

        const acos = data.sales > 0 ? (data.spend / data.sales) * 100 : 0;

        const { error } = await supabase.from('searchterm_week').upsert({
          term: data.query,
          campaign_id: campaignId,
          brand_id: brandId,
          week_start: weekStart,
          impressions: data.impressions,
          clicks: data.clicks,
          spend: data.spend,
          sales: data.sales,
          orders: data.orders,
          acos: acos,
        }, { onConflict: 'term,campaign_id,week_start' });

        if (error) {
          console.error('Error upserting search term:', error);
        } else {
          upserted++;
        }
      }
    }

    console.log(`Synced ${upserted} search term records across ${weeksProcessed.length} week(s)`);
  } catch (error) {
    console.error('Error syncing search terms:', error.message);
  }
}

// Fetch SP Search Term Report
async function fetchSpSearchTermReport(accessToken, profileId, startDate, endDate) {
  const https = require('https');

  // Format dates as YYYY-MM-DD for the v3 API
  const formatDate = (d) => d.toISOString().split('T')[0];

  // Request the search term report using the v3 reporting API
  const reportRequest = {
    name: 'SP Search Term Report',
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    configuration: {
      adProduct: 'SPONSORED_PRODUCTS',
      groupBy: ['searchTerm'],
      columns: [
        'date',
        'campaignId',
        'campaignName',
        'adGroupId',
        'adGroupName',
        'searchTerm',
        'impressions',
        'clicks',
        'cost',
        'sales14d',
        'purchases14d',
      ],
      reportTypeId: 'spSearchTerm',
      timeUnit: 'DAILY',
      format: 'GZIP_JSON',
    },
  };

  console.log('Requesting search term report...');

  const reportResponse = await new Promise((resolve, reject) => {
    const postData = JSON.stringify(reportRequest);
    const req = https.request({
      hostname: 'advertising-api-eu.amazon.com',
      path: '/reporting/reports',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': process.env.ADS_CLIENT_ID || process.env.LWA_CLIENT_ID,
        'Amazon-Advertising-API-Scope': profileId,
        'Content-Type': 'application/vnd.createasyncreportrequest.v3+json',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          console.error('Failed to parse report response:', data);
          resolve({ reportId: null });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  if (!reportResponse.reportId) {
    console.log('No search term report ID returned. Response:', JSON.stringify(reportResponse));
    return [];
  }

  console.log(`Report ID: ${reportResponse.reportId}, polling for completion...`);

  // Poll for report completion using v3 API with extended retries (search term reports are slow)
  const reportData = await downloadReportV3(accessToken, profileId, reportResponse.reportId, 90);

  // Transform the data to our format
  return reportData.map(r => ({
    date: r.date,
    query: r.searchTerm,
    campaignId: r.campaignId,
    impressions: r.impressions || 0,
    clicks: r.clicks || 0,
    spend: r.cost || 0,
    sales: r.sales14d || 0,
    orders: r.purchases14d || 0,
  }));
}

// Download report using v3 reporting API
async function downloadReportV3(accessToken, profileId, reportId, maxRetries = 30) {
  const https = require('https');
  const zlib = require('zlib');

  for (let i = 0; i < maxRetries; i++) {
    // Check report status
    const status = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'advertising-api-eu.amazon.com',
        path: `/reporting/reports/${reportId}`,
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

    if (status.status === 'COMPLETED' && status.url) {
      console.log('Report ready, downloading...');
      // Download the report
      const reportData = await new Promise((resolve, reject) => {
        https.get(status.url, (res) => {
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
      console.log('Report generation failed:', status.failureReason || 'unknown');
      return [];
    }

    // Log progress every 3 attempts
    if (i % 3 === 0) {
      console.log(`  Report status: ${status.status}, attempt ${i+1}/${maxRetries}...`);
    }

    // Wait before retrying (longer wait for reports which can be slow)
    await new Promise(r => setTimeout(r, 6000));
  }

  console.log('Report download timed out');
  return [];
}

// Fetch SP product targeting report data using v3 API
async function fetchSpTargetingReport(accessToken, profileId, startDate, endDate) {
  const https = require('https');

  const formatDate = (d) => d.toISOString().split('T')[0];

  // Request report using v3 API with date range
  // Note: v3 API uses 'targeting' column instead of 'targetingExpression'
  const reportRequest = {
    name: 'SP Targeting Report',
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    configuration: {
      adProduct: 'SPONSORED_PRODUCTS',
      groupBy: ['targeting'],
      columns: [
        'date',
        'campaignId',
        'campaignName',
        'targeting',
        'impressions',
        'clicks',
        'cost',
        'sales14d',
        'purchases14d',
      ],
      reportTypeId: 'spTargeting',
      timeUnit: 'DAILY',
      format: 'GZIP_JSON',
    },
  };

  const reportResponse = await new Promise((resolve, reject) => {
    const postData = JSON.stringify(reportRequest);
    const req = https.request({
      hostname: 'advertising-api-eu.amazon.com',
      path: '/reporting/reports',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': process.env.ADS_CLIENT_ID || process.env.LWA_CLIENT_ID,
        'Amazon-Advertising-API-Scope': profileId,
        'Content-Type': 'application/vnd.createasyncreportrequest.v3+json',
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
    console.log('    No SP targeting report ID returned. Response:', JSON.stringify(reportResponse));
    return [];
  }

  console.log(`    SP Targeting Report ID: ${reportResponse.reportId}, polling...`);

  // Poll for report completion using v3 API
  const reportData = await downloadReportV3(accessToken, profileId, reportResponse.reportId, 90);

  // Parse and filter for ASIN targets only
  // v3 API returns 'targeting' column instead of 'targetingExpression'
  return reportData
    .filter(r => r.targeting && r.targeting.includes('asin'))
    .map(r => {
      // Handle different ASIN expression formats (e.g., asin="B0123XYZ" or asin=B0123XYZ)
      const asinMatch = r.targeting.match(/asin[=:]"?([A-Z0-9]+)"?/i);
      return {
        date: r.date,
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

// Fetch SD matched targets report data using v3 API
async function fetchSdTargetingReport(accessToken, profileId, startDate, endDate) {
  const https = require('https');

  const formatDate = (d) => d.toISOString().split('T')[0];

  // Request report using v3 API with date range
  // Note: v3 API uses 'targetingId' and 'targetingExpression' (not 'targetId')
  const reportRequest = {
    name: 'SD Targeting Report',
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    configuration: {
      adProduct: 'SPONSORED_DISPLAY',
      groupBy: ['targeting'],
      columns: [
        'date',
        'campaignId',
        'campaignName',
        'targetingExpression',
        'impressions',
        'clicks',
        'cost',
        'sales',
        'purchases',
      ],
      reportTypeId: 'sdTargeting',
      timeUnit: 'DAILY',
      format: 'GZIP_JSON',
    },
  };

  const reportResponse = await new Promise((resolve, reject) => {
    const postData = JSON.stringify(reportRequest);
    const req = https.request({
      hostname: 'advertising-api-eu.amazon.com',
      path: '/reporting/reports',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': process.env.ADS_CLIENT_ID || process.env.LWA_CLIENT_ID,
        'Amazon-Advertising-API-Scope': profileId,
        'Content-Type': 'application/vnd.createasyncreportrequest.v3+json',
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
    console.log('    No SD targeting report ID returned. Response:', JSON.stringify(reportResponse));
    return [];
  }

  console.log(`    SD Targeting Report ID: ${reportResponse.reportId}, polling...`);

  // Poll for report completion using v3 API
  const reportData = await downloadReportV3(accessToken, profileId, reportResponse.reportId, 90);

  return reportData
    .filter(r => r.targetingExpression && r.targetingExpression.includes('asin'))
    .map(r => {
      // Handle different ASIN expression formats
      const asinMatch = r.targetingExpression.match(/asin[=:]"?([A-Z0-9]+)"?/i);
      return {
        date: r.date,
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
  console.log(`Date range: ${syncDaysBack} days back`);

  // Sync products first to populate brand cache
  if (syncProducts) await syncProductsData();
  if (syncOrders) await syncOrdersData();
  if (syncAds) await syncAdsData();
  if (syncTargeting) await syncTargetingData();
  if (syncSearchTerms) await syncSearchTermsData();
  // Legacy inventory sync (deprecated, use --products instead)
  if (syncInventory) {
    console.log('\n⚠️  --inventory is deprecated. Use --products instead.');
    await syncInventoryData();
  }

  await updateSyncTime();

  console.log('\n✅ Sync complete!');
}

main().catch(console.error);
