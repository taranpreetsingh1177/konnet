import { CampaignsTable } from "../../../features/campaigns/components/campaigns-table";
import {
  getAccounts,
  getCompaniesForCampaign,
} from "../../../features/campaigns/actions/actions";
import { getUniqueTags } from "../../../features/(contact)/leads/actions/actions";

// Force dynamic rendering - never cache this page
export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const [accounts, companies, tags] = await Promise.all([
    getAccounts(),
    getCompaniesForCampaign(),
    getUniqueTags(),
  ]);

  console.log("[CampaignsPage] tags loaded:", tags.length, tags);

  return (
    <div className="h-full">
      <CampaignsTable accounts={accounts} companies={companies} tags={tags} />
    </div>
  );
}
