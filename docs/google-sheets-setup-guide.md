# Amazon Brain - Google Sheets Integration Guide

## Overview

This guide explains how to set up Google Sheets to automatically sync with your Amazon Brain dashboard database.

**Architecture:**
```
Amazon APIs → Sync Script → Supabase DB → API Endpoints → Google Sheets (Apps Script)
```

## Prerequisites

1. Amazon Brain dashboard deployed on Vercel (https://amazon-brain.vercel.app)
2. Google account with access to Google Sheets
3. API key for authentication (set up in Vercel)

## Step 1: Generate API Key

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add a new variable:
   - Name: `SHEETS_API_KEY`
   - Value: Generate a secure random string (e.g., use `openssl rand -hex 32`)
4. Redeploy your application

## Step 2: Create Google Sheet

1. Create a new Google Sheet
2. Name it "Amazon Brain Dashboard"
3. Create the following tabs (sheets):

| Tab Name | Purpose |
|----------|---------|
| BRAND_WEEK | Weekly brand-level performance |
| CAMPAIGN_WEEK | Weekly campaign performance |
| SEARCHTERM_WEEK | Weekly search term data |
| TARGET_ASIN_WEEK | Weekly targeting performance |
| ASIN_WEEK | Weekly SKU/ASIN performance |
| CONFIG | Account settings & thresholds |
| BRAND_MAP | Brand list with targets |
| CAMPAIGN_MAP | Campaign list with brand mapping |
| CAMPAIGN_FLAGS | Strategic campaign annotations |
| EVENTS_UAE | UAE events calendar |
| PROMOS_TRACKER | Active promotions |
| WEEKLY_NOTES | Weekly commentary |
| DECISION_LOG | Decision history |
| SYNC_LOG | Sync history (auto-created) |

## Step 3: Install Apps Script

1. In your Google Sheet, go to **Extensions → Apps Script**
2. Delete the default code
3. Copy the entire contents of `google-sheets-apps-script.js`
4. Paste into the Apps Script editor
5. Update the CONFIG section:
   ```javascript
   const CONFIG = {
     API_BASE_URL: "https://amazon-brain.vercel.app/api/sheets",
     API_KEY: "YOUR_API_KEY_HERE",  // ← Replace this
     WEEKS_TO_FETCH: 12,
     TIMEZONE: "Asia/Dubai",
   };
   ```
6. Click **Save** (Ctrl+S)

## Step 4: Authorize & Test

1. In Apps Script, click **Run** on the `testApiConnection` function
2. When prompted, click **Review Permissions**
3. Select your Google account
4. Click **Advanced** → **Go to Amazon Brain (unsafe)**
5. Click **Allow**

If the test shows "API connection successful!", you're ready to sync.

## Step 5: Run First Sync

1. Close the Apps Script editor
2. Refresh your Google Sheet
3. You'll see a new menu: **Amazon Brain**
4. Click **Amazon Brain → Sync All Sheets**
5. Wait for the sync to complete

## Step 6: Set Up Daily Sync

1. Click **Amazon Brain → Setup Daily Sync**
2. This creates a trigger to sync at 6 AM UAE time daily

## Sheet Structure

### BRAND_WEEK
| Column | Description |
|--------|-------------|
| week_start | Monday of the week (YYYY-MM-DD) |
| brand_name | Brand name |
| mode | growth / maintain / liquidate |
| tacos_target | Target TACoS % |
| acos_target | Target ACoS % |
| revenue | Total revenue (incl. VAT) |
| revenue_ex_vat | Revenue excluding 5% VAT |
| units | Units sold |
| orders | Number of orders |
| ad_spend | Total ad spend |
| ad_sales | Attributed ad sales |
| tacos | TACoS % (ad_spend / revenue_ex_vat) |
| acos | ACoS % (ad_spend / ad_sales) |
| impressions | Ad impressions |
| clicks | Ad clicks |

### CAMPAIGN_WEEK
| Column | Description |
|--------|-------------|
| week_start | Monday of the week |
| campaign_id | Amazon campaign ID |
| campaign_name | Campaign name |
| type | SP (Sponsored Products) or SD (Sponsored Display) |
| state | enabled / paused / archived |
| brand_name | Parent brand |
| impressions | Ad impressions |
| clicks | Ad clicks |
| spend | Ad spend |
| sales | Attributed sales |
| orders | Orders |
| acos | ACoS % |
| ctr | Click-through rate % |
| cpc | Cost per click |

### SEARCHTERM_WEEK
| Column | Description |
|--------|-------------|
| week_start | Monday of the week |
| term | Search term |
| brand_name | Brand |
| campaign_name | Source campaign |
| impressions | Impressions |
| clicks | Clicks |
| orders | Conversions |
| spend | Spend |
| sales | Sales |
| acos | ACoS % |
| cvr | Conversion rate % |

### TARGET_ASIN_WEEK
| Column | Description |
|--------|-------------|
| week_start | Monday of the week |
| target_asin | Targeted ASIN (competitor/detail page) |
| ad_type | SP or SD |
| brand_name | Your brand |
| campaign_name | Campaign |
| impressions | Impressions |
| clicks | Clicks |
| orders | Orders |
| spend | Spend |
| sales | Sales |
| acos | ACoS % |

### ASIN_WEEK
| Column | Description |
|--------|-------------|
| week_start | Monday of the week |
| asin | Product ASIN |
| sku | Seller SKU |
| title | Product title (truncated to 150 chars) |
| brand_name | Brand |
| revenue | Revenue (incl. VAT) |
| revenue_ex_vat | Revenue ex VAT |
| units | Units sold |
| ad_spend | Ad spend |
| ad_sales | Ad sales |
| tacos | TACoS % |
| acos | ACoS % |
| stock_level | Current stock |
| stock_days | Days of stock |

### CAMPAIGN_FLAGS
| Column | Description |
|--------|-------------|
| campaign_id | Amazon campaign ID |
| campaign_name | Campaign name |
| flag | DEFEND / AGGRESS / TEST / PAUSE / SCALE |
| reason | Why this flag was set |
| created_at | When flag was set |

**Flag meanings:**
- **DEFEND** - Protect market share, maintain visibility
- **AGGRESS** - Increase bids, expand targeting
- **TEST** - Experimental, monitor closely
- **PAUSE** - Stop temporarily, review performance
- **SCALE** - Increase budget, proven performer

### EVENTS_UAE
| Column | Description |
|--------|-------------|
| name | Event name |
| start_date | Event start |
| end_date | Event end |
| status | tbc / confirmed / cancelled |
| impact_level | high / medium / low |
| description | Event details |

### PROMOS_TRACKER
| Column | Description |
|--------|-------------|
| asin | Product ASIN |
| sku | Seller SKU |
| title | Product title |
| brand_name | Brand |
| promo_type | discount / coupon / ped / deal / lightning_deal |
| discount_percent | Discount % (if applicable) |
| discount_amount | Discount amount (if applicable) |
| start_date | Promo start |
| end_date | Promo end |
| status | active / ended / scheduled |
| notes | Notes |

## Manual CSV Fallback

If the API sync doesn't work, you can manually import data:

1. Export data from Amazon Seller Central / Advertising Console
2. In Google Sheets: **Amazon Brain → Import CSV Paste**
3. Enter the target sheet name
4. Paste your CSV data

## Troubleshooting

### "Unauthorized" error
- Check that your API_KEY in Apps Script matches SHEETS_API_KEY in Vercel
- Redeploy your Vercel app after adding the environment variable

### "No data in response"
- The database might be empty for that dataset
- Check the web dashboard to verify data exists

### Sync is slow
- Reduce WEEKS_TO_FETCH in CONFIG
- Sync individual sheets instead of all at once

### Data doesn't refresh
- Check the SYNC_LOG sheet for errors
- Run testApiConnection to verify API is accessible
- Check Vercel function logs for errors

## Best Practices

1. **Don't modify synced data** - Changes will be overwritten on next sync
2. **Create analysis sheets separately** - Reference synced data with formulas
3. **Use WEEKLY_NOTES** - Add manual commentary per week for context
4. **Review SYNC_LOG** - Check for sync errors regularly

## Support

- Dashboard: https://amazon-brain.vercel.app
- API docs: https://amazon-brain.vercel.app/api/sheets
