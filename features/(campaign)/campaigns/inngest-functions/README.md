# Campaign Send Process

## Overview
The `send-campaign` Inngest function handles the automated email distribution for campaigns. It processes scheduled campaigns, manages email sending across multiple Gmail accounts, and tracks individual lead statuses.

## Trigger Event
```typescript
{ event: "campaign/start" }
```
Triggered when `startCampaign()` action is called from the frontend.

## Process Flow

### 1. **Fetch Campaign Details**
- Retrieves campaign information from the database
- Validates campaign exists
- Fails immediately if campaign not found (NonRetriableError)

### 2. **Schedule Delay (if applicable)**
- Checks if `campaign.scheduled_at` exists
- If scheduled for future, waits until that time using `step.sleepUntil()`
- Skips this step for "Send Now" campaigns

### 3. **Update Status to Running**
- **Conditional logic:**
  - If campaign was `SCHEDULED` → Updates to `RUNNING`
  - If already `RUNNING` (send now) → Skips this step

### 4. **Fetch Gmail Accounts**
- Retrieves all Gmail accounts associated with the campaign
- Maps `account_id` to account credentials (email, refresh_token)
- **Terminates campaign** if no accounts found

### 5. **Fetch Pending Leads**
- Queries `campaign_leads` table for leads with status `PENDING`
- Joins with `leads` and `companies` tables to get:
  - Lead contact information (email, name, role)
  - Company details (name, domain)
  - Email templates (subject, body)
- Returns empty array if no pending leads

### 6. **Send Emails**
For each pending lead:

#### a. **Account Validation**
- Checks if assigned account exists in accountMap
- **Critical:** Throws `NonRetriableError` if account missing
  - This terminates the entire campaign
  - Triggers `onFailure` handler
  - Campaign marked as `ERROR`

#### b. **Template Processing**
- Validates company has email templates
- Throws error if `email_subject` or `email_template` missing
- Applies template variables using `replaceTemplateVars()`
  - Subject: No variable replacement (static)
  - Body: Dynamic replacement (lead name, company, etc.)

#### c. **Email Construction**
- Creates Gmail OAuth2 client with account credentials
- Builds email with PDF attachment using `createEmailWithAttachment()`
- Adds tracking pixel: `?id={campaign_lead_id}&type=campaign_lead`
- Base64 encodes the message for Gmail API

#### d. **Gmail Send**
- Sends email via Gmail API
- Updates `campaign_leads` table on success:
  - Status → `SENT`
  - Records `sent_at` timestamp
  - Stores `thread_id` and `message_id`
  - Increments `successfulSends` counter

#### e. **Error Handling**
- Catches individual send failures
- Updates `campaign_leads` status to `FAILED`
- Records error message
- Continues to next lead (doesn't terminate campaign)

#### f. **Rate Limiting**
- Adds 2-second delay between emails
- Prevents Gmail API rate limit issues

### 7. **Final Status Update**
Determines campaign outcome based on results:

**If `successfulSends === 0`:**
- Campaign status → `ERROR`
- Sets error message: "All email sends failed"
- Indicates complete failure

**If `successfulSends > 0`:**
- Campaign status → `COMPLETED`
- Logs success ratio (e.g., "45/50 sent")
- Partial success still counts as completed

## Status Transitions

### Campaign Statuses
```
DRAFT → SCHEDULED → RUNNING → COMPLETED ✅
                             → ERROR ❌

DRAFT → RUNNING → COMPLETED ✅
                → ERROR ❌
```

### Lead Statuses
```
PENDING → SENT ✅
        → FAILED ❌
        → CANCELLED 🚫
```

## Error Handling

### `onFailure` Handler
Triggered when Inngest function fails (after 3 retries):
- Extracts `campaignId` from event data
- Updates campaign status to `ERROR`
- Records error message in database
- Logs failure details

### Terminating Errors (NonRetriableError)
These immediately fail the campaign:
1. Campaign not found
2. No Gmail accounts associated
3. Gmail account missing for assigned lead

### Non-Terminating Errors
These fail individual leads only:
1. Missing email templates
2. Gmail API send failure
3. Individual authentication issues

## Key Features

### ✅ Scheduled Campaigns
- Supports future-dated campaigns
- Automatically transitions from `SCHEDULED` to `RUNNING`

### ✅ Send Now Campaigns
- Bypasses scheduling step
- Immediately starts at `RUNNING` status

### ✅ Multi-Account Support
- Round-robin account assignment in `createCampaign()`
- Each lead pre-assigned to specific Gmail account
- Prevents account overload

### ✅ Individual Lead Tracking
- Each lead has independent status
- Thread and message IDs stored for reply tracking
- Failure of one lead doesn't affect others

### ✅ Email Tracking
- Tracking pixel embedded in email body
- Links to `/api/track/open` endpoint
- Tracks campaign_lead ID for specific send tracking

### ✅ Graceful Degradation
- Handles empty lead lists
- Continues campaign if some emails fail
- Only marks ERROR if all sends fail

## Database Schema Requirements

### `campaigns` table
- `id`, `user_id`, `name`
- `status`: draft | scheduled | running | completed | error | cancelled
- `scheduled_at`: timestamp (nullable)
- `inngest_run_ids`: array of run IDs for cancellation
- `error`: error message (nullable)

### `campaign_accounts` table
- `campaign_id`, `account_id`
- Links campaigns to Gmail accounts

### `campaign_leads` table
- `id`, `campaign_id`, `lead_id`
- `status`: pending | sent | failed | cancelled
- `assigned_account_id`: pre-assigned Gmail account
- `sent_at`: timestamp (nullable)
- `thread_id`, `message_id`: Gmail identifiers
- `error`: error message (nullable)

## Configuration

### Environment Variables
- `GOOGLE_CLIENT_ID`: Gmail OAuth2 client ID
- `GOOGLE_CLIENT_SECRET`: Gmail OAuth2 client secret
- `NEXT_PUBLIC_APP_URL`: Base URL for tracking pixels
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Admin access for background jobs

### Constants
- `ATTACHMENT_PDF`: "Project Reach Out Deck.pdf" (in `/public`)
- `Campaigns.Status.*`: Campaign status constants
- `Campaigns.LeadStatus.*`: Lead status constants

## Retries
- **Max retries:** 3 attempts
- **Retry behavior:** Only for transient failures
- **NonRetriableError:** Skips retries, fails immediately

## Return Value
```typescript
{
  success: true,
  emailsSent: number,      // Successful sends
  totalLeads: number       // Total attempted
}
```

## Monitoring & Logging

### Console Logs
- Campaign fetch confirmation
- Lead count
- Individual send attempts
- Success/failure details
- Final status and ratios

### Database Tracking
- Campaign status updates
- Individual lead outcomes
- Error messages
- Timestamps for all events

## Related Files
- `/features/campaigns/lib/constants.ts` - Status constants
- `/lib/email/mime-builder.ts` - Email construction
- `/features/(contact)/companies/lib/generate-email.ts` - Template processor
- `/app/dashboard/campaigns/actions.ts` - Campaign triggers
