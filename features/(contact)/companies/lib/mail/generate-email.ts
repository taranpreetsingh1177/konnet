import { generateText } from "ai";
import { vertex } from "@/lib/vertex-ai/vertex-ai";
import { z } from "zod";
import { COMPANY_EMAIL_SYSTEM_PROMPT } from "@/lib/constants/prompts";

// Zod schemas removed as we are now using plain text generation.

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

type GenerateEmailResult = {
  subject: string;
  body: string;
};

// generatePersonalizedEmail removed as it is no longer used.
// Email generation now strictly uses replaceTemplateVars.

/**
 * Generate company email template using Google Search grounding and system prompt
 * Uses Zod schema validation and detailed logging
 */
export async function generateCompanyEmailTemplate(
  company: CompanyData,
): Promise<GenerateEmailResult> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🚀 Starting Company Email Generation");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Company: ${company.name}`);
  console.log(`Domain: ${company.domain}`);
  console.log("");

  try {
    // Fetch default template which contains the prompts
    const { getDefaultTemplate } =
      await import("@/features/prompts/actions/content-actions");
    const template = await getDefaultTemplate();

    const systemPrompt = template.company_system_prompt;
    const userPromptTemplate = template.company_user_prompt;

    if (!systemPrompt || !userPromptTemplate) {
      throw new Error(
        "No AI prompts configured. Please set them in Dashboard > Content > Prompts.",
      );
    }

    console.log(`✅ System prompt loaded (${systemPrompt.length} characters)`);
    console.log("");

    // Construct user prompt by replacing variables in the stored template
    const userPrompt = userPromptTemplate
      .replace("{{company}}", company.name)
      .replace("{{domain}}", company.domain);

    console.log(
      "🤖 Calling Gemini 3 Flash via Vertex AI with Google Search grounding...",
    );
    console.log("");

    const response = await generateText({
      model: vertex("gemini-3-flash-preview"),
      system: systemPrompt,
      prompt: userPrompt,
      providerOptions: {
        google: {
          useSearchGrounding: true,
        },
      },
    });

    // Parse plain text response
    const text = response.text;
    const subjectMatch = text.match(/^Subject:\s*(.+)$/m);
    const subject = subjectMatch
      ? subjectMatch[1].trim()
      : "Collaboration Opportunity";

    // Extract body (everything after Subject line, trimming whitespace)
    let body = text.replace(/^Subject:.*$/m, "").trim();

    // Remove [Email Body Start/End] markers if present
    body = body
      .replace(/\[Email Body Start\]/i, "")
      .replace(/\[Email Body End\]/i, "")
      .trim();

    // Convert plain text newlines to HTML paragraphs for TipTap editor
    // Check if we have double newlines (paragraphs)
    const hasDoubleNewlines = /\n\s*\n/.test(body);

    if (hasDoubleNewlines) {
      const paragraphs = body.split(/\n\s*\n/);
      body = paragraphs
        .filter((p) => p.trim())
        .map((p) => `<p style="margin-bottom: 16px;">${p.replace(/\n/g, "<br>")}</p>`)
        .join("");
    } else {
      // Fallback: If no double newlines, treat single newlines as paragraph breaks
      // ignoring potential lists/signatures where we might want tighter spacing,
      // but ensuring readability is the priority as per user request.
      const paragraphs = body.split(/\n/);
      body = paragraphs
        .filter((p) => p.trim())
        .map((p) => `<p style="margin-bottom: 16px;">${p}</p>`)
        .join("");
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Generated HTML Body:");
    console.log(body);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return { subject, body };
  } catch (error) {
    console.error("");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ AI COMPANY EMAIL GENERATION FAILED");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("Error Details:", error);

    if (error instanceof Error) {
      console.error("Error Message:", error.message);
      console.error("Error Stack:", error.stack);
    }

    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("");

    throw error;
  }
}

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
