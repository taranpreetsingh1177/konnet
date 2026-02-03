/**
 * Email Template Builder
 * Converts structured JSON blocks into professional HTML email format
 */

export type EmailBlock =
    | { type: 'text'; content: string }
    | { type: 'boxes'; items: ServiceBox[] };

export type ServiceBox = {
    icon: string;
    title: string;
    subtitle: string;
};

export type StructuredEmail = {
    subject: string;
    blocks: EmailBlock[];
};

/**
 * Convert structured JSON to HTML email
 */
export function convertStructuredToHTML(structured: StructuredEmail): { subject: string; body: string } {
    const htmlBlocks = structured.blocks.map(block => {
        if (block.type === 'text') {
            return buildTextBlock(block.content);
        } else {
            return buildBoxes(block.items);
        }
    }).join('\n');

    const body = buildCompleteEmail(htmlBlocks);

    return {
        subject: structured.subject,
        body,
    };
}

/**
 * Build a text paragraph block
 */
function buildTextBlock(content: string): string {
    return `  <p style="font-size: 15px; line-height: 1.6; color: #374151; margin: 0 0 16px 0;">${escapeHtml(content)}</p>`;
}

/**
 * Build service boxes grid (black background with white text)
 */
function buildBoxes(items: ServiceBox[]): string {
    const boxesHtml = items.map((item, index) => {
        const marginRight = index % 2 === 0 ? ' margin-right: 2%;' : '';

        return `    <div style="display: inline-block; width: 48%; vertical-align: top; margin-bottom: 12px;${marginRight}">
      <div style="background: #000000; border: 2px solid #1f2937; border-radius: 12px; padding: 16px 20px;">
        <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #ffffff;">${escapeHtml(item.icon)} ${escapeHtml(item.title)}</p>
        <p style="margin: 0; font-size: 12px; color: #e5e7eb;">${escapeHtml(item.subtitle)}</p>
      </div>
    </div>`;
    }).join('\n');

    return `  <div style="margin: 24px 0;">
${boxesHtml}
  </div>`;
}

/**
 * Wrap blocks in complete email container with signature
 * Outer gray background with white content card inside
 */
function buildCompleteEmail(htmlBlocks: string): string {
    return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: oklch(87% 0 0); padding: 40px; border-radius: 12px;">
  <div style="background: #ffffff; padding: 32px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
${htmlBlocks}
  
  <p style="font-size: 15px; line-height: 1.6; color: #374151; margin: 20px 0 6px 0;">Best regards,</p>
  <p style="font-size: 15px; font-weight: 600; color: #1f2937; margin: 0;">Krish Mittal</p>
  <p style="font-size: 15px; font-weight: 400; color: #4e5a6aff; margin: 0;">Cofounder, Alvion</p>
  </div>
</div>`;
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
