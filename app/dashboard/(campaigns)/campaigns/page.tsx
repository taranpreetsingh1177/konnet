import { getAccounts, getCompaniesForCampaign } from "@/features/(campaign)/campaigns/actions/actions";
import { CampaignsTable } from "@/features/(campaign)/campaigns/components/campaigns-table";

import { getUniqueTags } from "@/features/(contact)/leads/actions/actions";

export default async function CampaignsPage() {

  const [accounts, companies, tags] = await Promise.all([
    getAccounts(),
    getCompaniesForCampaign(),
    getUniqueTags(),
  ]);

  return (
    <div className="h-full">
      <CampaignsTable accounts={accounts} companies={companies} tags={tags} />
    </div>
  );
}
