import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://amazon-brain.vercel.app";

  return NextResponse.json({
    name: "Amazon Brain Sheets API",
    version: "1.0.0",
    description: "API endpoints for Google Sheets integration",
    authentication: "Bearer token in Authorization header (SHEETS_API_KEY)",
    datasets: [
      {
        name: "campaign-week",
        url: `${baseUrl}/api/sheets/campaign-week`,
        description: "Weekly campaign performance data",
        params: { weeks: "number (default: 12)" },
      },
      {
        name: "searchterm-week",
        url: `${baseUrl}/api/sheets/searchterm-week`,
        description: "Weekly search term performance",
        params: { weeks: "number (default: 12)" },
      },
      {
        name: "target-asin-week",
        url: `${baseUrl}/api/sheets/target-asin-week`,
        description: "Weekly targeting performance by ASIN",
        params: { weeks: "number (default: 12)" },
      },
      {
        name: "asin-week",
        url: `${baseUrl}/api/sheets/asin-week`,
        description: "Weekly SKU/ASIN performance",
        params: { weeks: "number (default: 12)" },
      },
      {
        name: "brand-week",
        url: `${baseUrl}/api/sheets/brand-week`,
        description: "Weekly brand-level aggregates",
        params: { weeks: "number (default: 12)" },
      },
      {
        name: "config",
        url: `${baseUrl}/api/sheets/config`,
        description: "Account settings and thresholds",
      },
      {
        name: "brands",
        url: `${baseUrl}/api/sheets/brands`,
        description: "Brand list with targets",
      },
      {
        name: "campaigns",
        url: `${baseUrl}/api/sheets/campaigns`,
        description: "Campaign list with brand mapping",
      },
      {
        name: "campaign-flags",
        url: `${baseUrl}/api/sheets/campaign-flags`,
        description: "Strategic campaign annotations",
      },
      {
        name: "events",
        url: `${baseUrl}/api/sheets/events`,
        description: "UAE events calendar",
      },
      {
        name: "promos",
        url: `${baseUrl}/api/sheets/promos`,
        description: "Promotions tracker",
      },
      {
        name: "weekly-notes",
        url: `${baseUrl}/api/sheets/weekly-notes`,
        description: "Manual weekly commentary",
        params: { weeks: "number (default: 12)" },
      },
      {
        name: "decisions",
        url: `${baseUrl}/api/sheets/decisions`,
        description: "Decision log history",
        params: { weeks: "number (default: 12)" },
      },
    ],
    example: {
      request: `curl -H "Authorization: Bearer YOUR_API_KEY" ${baseUrl}/api/sheets/brand-week?weeks=4`,
      response: {
        dataset: "brand-week",
        updated_at: "2025-02-10T12:00:00Z",
        count: 24,
        data: ["..."],
      },
    },
  });
}
