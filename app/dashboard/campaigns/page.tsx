import { CampaignsTable } from "../../../features/campaigns/components/campaigns-table";
import {
  getAccounts,
  getCompaniesForCampaign,
} from "../../../features/campaigns/actions/actions";

export default async function CampaignsPage() {
  const [accounts, companies] = await Promise.all([
    getAccounts(),
    getCompaniesForCampaign(),
  ]);

  return (
    <div className="h-full">
      <CampaignsTable accounts={accounts} companies={companies} />
    </div>
  );
}
