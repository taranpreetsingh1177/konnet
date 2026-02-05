import { generateText } from "ai";
import { createVertex } from "@ai-sdk/google-vertex";
import {
  convertStructuredToHTML,
  type StructuredEmail,
} from "./email-template-builder";
import { z } from "zod";
import {
  COMPANY_EMAIL_SYSTEM_PROMPT,
  generateCompanyEmailUserPrompt,
} from "@/lib/constants/prompts";

// Zod schema for structured email validation
const ServiceBoxSchema = z.object({
  icon: z.string().min(1, "Icon is required"),
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().min(1, "Subtitle is required"),
});

const EmailBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    content: z.string().min(1, "Text content cannot be empty"),
  }),
  z.object({
    type: z.literal("boxes"),
    items: z
      .array(ServiceBoxSchema)
      .min(1, "At least one service box required")
      .max(6, "Maximum 6 service boxes"),
  }),
]);

const StructuredEmailSchema = z.object({
  subject: z.string().min(5, "Subject too short").max(80, "Subject too long"),
  blocks: z.array(EmailBlockSchema).min(3, "Email must have at least 3 blocks"),
});

// Create Vertex AI provider
if (!process.env.GOOGLE_VERTEX_PROJECT) {
  throw new Error("GOOGLE_VERTEX_PROJECT environment variable is required");
}

if (!process.env.GOOGLE_VERTEX_LOCATION) {
  throw new Error("GOOGLE_VERTEX_LOCATION environment variable is required");
}

// Parse Google Auth credentials if provided (for deployment)
let googleAuthOptions: any = undefined;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  try {
    const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    console.log(
      "[Vertex AI] Using credentials from GOOGLE_APPLICATION_CREDENTIALS_JSON",
    );
    console.log("[Vertex AI] Credential type:", creds.type);
    googleAuthOptions = { credentials: creds };
  } catch (error) {
    console.error(
      "[Vertex AI] Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:",
      error,
    );
    throw error;
  }
} else {
  console.log("[Vertex AI] Using Application Default Credentials (ADC)");
}

const vertex = createVertex({
  project: process.env.GOOGLE_VERTEX_PROJECT,
  location: process.env.GOOGLE_VERTEX_LOCATION,
  googleAuthOptions,
});

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
    // System Prompt (Inlined for Vercel/Serverless safety)
    const systemPrompt = COMPANY_EMAIL_SYSTEM_PROMPT;

    console.log(`✅ System prompt loaded (${systemPrompt.length} characters)`);
    console.log("");

    // Construct user prompt
    const userPrompt = generateCompanyEmailUserPrompt(company);

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

    const cleaned = response.text.replace(/```json\n?|\n?```/g, "").trim();

    const structured = StructuredEmailSchema.parse(JSON.parse(cleaned));

    const result = convertStructuredToHTML(structured);
    return result;
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
    company_name: lead.company || "", // Map company to company_name
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
