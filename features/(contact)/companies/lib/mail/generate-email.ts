
type LeadData = {
  email: string;
  name?: string | null;
  company?: string | null;
  role?: string | null;
  custom_fields?: Record<string, string> | null;
};

export type CompanyData = {
  name: string;
  domain: string;
};


// generatePersonalizedEmail removed as it is no longer used.
// Email generation now strictly uses replaceTemplateVars.

/**
 * Generate company email template using Google Search grounding and system prompt
 * Uses Zod schema validation and detailed logging
 */

export function replaceTemplateVars(template: string, lead: LeadData): string {
  let result = template;

  // Support both {{var}} and {var} for lead data properties
  const vars = {
    name: lead.name || "",
    email: lead.email,
    role: lead.role || "",
    company: lead.company || "", // Map company to company_name
  };

  for (const [key, value] of Object.entries(vars)) {
    // Replace {{key}}
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "gi"), value);
    // Replace {key}
    result = result.replace(new RegExp(`\\{${key}\\}`, "gi"), value);
  }

  // Replace custom fields
  if (lead.custom_fields) {
    for (const [key, value] of Object.entries(lead.custom_fields)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "gi"), value);
      result = result.replace(new RegExp(`\\{${key}\\}`, "gi"), value);
    }
  }

  return result;
}
