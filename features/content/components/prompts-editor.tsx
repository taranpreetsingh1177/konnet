"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getDefaultTemplate, updateTemplate, type EmailTemplate } from "../actions/content-actions";
import { Loader2, Save } from "lucide-react";

export function PromptsEditor() {
    const [template, setTemplate] = useState<EmailTemplate | null>(null);
    const [systemPrompt, setSystemPrompt] = useState("");
    const [userPrompt, setUserPrompt] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function loadTemplate() {
            try {
                const data = await getDefaultTemplate();
                setTemplate(data);
                setSystemPrompt(data.company_system_prompt || "");
                setUserPrompt(data.company_user_prompt || "");
            } catch (error) {
                console.error("Failed to load prompts:", error);
                toast.error("Failed to load prompts");
            } finally {
                setLoading(false);
            }
        }
        loadTemplate();
    }, []);

    const handleSave = async () => {
        if (!template) return;

        setSaving(true);
        try {
            await updateTemplate(template.id, {
                company_system_prompt: systemPrompt,
                company_user_prompt: userPrompt
            });
            toast.success("Prompts saved successfully");
        } catch (error) {
            console.error("Failed to save prompts:", error);
            toast.error("Failed to save prompts");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto w-full">
            <div className="space-y-6 max-w-4xl mx-auto p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">AI Prompts</h2>
                        <p className="text-muted-foreground">
                            Configure the AI prompts used for generating company emails.
                        </p>
                    </div>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </div>

                <div className="space-y-6">
                    <div className="grid gap-2">
                        <Label htmlFor="systemPrompt">System Prompt</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                            Defines the persona, tone, and strict rules for the AI.
                        </p>
                        <Textarea
                            id="systemPrompt"
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            placeholder="Enter system prompt..."
                            className="min-h-[200px] font-mono text-sm"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="userPrompt">User Prompt Extension</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                            Additional instructions appended to the user prompt. Use <code>{"{{name}}"}</code> and <code>{"{{domain}}"}</code> variables.
                        </p>
                        <Textarea
                            id="userPrompt"
                            value={userPrompt}
                            onChange={(e) => setUserPrompt(e.target.value)}
                            placeholder="Enter user prompt logic..."
                            className="min-h-[200px] font-mono text-sm"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
