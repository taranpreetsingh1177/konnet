export type CampaignStartEvent = {
  name: "campaign/start";
  data: { campaignId: string };
};

export type CompanyEnrichEvent = {
  name: "company/enrich";
  data: { companyId: string };
};

export type InngestEvents = CampaignStartEvent | CompanyEnrichEvent;
