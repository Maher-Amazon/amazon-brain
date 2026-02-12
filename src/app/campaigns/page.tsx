import { getCampaigns } from "@/lib/data";
import { CampaignsClient } from "./campaigns-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return <CampaignsClient campaigns={campaigns} />;
}
