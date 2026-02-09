# Company Enrichment Process

## Overview

The `enrich-company` Inngest function automates the generation of personalized email templates for companies using AI-powered research and content generation. It researches the company, generates targeted email content, validates the output, and stores the results in the database.

## Trigger Event

```typescript
{
  event: "company/enrich";
}
```

Triggered when a user initiates company enrichment from the frontend.

## Process Flow

### 1. **Fetch Company Details**

- Retrieves company information from database using `companyId`
- Validates company exists
- Fails immediately if company not found (NonRetriableError)
- Required fields: `name`, `domain`

### 2. **Update Status to Processing**

- Sets `enrichment_status` → `PROCESSING`
- Records `enrichment_started_at` timestamp
- Clears any previous error messages (`enrichment_error` → null)
- Provides user feedback that enrichment has begun

### 3. **Generate Email Template**

This is the core AI step that:

#### a. **Research Phase** (Internal to `generateCompanyEmailTemplate`)

- Performs Google Search grounding
- Gathers company information:
  - Business model and services
  - Recent news and achievements
  - Industry context
  - Value propositions
  - Target audience
- Uses company `name` and `domain` for accurate research

#### b. **Generation Phase**

- Uses AI (Vertex AI/Gemini) to create:
  - **Email Subject:** Compelling, attention-grabbing subject line
  - **Email Body:** Personalized email template with:
    - Dynamic placeholders (e.g., `{{lead.name}}`, `{{company}}`)
    - Value-focused messaging
    - Clear call-to-action
    - Professional tone

#### c. **AI Quality Check** ✅

- Validates generated content using `validateEmailContent()`
- Checks for:
  - Appropriate length (not too short/long)
  - Professional language
  - Presence of call-to-action
  - No placeholder errors
  - Proper formatting
  - Content relevance
- **If validation fails:**
  - Logs warning with failure reason
  - Throws error: `"AI Validation Failed: {reason}"`
  - Triggers retry (up to 2 retries)
  - Eventually marks as `FAILED` if all retries fail

### 4. **Update Company Data**

On successful generation and validation:

- Stores `email_subject` in database
- Stores `email_template` in database
- Updates `enrichment_status` → `COMPLETED`
- Templates now ready for campaign use

### 5. **Error Handling** (via `onFailure`)

If enrichment fails after all retries:

- Updates `enrichment_status` → `FAILED`
- Records `enrichment_error` with failure message
- User can see error and retry manually

## Status Transitions

```
PENDING → PROCESSING → COMPLETED ✅
                    → FAILED ❌
```

### Status Definitions

- **PENDING:** Initial state, enrichment not started
- **PROCESSING:** AI research and generation in progress
- **COMPLETED:** Templates generated and validated successfully
- **FAILED:** Enrichment failed (network, AI, validation issues)

## Error Handling

### `onFailure` Handler

Triggered after all retries exhausted:

- Extracts `companyId` from event data
- Updates `enrichment_status` → `FAILED`
- Records detailed error message in `enrichment_error`
- Allows user to identify issue and retry

### Retriable Errors (2 retries)

1. Network timeouts during AI generation
2. Temporary AI service issues
3. Validation failures (AI generated poor content)
4. Rate limiting from AI service

### Non-Retriable Errors

1. Company not found in database
2. Missing required fields (name/domain)
3. Invalid company data

## AI Validation Rules

The `validateEmailContent()` function checks:

### ✅ Pass Criteria

- Subject line: 40-80 characters
- Body: 150-800 words
- Contains recipient greeting
- Has clear value proposition
- Includes call-to-action
- Professional tone maintained
- No obvious AI artifacts

### ❌ Fail Criteria

- Too generic ("Dear Customer")
- Too promotional/salesy
- Contains errors or placeholders
- Missing key sections
- Inappropriate length
- Poor grammar or formatting

## Key Features

### 🔍 **Google Search Grounding**

- AI researches company using Google Search
- Ensures accurate, up-to-date information
- Reduces hallucination and generic content

### 🎯 **Personalized Templates**

- Company-specific messaging
- Industry-relevant language
- Customized value propositions
- Dynamic placeholder support

### 🛡️ **Quality Assurance**

- Automated content validation
- Ensures professional standards
- Prevents sending low-quality emails
- Built-in quality gate before storage

### 🔄 **Automatic Retry**

- 2 retry attempts for transient failures
- Helps overcome temporary AI issues
- Increases success rate

### 📊 **Concurrency Control**

```typescript
concurrency: {
  limit: 2;
}
```

- Max 2 enrichments running simultaneously
- Prevents API rate limits
- Manages resource usage

## Database Schema Requirements

### `companies` table

- `id`, `user_id`, `name`, `domain`
- `logo_url`: Company logo (optional)
- **Enrichment fields:**
  - `enrichment_status`: pending | processing | completed | failed
  - `enrichment_started_at`: timestamp (nullable)
  - `enrichment_error`: error message (nullable)
- **Template fields:**
  - `email_subject`: Generated subject line
  - `email_template`: Generated email body with placeholders

## Configuration

### Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Admin access for background jobs
- **Vertex AI Configuration** (in `/lib/vertex-ai/vertex-ai.ts`):
  - Google Cloud project credentials
  - Model configuration (Gemini)
  - Search grounding settings

### Constants

- `Companies.EnrichmentStatus.*`: Status constants
  - `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`

## Template Placeholders

Generated templates support dynamic variables:

### Available Placeholders

- `{{lead.name}}` - Lead's full name
- `{{lead.email}}` - Lead's email address
- `{{lead.role}}` - Lead's job title
- `{{company}}` or `{{lead.company}}` - Company name
- `{{lead.custom_fields.*}}` - Custom lead data

### Example Template

```
Subject: Quick question about {{company}}'s growth strategy

Hi {{lead.name}},

I noticed {{company}} recently [specific achievement]. As someone
focused on [relevant area], I thought you might be interested in...

[Value proposition]

Would you be open to a quick 15-minute call?

Best regards
```

## Return Value

```typescript
{
  success: true,
  companyId: string
}
```

## Monitoring & Logging

### Console Logs

- Company fetch confirmation
- Processing status update
- Template generation start
- Validation results
- Success/error details

### Database Tracking

- Enrichment status transitions
- Start timestamps
- Error messages
- Generated content storage

## Integration Points

### Triggers Enrichment

- Manual: User clicks "Enrich" button
- Bulk: Batch enrichment from company list
- Auto: On company creation (if configured)

### Uses Enrichment Results

- **Campaign Creation:** Requires completed enrichment
- **Email Preview:** Shows generated templates
- **Lead Management:** Templates available for manual sends

## Performance Characteristics

### Timing

- **Average duration:** 15-30 seconds per company
- **Factors affecting speed:**
  - AI model response time
  - Search grounding complexity
  - Network latency
  - Concurrent enrichments

### Concurrency

- **Limit:** 2 simultaneous enrichments
- **Queue:** Additional requests wait in Inngest queue
- **Prevents:** API rate limiting and resource exhaustion

## Best Practices

### ✅ Do

- Enrich companies before creating campaigns
- Review generated templates for quality
- Retry failed enrichments (may be transient)
- Monitor enrichment_error for issues

### ❌ Don't

- Skip validation (quality gate is important)
- Enrich without domain information
- Ignore failed enrichments
- Manually edit templates without testing

## Error Messages

### Common Errors

| Error                             | Cause                          | Solution                  |
| --------------------------------- | ------------------------------ | ------------------------- |
| "Company not found"               | Invalid companyId              | Verify company exists     |
| "AI Validation Failed: Too short" | Generated content insufficient | Retry enrichment          |
| "Network timeout"                 | AI service unreachable         | Wait and retry            |
| "Rate limit exceeded"             | Too many concurrent requests   | Wait for queue to process |

## Related Files

- `/features/(contact)/companies/lib/generate-email.ts` - Template generator
- `/features/(contact)/companies/lib/validate-email.ts` - Validation logic
- `/features/(contact)/companies/lib/constants.ts` - Status constants
- `/lib/vertex-ai/vertex-ai.ts` - AI model configuration
- `/app/dashboard/(contacts)/companies/actions.ts` - Enrichment triggers

## Future Enhancements

- Multi-language template generation
- A/B testing support
- Custom tone/style selection
- Industry-specific templates
- Integration with CRM data
