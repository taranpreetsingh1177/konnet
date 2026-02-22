"use server";

import { createClient } from "@/lib/supabase/server";
import { DEFAULT_EMAIL_BODY, DEFAULT_EMAIL_SUBJECT } from "@/lib/email/default-template";
import { revalidatePath } from "next/cache";

export type EmailTemplate = {
    id: string;
    name: string;
    subject: string;
    body: string;
    is_default: boolean;
    company_system_prompt?: string | null;
    company_user_prompt?: string | null;
    updated_at: string;
};

export type PromptType = 'doc' | 'linkedin' | 'mail';

export type PromptRecord = {
    id: string;
    user_id: string;
    type: PromptType;
    system_prompt: string | null;
    user_prompt: string | null;
    validation_prompt: string | null;
    created_at: string;
    updated_at: string;
};

export async function getPrompt(type: PromptType): Promise<PromptRecord | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    const { data: existing, error } = await supabase
        .from("prompts")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", type)
        .single();

    if (error && error.code !== 'PGRST116') {
        // PGRST116 means zero rows found, which is fine
        console.error("Error fetching prompt:", error);
        throw new Error("Failed to fetch prompt");
    }

    return existing as PromptRecord | null;
}

export async function savePrompt(type: PromptType, systemPrompt: string, userPrompt: string, validationPrompt: string = "") {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    const { error } = await supabase
        .from("prompts")
        .upsert(
            {
                user_id: user.id,
                type,
                system_prompt: systemPrompt,
                user_prompt: userPrompt,
                validation_prompt: validationPrompt,
                updated_at: new Date().toISOString()
            },
            { onConflict: 'user_id,type' }
        );

    if (error) {
        console.error("Error upserting prompt:", error);
        throw new Error("Failed to save prompt");
    }

    revalidatePath("/dashboard/prompts");
    return { success: true };
}

export async function getDefaultTemplate() {
    const supabase = await createClient();


    // transformative step: check for existing default template
    const { data: existing } = await supabase
        .from("email_templates")
        .select("*")
        .eq("is_default", true)
        .single();

    if (existing) {
        return existing as EmailTemplate;
    }

    // if not exists, create it
    const { data: newTemplate, error } = await supabase
        .from("email_templates")
        .insert({
            name: "Default Template",
            subject: DEFAULT_EMAIL_SUBJECT,
            body: DEFAULT_EMAIL_BODY,
            is_default: true,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating default template:", error);
        throw new Error("Failed to create default template");
    }

    return newTemplate as EmailTemplate;
}

export async function updateTemplate(id: string, updates: Partial<EmailTemplate>) {
    const supabase = await createClient();


    const { error } = await supabase
        .from("email_templates")
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)

    if (error) {
        console.error("Error updating template:", error);
        throw new Error("Failed to update template");
    }

    revalidatePath("/dashboard/prompts");
    return { success: true };
}
