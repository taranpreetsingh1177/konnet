import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type UpdateCompanyPayload = {
    companyId: string;
    emailSubject?: string;
    emailBody?: string;
    docUrl?: string;
    linkedinMessage?: string;
    metadata: object;
};

export async function updateCompanyRecord(payload: UpdateCompanyPayload) {

    const updateData: any = {
        enrichment_status: "COMPLETED",
        metadata: payload.metadata,
    };

    if (payload.emailSubject) updateData.email_subject = payload.emailSubject;
    if (payload.emailBody) updateData.email_template = payload.emailBody;

    // These require 'doc_url' and 'linkedin_message' columns to exist on the table
    if (payload.docUrl) updateData.doc_url = payload.docUrl;
    if (payload.linkedinMessage) updateData.linkedin_message = payload.linkedinMessage;

    const { error } = await supabase
        .from("companies")
        .update(updateData)
        .eq("id", payload.companyId);

    if (error) {
        throw new Error(`Failed to update company record: ${error.message}`);
    }

    return true;
}
