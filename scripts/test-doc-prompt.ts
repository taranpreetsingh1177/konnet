import "dotenv/config";
import { generateText } from "ai";
import { vertex } from "@/lib/vertex-ai/vertex-ai";
// Adjust the import path for vertex if needed depending on your project root
import { DocumentNodeSchema } from "../features/(contact)/companies/lib/docs/docTypes";
import { buildDocx } from "../features/(contact)/companies/lib/docs/buildDocx";
import * as fs from "fs";
import * as path from "path";

/**
 * USAGE:
 * bun run scripts/test-doc-prompt.ts
 * 
 * Edit the SYSTEM_PROMPT, COMPANY_NAME, and COMPANY_DOMAIN below to test formatting.
 */

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
- footer: { "type": "footer", "text": "string" }`;

const COMPANY_NAME = "Konnet AI";
const COMPANY_DOMAIN = "konnet.ai";
const USER_PROMPT = `Generate a strategy proposal for ${COMPANY_NAME} (${COMPANY_DOMAIN}). Firm preparing the proposal: Alvion AI Strategy.`;

async function main() {
    console.log("🚀 Starting Document AST Generation Test");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    try {
        console.log("🤖 Calling Gemini via Vertex AI using generateText...");

        const strictPrompt = SYSTEM_PROMPT + "\n\nCRITICAL: You must return strictly valid JSON. Do not include markdown formatting or extra text outside the JSON object. The root of the JSON must be an object with a 'nodes' array.";

        const { text } = await generateText({
            model: vertex("gemini-3-flash-preview"),
            system: strictPrompt,
            prompt: USER_PROMPT,
        });

        console.log('Text: ', text);

        // Clean up markdown wrapping if the AI included it
        const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        console.log("✅ Received JSON. Parsing via Zod...");
        const rawObj = JSON.parse(jsonStr);
        const ast = DocumentNodeSchema.parse(rawObj);

        console.log("✅ AST Parsed Successfully!");

        console.log("\n📦 Building DOCX Buffer...");
        const buffer = await buildDocx(ast);

        const outDir = path.join(process.cwd(), "tmp");
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

        const filePath = path.join(outDir, "test-proposal.docx");
        fs.writeFileSync(filePath, buffer);
        console.log(`\n🎉 Test Document saved to: ${filePath}`);

    } catch (e: any) {
        console.error("❌ Generation Failed:", e);
        if (e.message) console.error("Message:", e.message);
        if (e.cause) console.error("Cause:", JSON.stringify(e.cause, null, 2));
        if (e.response) console.error("Response:", JSON.stringify(e.response, null, 2));
    }
}

main();
