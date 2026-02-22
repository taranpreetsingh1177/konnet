import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function fetchCompanyData(companyId: string) {
    const { data: company, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single();

    if (error || !company) {
        throw new Error(`Failed to fetch company: ${error?.message}`);
    }

    return company;
}
