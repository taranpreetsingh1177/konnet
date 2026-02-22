import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function uploadDocumentToSupabase(
    companyId: string,
    buffer: Buffer,
    companyName: string
): Promise<string> {

    const cleanName = companyName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const filePath = `${companyId}/${cleanName}-proposal.docx`;

    const { error } = await supabase.storage
        .from("documents")
        .upload(filePath, buffer, {
            contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            upsert: true,
        });

    if (error) {
        throw new Error(`Failed to upload document to Supabase storage: ${error.message}`);
    }

    const { data: publicUrlData } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
}
