import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { convertStructuredToHTML, type StructuredEmail } from './email-template-builder';
import { z } from 'zod';

// Zod schema for structured email validation
const ServiceBoxSchema = z.object({
    icon: z.string().min(1, 'Icon is required'),
    title: z.string().min(1, 'Title is required'),
    subtitle: z.string().min(1, 'Subtitle is required'),
});

const EmailBlockSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('text'),
        content: z.string().min(1, 'Text content cannot be empty'),
    }),
    z.object({
        type: z.literal('boxes'),
        items: z.array(ServiceBoxSchema).min(1, 'At least one service box required').max(6, 'Maximum 6 service boxes'),
    }),
]);

const StructuredEmailSchema = z.object({
    subject: z.string().min(5, 'Subject too short').max(80, 'Subject too long'),
    blocks: z.array(EmailBlockSchema).min(3, 'Email must have at least 3 blocks'),
});

// Create Google AI provider
const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

type LeadData = {
    email: string;
    name?: string | null;
    company?: string | null;
    role?: string | null;
    custom_fields?: Record<string, string> | null;
};

type CompanyData = {
    name: string;
    domain: string;
};

type GenerateEmailResult = {
    subject: string;
    body: string;
};

/**
 * Generate personalized email by replacing template variables
 * No AI - just simple variable replacement for {name}, {company_name}, etc.
 */
export async function generatePersonalizedEmail(
    lead: LeadData,
    prompt: string,
    subjectTemplate: string,
    bodyTemplate: string
): Promise<GenerateEmailResult> {
    // Simple variable replacement - no AI needed
    return {
        subject: replaceTemplateVars(subjectTemplate, lead),
        body: replaceTemplateVars(bodyTemplate, lead),
    };
}

/**
 * Generate company email template using Google Search grounding and system prompt
 * Uses Zod schema validation and detailed logging
 */
export async function generateCompanyEmailTemplate(
    company: CompanyData
): Promise<GenerateEmailResult> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Starting Company Email Generation');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Company: ${company.name}`);
    console.log(`Domain: ${company.domain}`);
    console.log('');

    try {
        // System Prompt (Inlined for Vercel/Serverless safety)
        const systemPrompt = `You are an expert cold email copywriter for Alvion, a strategy execution firm founded by tier-1 college grads (SRCC, IIT Bombay).
Your goal is to write 1 highly personalized, researching-based cold email for a specific company.

TONE & STYLE:
- Founder-to-founder / Peer-to-peer (Not salesy)
- Concise and direct. No "I hope this email finds you well".
- Professional but conversational.
- Use simple language. Avoid buzzwords.

STRUCTURE:
1. **Hook (Research-Based):** 1-2 sentences showing you know exactly what they are doing recently (news, product launch, specific initiative). NOT "I saw your website".
2. **Value Prop (The "Alvion" Pitch):**
   "We're a team from colleges like SRCC and IIT Bombay. We've worked with [PUMA, Unstop, ShipTurtle, ManipalCigna] to execute critical projects like GTM, Market Research, and Strategy."
3. **The "Ask" / Relevance:**
   "We could help ${company.name} with..." (Propose 3 specific, relevant services based on your research).
4. **Call to Action (Low Friction):**
   "Open to a 15-min chat? No pressure." or "Happy to share a case study."

SERVICES TO CHOOSE FROM (Pick 3 relevant ones):
- Market Entry Strategy
- Primary Research (User Interviews)
- Competitive Analysis
- Go-to-Market (GTM) Execution
- Product Strategy
- Founder's Office Support`;

        console.log(`✅ System prompt loaded (${systemPrompt.length} characters)`);
        console.log('');

        // Construct user prompt
        const userPrompt = `Generate a personalized cold email for ${company.name} (domain: ${company.domain}).

⚠️ CRITICAL: Return ONLY a valid JSON object matching the structure below.

Use Google Search to research ${company.name} and create a compelling, personalized email.

REQUIRED JSON STRUCTURE:
{
  "subject": "personalized subject line (under 60 chars)",
  "blocks": [
    {"type": "text", "content": "Dear {name},"},
    {"type": "text", "content": "I'll keep this short."},
    {"type": "text", "content": "Personalized intro about ${company.name} based on research"},
    {"type": "text", "content": "Here's why I'm reaching out:"},
    {"type": "text", "content": "We're Alvion — a research and strategy execution team from colleges like SRCC and IIT Bombay. We've worked with companies like [pick 3 from: PUMA India, Unstop, ShipTurtle, ManipalCigna, Master's Union, UpGrad] to solve:\\n- Outcome 1 with numbers\\n- Outcome 2 with numbers\\n- Outcome 3 with numbers"},
    {"type": "text", "content": "What we could explore for ${company.name}:"},
    {
      "type": "boxes",
      "items": [
        {"icon": "🚀", "title": "GTM Strategy", "subtitle": "Go-to-Market Planning"},
        {"icon": "📊", "title": "Primary Research", "subtitle": "Surveys & Interviews"},
        {"icon": "🔍", "title": "Market Analysis", "subtitle": "Competitive Intelligence"}
      ]
    },
    {"type": "text", "content": "We deliver consulting-quality work in 2-4 weeks at ₹10K to ₹20K (vs ₹20-30L for traditional consulting)."},
    {"type": "text", "content": "No commitment needed — happy to share a case study or jump on a 15-min call."},
    {"type": "text", "content": "If this sounds useful, here's my calendar: [Insert Calendly Link]"},
    {"type": "text", "content": "Either way, appreciate your time."},
    {"type": "text", "content": "P.S. — [Relevant case study hook]"}
  ]
}

GUIDELINES:
- Research ${company.name} thoroughly using Google Search
- Write specific intro (2-3 sentences) - NOT generic
- Pick 2-4 relevant clients and service boxes
- Subject under 60 chars, specific to company
- Founder-to-founder tone, not salesy
- Reference specific products/news/initiatives`;

        console.log('🤖 Calling Gemini 2.0 Flash Exp with Google Search grounding...');
        console.log('');

        const response = await generateText({
            model: google('gemini-2.0-flash-thinking-exp'),
            system: systemPrompt,
            prompt: userPrompt,
            providerOptions: {
                google: {
                    useSearchGrounding: true
                }
            }
        });


        const cleaned = response.text.replace(/```json\n?|\n?```/g, '').trim();

        const structured = StructuredEmailSchema.parse(JSON.parse(cleaned));


        const result = convertStructuredToHTML(structured);
        return result;
    } catch (error) {
        console.error('');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('❌ AI COMPANY EMAIL GENERATION FAILED');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('Error Details:', error);

        if (error instanceof Error) {
            console.error('Error Message:', error.message);
            console.error('Error Stack:', error.stack);
        }

        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('');

        throw error;
    }
}


export function replaceTemplateVars(template: string, lead: LeadData): string {
    let result = template;

    // Support both {{var}} and {var} for lead data properties
    const vars = {
        name: lead.name || '',
        email: lead.email,
        role: lead.role || '',
        company_name: lead.company || '' // Map company to company_name
    };

    for (const [key, value] of Object.entries(vars)) {
        // Replace {{key}}
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), value);
        // Replace {key}
        result = result.replace(new RegExp(`\\{${key}\\}`, 'gi'), value);
    }

    // Replace custom fields
    if (lead.custom_fields) {
        for (const [key, value] of Object.entries(lead.custom_fields)) {
            result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), value);
            result = result.replace(new RegExp(`\\{${key}\\}`, 'gi'), value);
        }
    }

    return result;
}
