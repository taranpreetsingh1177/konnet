import { generateText } from "ai";
import { aiModel } from "@/lib/ai/models";
import { DocumentNodeSchema, type DocumentAST } from "./docTypes";
import { buildDocx } from "./buildDocx";

const SYSTEM_PROMPT = `You are a strategy consultant generating a personalized proposal document.
        
Output a document as an array of nodes. You decide:
- Which sections to include (don't follow a fixed template)
- Whether to use tables, bullets, or paragraphs for each section

Available node types:
- coverTable: metadata table at the top. MUST have exactly: { "type": "coverTable", "rows": [{ "label": "string", "value": "string" }] }
- heading: section title. MUST have exactly: { "type": "heading", "level": 1|2|3, "text": "string" }
- paragraph: narrative text. MUST have exactly: { "type": "paragraph", "text": "string" }
- bulletList: { "type": "bulletList", "intro": "optional string", "items": ["string"] }
- table: { "type": "table", "headers": ["string"], "rows": [["string", "string"]] }
- questionGroup: { "type": "questionGroup", "category": "string", "questions": ["string"] }
- footer: { "type": "footer", "text": "string" }

CRITICAL: You must return strictly valid JSON. Do not include markdown formatting or extra text outside the JSON object. The root of the JSON must be an object with a 'nodes' array.`;

export async function generateDocumentASTBuffer(
    companyName: string,
    domain: string,
    researchContext: string,
    systemPrompt: string,
    userPrompt: string
): Promise<{ ast: DocumentAST; buffer: Buffer }> {
    console.log(`[Generate Doc] Starting AST Document generation for ${companyName}`);

    const finalSystemPrompt = systemPrompt + "\n\nCRITICAL: You must return strictly valid JSON. Do not include markdown formatting or extra text outside the JSON object. The root of the JSON must be an object with a 'nodes' array.";

    const finalUserPrompt = `
${userPrompt}

--- FIRECRAWL RESEARCH CONTEXT ---
Use the following research to personalize the proposal specifically for this company:
${researchContext}
--- END RESEARCH CONTEXT ---
  `.trim();

    const { text } = await generateText({
        model: aiModel("gemini-3-flash-preview"),
        system: finalSystemPrompt,
        prompt: finalUserPrompt,
    });

    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const rawObj = JSON.parse(jsonStr);

    // Zod validation against the schema
    const ast = DocumentNodeSchema.parse(rawObj);

    console.log(`[Generate Doc] AST successfully parsed, generating DOCX buffer...`);
    const buffer = await buildDocx(ast);

    return { ast, buffer };
}
