import sendCampaign from "../../features/(campaign)/campaigns/inngest-functions/send-campaign";
import enrichCompany from "../../features/(contact)/companies/inngest-functions/enrich-company";
import leadImport from "../../features/(contact)/leads/inngest/lead-import";

export default [sendCampaign, enrichCompany, leadImport];
