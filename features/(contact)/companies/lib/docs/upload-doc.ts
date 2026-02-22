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
    console.log(`[Upload Doc] Uploading document for ${companyName}...`);

    // Clean filename
    const cleanName = companyName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const filePath = `${companyId}/${cleanName}-proposal.docx`;

    const { data, error } = await supabase.storage
        .from("documents") // MUST exist in Supabase storage buckets
        .upload(filePath, buffer, {
            contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            upsert: true,
        });

    if (error) {
        throw new Error(`Failed to upload document to Supabase storage: ${error.message}`);
    }

    // Get the public URL for the uploaded document
    const { data: publicUrlData } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

    console.log(`[Upload Doc] Successfully uploaded. URL: ${publicUrlData.publicUrl}`);

    return publicUrlData.publicUrl;
}
