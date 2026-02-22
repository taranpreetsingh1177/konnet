"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { inngest } from "@/lib/inngest/client";

export type LeadInput = {
  email: string;
  linkedin_url?: string;
  name?: string;
  company?: string;
  role?: string;
  custom_fields?: Record<string, string>;
};

export async function createLeads(leads: LeadInput[], tag?: string, advancedEnrichment?: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Dispatch the foreground creation process to the durable Inngest background job
    await inngest.send({
      name: "leads/import.requested",
      data: {
        leads,
        tag,
        advancedEnrichment,
        userId: user.id
      }
    });

    revalidatePath("/dashboard/leads");

    return {
      success: true,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getLeads() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data } = await supabase
    .from("leads")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function deleteLead(leadId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", leadId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/leads");
  return { success: true };
}

export async function updateLead(leadId: string, updates: Partial<LeadInput>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", leadId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/leads");
  return { success: true };
}

export async function getUniqueTags() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Use efficient server-side DISTINCT via RPC to avoid row limits
  const { data, error } = await supabase
    .rpc("get_unique_tags_v2", { p_user_id: user.id });

  if (error) {
    console.error("[getUniqueTags] RPC Error:", error);
    // Return error as a tag for immediate UI feedback during debugging
    return [`Error: ${error.message}`];
  }

  if (!data) return [];

  // Data is returned as [{ tag: "value" }, ...]
  const tags = data
    .map((d: any) => d.tag)
    .filter((t: string) => t && t.trim() !== "")
    .sort();

  return [...tags, `DEBUG: ${user.id} (${tags.length})`];
}
