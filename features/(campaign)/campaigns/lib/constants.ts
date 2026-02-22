export const Campaigns = {
  // For the campaign status
  Status: {
    // Draft is just for reference in the backend.
    /*
      We first have to create a campaign row in the database and then generate campaign leads based on the selected companies and templates. During the campaign creation process, the status will be set to "draft". Once the user finalizes the campaign and clicks "Launch", we will update the status to "scheduled" and set a scheduled time for when the campaign should start running. This allows us to handle any necessary preparations before the campaign goes live, such as generating personalized email content for each lead and scheduling them to be sent at the appropriate times.
    */
    DRAFT: "draft",
    SCHEDULED: "scheduled",
    RUNNING: "running",
    COMPLETED: "completed",
    ERROR: "error",
    CANCELLED: "cancelled",
  },
  // For Campaign leads status
  LeadStatus: {
    PENDING: "pending",
    SENT: "sent",
    FAILED: "failed",
    CANCELLED: "cancelled",
  },
} as const;

export type CampaignStatus =
  (typeof Campaigns.Status)[keyof typeof Campaigns.Status];

export type CampaignLeadStatus =
  (typeof Campaigns.LeadStatus)[keyof typeof Campaigns.LeadStatus];
