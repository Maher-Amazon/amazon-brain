/**
 * Fix campaign brand assignments by extracting ASIN from campaign names
 * and looking up the correct brand from the SKUs table.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixCampaignBrands() {
  // Get all campaigns
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, campaign_id, name, brand_id');

  // Get brand lookup by ASIN
  const { data: skus } = await supabase
    .from('skus')
    .select('asin, brand_id, brands(name)');

  const asinToBrand = {};
  for (const sku of skus || []) {
    if (sku.asin && sku.brand_id) {
      asinToBrand[sku.asin] = { brand_id: sku.brand_id, brand_name: sku.brands?.name };
    }
  }

  console.log('ASIN to brand mappings:', Object.keys(asinToBrand).length);

  let updated = 0;
  for (const campaign of campaigns || []) {
    // Extract ASIN from campaign name (format: B0XXXXXXXXX)
    const asinMatch = campaign.name.match(/B0[A-Z0-9]{8,9}/);
    if (asinMatch) {
      const asin = asinMatch[0];
      const brand = asinToBrand[asin];
      if (brand && brand.brand_id !== campaign.brand_id) {
        const { error } = await supabase
          .from('campaigns')
          .update({ brand_id: brand.brand_id })
          .eq('id', campaign.id);

        if (!error) {
          updated++;
          console.log(`Updated campaign '${campaign.name.substring(0, 40)}' -> ${brand.brand_name}`);
        }
      }
    }
  }

  console.log(`\nUpdated ${updated} campaigns with correct brands`);
}

fixCampaignBrands();
