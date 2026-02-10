/**
 * Amazon Brain - Google Sheets Integration
 * Apps Script code to sync data from the Amazon Brain API
 *
 * SETUP:
 * 1. Open your Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete the default code and paste this entire file
 * 4. Click Save
 * 5. Run setupTriggers() once to set up automated daily sync
 *
 * CONFIGURATION:
 * Update the CONFIG object below with your values
 */

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================
const CONFIG = {
  API_BASE_URL: "https://amazon-brain.vercel.app/api/sheets",
  API_KEY: "YOUR_API_KEY_HERE", // Set in Vercel as SHEETS_API_KEY
  WEEKS_TO_FETCH: 12,
  TIMEZONE: "Asia/Dubai",
};

// Sheet names - must match exactly in your spreadsheet
const SHEETS = {
  CAMPAIGN_WEEK: "CAMPAIGN_WEEK",
  SEARCHTERM_WEEK: "SEARCHTERM_WEEK",
  TARGET_ASIN_WEEK: "TARGET_ASIN_WEEK",
  ASIN_WEEK: "ASIN_WEEK",
  BRAND_WEEK: "BRAND_WEEK",
  CONFIG: "CONFIG",
  BRAND_MAP: "BRAND_MAP",
  CAMPAIGN_MAP: "CAMPAIGN_MAP",
  CAMPAIGN_FLAGS: "CAMPAIGN_FLAGS",
  EVENTS_UAE: "EVENTS_UAE",
  PROMOS_TRACKER: "PROMOS_TRACKER",
  WEEKLY_NOTES: "WEEKLY_NOTES",
  DECISION_LOG: "DECISION_LOG",
  SYNC_LOG: "SYNC_LOG",
};

// ============================================
// MAIN SYNC FUNCTIONS
// ============================================

/**
 * Main sync function - syncs all sheets
 * Run this manually or set up as a daily trigger
 */
function syncAllSheets() {
  const startTime = new Date();
  const log = [];

  try {
    log.push(`Sync started at ${startTime.toISOString()}`);

    // Sync each dataset
    const datasets = [
      { name: "brand-week", sheet: SHEETS.BRAND_WEEK },
      { name: "campaign-week", sheet: SHEETS.CAMPAIGN_WEEK },
      { name: "searchterm-week", sheet: SHEETS.SEARCHTERM_WEEK },
      { name: "target-asin-week", sheet: SHEETS.TARGET_ASIN_WEEK },
      { name: "asin-week", sheet: SHEETS.ASIN_WEEK },
      { name: "config", sheet: SHEETS.CONFIG },
      { name: "brands", sheet: SHEETS.BRAND_MAP },
      { name: "campaigns", sheet: SHEETS.CAMPAIGN_MAP },
      { name: "campaign-flags", sheet: SHEETS.CAMPAIGN_FLAGS },
      { name: "events", sheet: SHEETS.EVENTS_UAE },
      { name: "promos", sheet: SHEETS.PROMOS_TRACKER },
      { name: "weekly-notes", sheet: SHEETS.WEEKLY_NOTES },
      { name: "decisions", sheet: SHEETS.DECISION_LOG },
    ];

    for (const dataset of datasets) {
      try {
        const count = syncDataset(dataset.name, dataset.sheet);
        log.push(`✓ ${dataset.sheet}: ${count} rows`);
      } catch (e) {
        log.push(`✗ ${dataset.sheet}: ${e.message}`);
      }
    }

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    log.push(`Sync completed in ${duration}s`);

    // Write to sync log
    writeSyncLog(log);

  } catch (e) {
    log.push(`SYNC FAILED: ${e.message}`);
    writeSyncLog(log);
    throw e;
  }
}

/**
 * Sync a single dataset from API to sheet
 */
function syncDataset(datasetName, sheetName) {
  const url = `${CONFIG.API_BASE_URL}/${datasetName}?weeks=${CONFIG.WEEKS_TO_FETCH}`;

  const options = {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${CONFIG.API_KEY}`,
      "Content-Type": "application/json",
    },
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(url, options);
  const statusCode = response.getResponseCode();

  if (statusCode !== 200) {
    throw new Error(`API error ${statusCode}: ${response.getContentText()}`);
  }

  const json = JSON.parse(response.getContentText());
  const data = json.data;

  if (!data) {
    throw new Error("No data in response");
  }

  // Get or create the sheet
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  // Handle config (single object) vs arrays
  if (!Array.isArray(data)) {
    writeConfigSheet(sheet, data);
    return 1;
  }

  if (data.length === 0) {
    return 0;
  }

  // Clear existing data and write new
  sheet.clearContents();

  // Write headers
  const headers = Object.keys(data[0]);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight("bold")
    .setBackground("#4285f4")
    .setFontColor("#ffffff");

  // Write data rows
  const rows = data.map(row => headers.map(h => row[h] ?? ""));
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);

  // Auto-resize columns
  for (let i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }

  // Freeze header row
  sheet.setFrozenRows(1);

  return data.length;
}

/**
 * Write config data (single object) to sheet
 */
function writeConfigSheet(sheet, data) {
  sheet.clearContents();

  const rows = Object.entries(data).map(([key, value]) => [key, value]);

  // Headers
  sheet.getRange(1, 1, 1, 2).setValues([["Setting", "Value"]]);
  sheet.getRange(1, 1, 1, 2)
    .setFontWeight("bold")
    .setBackground("#4285f4")
    .setFontColor("#ffffff");

  // Data
  sheet.getRange(2, 1, rows.length, 2).setValues(rows);

  sheet.autoResizeColumn(1);
  sheet.autoResizeColumn(2);
  sheet.setFrozenRows(1);
}

/**
 * Write sync log to SYNC_LOG sheet
 */
function writeSyncLog(logLines) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.SYNC_LOG);

  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.SYNC_LOG);
    sheet.getRange(1, 1, 1, 2).setValues([["Timestamp", "Message"]]);
    sheet.getRange(1, 1, 1, 2)
      .setFontWeight("bold")
      .setBackground("#4285f4")
      .setFontColor("#ffffff");
  }

  const timestamp = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm:ss");
  const newRows = logLines.map(line => [timestamp, line]);

  // Insert at row 2 (after header)
  sheet.insertRowsAfter(1, newRows.length);
  sheet.getRange(2, 1, newRows.length, 2).setValues(newRows);

  // Keep only last 500 rows
  const lastRow = sheet.getLastRow();
  if (lastRow > 502) {
    sheet.deleteRows(503, lastRow - 502);
  }
}

// ============================================
// INDIVIDUAL SYNC FUNCTIONS
// ============================================

function syncBrandWeek() {
  syncDataset("brand-week", SHEETS.BRAND_WEEK);
  SpreadsheetApp.getActiveSpreadsheet().toast("Brand Week synced!", "Sync Complete");
}

function syncCampaignWeek() {
  syncDataset("campaign-week", SHEETS.CAMPAIGN_WEEK);
  SpreadsheetApp.getActiveSpreadsheet().toast("Campaign Week synced!", "Sync Complete");
}

function syncSearchTermWeek() {
  syncDataset("searchterm-week", SHEETS.SEARCHTERM_WEEK);
  SpreadsheetApp.getActiveSpreadsheet().toast("Search Term Week synced!", "Sync Complete");
}

function syncTargetAsinWeek() {
  syncDataset("target-asin-week", SHEETS.TARGET_ASIN_WEEK);
  SpreadsheetApp.getActiveSpreadsheet().toast("Target ASIN Week synced!", "Sync Complete");
}

function syncAsinWeek() {
  syncDataset("asin-week", SHEETS.ASIN_WEEK);
  SpreadsheetApp.getActiveSpreadsheet().toast("ASIN Week synced!", "Sync Complete");
}

function syncConfig() {
  syncDataset("config", SHEETS.CONFIG);
  SpreadsheetApp.getActiveSpreadsheet().toast("Config synced!", "Sync Complete");
}

function syncBrandMap() {
  syncDataset("brands", SHEETS.BRAND_MAP);
  SpreadsheetApp.getActiveSpreadsheet().toast("Brand Map synced!", "Sync Complete");
}

function syncCampaignMap() {
  syncDataset("campaigns", SHEETS.CAMPAIGN_MAP);
  SpreadsheetApp.getActiveSpreadsheet().toast("Campaign Map synced!", "Sync Complete");
}

function syncCampaignFlags() {
  syncDataset("campaign-flags", SHEETS.CAMPAIGN_FLAGS);
  SpreadsheetApp.getActiveSpreadsheet().toast("Campaign Flags synced!", "Sync Complete");
}

function syncEvents() {
  syncDataset("events", SHEETS.EVENTS_UAE);
  SpreadsheetApp.getActiveSpreadsheet().toast("Events synced!", "Sync Complete");
}

function syncPromos() {
  syncDataset("promos", SHEETS.PROMOS_TRACKER);
  SpreadsheetApp.getActiveSpreadsheet().toast("Promos synced!", "Sync Complete");
}

function syncWeeklyNotes() {
  syncDataset("weekly-notes", SHEETS.WEEKLY_NOTES);
  SpreadsheetApp.getActiveSpreadsheet().toast("Weekly Notes synced!", "Sync Complete");
}

function syncDecisionLog() {
  syncDataset("decisions", SHEETS.DECISION_LOG);
  SpreadsheetApp.getActiveSpreadsheet().toast("Decision Log synced!", "Sync Complete");
}

// ============================================
// TRIGGERS & MENU
// ============================================

/**
 * Set up automated daily sync trigger
 * Run this function once to enable daily syncs
 */
function setupTriggers() {
  // Remove existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === "syncAllSheets") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create new daily trigger at 6 AM UAE time
  ScriptApp.newTrigger("syncAllSheets")
    .timeBased()
    .atHour(6)
    .everyDays(1)
    .inTimezone(CONFIG.TIMEZONE)
    .create();

  SpreadsheetApp.getActiveSpreadsheet().toast(
    "Daily sync scheduled for 6 AM UAE time",
    "Triggers Set Up"
  );
}

/**
 * Remove all triggers
 */
function removeTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  SpreadsheetApp.getActiveSpreadsheet().toast("All triggers removed", "Triggers Removed");
}

/**
 * Create custom menu when spreadsheet opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu("Amazon Brain")
    .addItem("Sync All Sheets", "syncAllSheets")
    .addSeparator()
    .addSubMenu(ui.createMenu("Sync Individual")
      .addItem("Brand Week", "syncBrandWeek")
      .addItem("Campaign Week", "syncCampaignWeek")
      .addItem("Search Term Week", "syncSearchTermWeek")
      .addItem("Target ASIN Week", "syncTargetAsinWeek")
      .addItem("ASIN Week", "syncAsinWeek")
      .addSeparator()
      .addItem("Config", "syncConfig")
      .addItem("Brand Map", "syncBrandMap")
      .addItem("Campaign Map", "syncCampaignMap")
      .addItem("Campaign Flags", "syncCampaignFlags")
      .addItem("Events", "syncEvents")
      .addItem("Promos", "syncPromos")
      .addItem("Weekly Notes", "syncWeeklyNotes")
      .addItem("Decision Log", "syncDecisionLog")
    )
    .addSeparator()
    .addItem("Setup Daily Sync", "setupTriggers")
    .addItem("Remove Triggers", "removeTriggers")
    .addToUi();
}

// ============================================
// CSV IMPORT FUNCTIONS (FALLBACK)
// ============================================

/**
 * Import data from a CSV URL
 * Use this as fallback if API sync doesn't work
 */
function importFromCsvUrl(csvUrl, sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  const response = UrlFetchApp.fetch(csvUrl);
  const csvData = Utilities.parseCsv(response.getContentText());

  sheet.clearContents();
  sheet.getRange(1, 1, csvData.length, csvData[0].length).setValues(csvData);

  // Style header row
  sheet.getRange(1, 1, 1, csvData[0].length)
    .setFontWeight("bold")
    .setBackground("#4285f4")
    .setFontColor("#ffffff");

  sheet.setFrozenRows(1);

  return csvData.length - 1; // Exclude header
}

/**
 * Import CSV from file upload
 * Prompts user to enter CSV data
 */
function importFromCsvPaste() {
  const ui = SpreadsheetApp.getUi();

  const sheetResult = ui.prompt(
    "Import CSV",
    "Enter sheet name to import to:",
    ui.ButtonSet.OK_CANCEL
  );

  if (sheetResult.getSelectedButton() !== ui.Button.OK) return;

  const sheetName = sheetResult.getResponseText().trim();

  const csvResult = ui.prompt(
    "Import CSV",
    "Paste your CSV data:",
    ui.ButtonSet.OK_CANCEL
  );

  if (csvResult.getSelectedButton() !== ui.Button.OK) return;

  const csvText = csvResult.getResponseText();
  const csvData = Utilities.parseCsv(csvText);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  sheet.clearContents();
  sheet.getRange(1, 1, csvData.length, csvData[0].length).setValues(csvData);

  // Style header row
  sheet.getRange(1, 1, 1, csvData[0].length)
    .setFontWeight("bold")
    .setBackground("#4285f4")
    .setFontColor("#ffffff");

  sheet.setFrozenRows(1);

  ui.alert(`Imported ${csvData.length - 1} rows to ${sheetName}`);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format currency values in a column
 */
function formatCurrencyColumn(sheetName, columnLetter) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return;

  const col = columnLetter.charCodeAt(0) - 64; // A=1, B=2, etc.
  const lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    sheet.getRange(2, col, lastRow - 1, 1)
      .setNumberFormat("#,##0.00");
  }
}

/**
 * Format percentage values in a column
 */
function formatPercentColumn(sheetName, columnLetter) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return;

  const col = columnLetter.charCodeAt(0) - 64;
  const lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    sheet.getRange(2, col, lastRow - 1, 1)
      .setNumberFormat("0.00%");
  }
}

/**
 * Apply conditional formatting for TACoS/ACoS
 */
function applyTacosFormatting(sheetName, columnLetter, highThreshold = 25) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return;

  const col = columnLetter.charCodeAt(0) - 64;
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) return;

  const range = sheet.getRange(2, col, lastRow - 1, 1);

  // Clear existing conditional formatting
  const rules = sheet.getConditionalFormatRules();
  const newRules = rules.filter(rule => {
    const ranges = rule.getRanges();
    return !ranges.some(r => r.getColumn() === col);
  });

  // Add new rules
  const greenRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(15)
    .setBackground("#c6efce")
    .setRanges([range])
    .build();

  const yellowRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberBetween(15, highThreshold)
    .setBackground("#ffeb9c")
    .setRanges([range])
    .build();

  const redRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(highThreshold)
    .setBackground("#ffc7ce")
    .setRanges([range])
    .build();

  newRules.push(greenRule, yellowRule, redRule);
  sheet.setConditionalFormatRules(newRules);
}

/**
 * Test API connection
 */
function testApiConnection() {
  const url = `${CONFIG.API_BASE_URL}/config`;

  const options = {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${CONFIG.API_KEY}`,
      "Content-Type": "application/json",
    },
    muteHttpExceptions: true,
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();

    if (statusCode === 200) {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        "API connection successful!",
        "Connection Test"
      );
    } else if (statusCode === 401) {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        "API key is invalid. Check CONFIG.API_KEY",
        "Connection Failed"
      );
    } else {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        `API returned status ${statusCode}`,
        "Connection Failed"
      );
    }
  } catch (e) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      `Connection error: ${e.message}`,
      "Connection Failed"
    );
  }
}
