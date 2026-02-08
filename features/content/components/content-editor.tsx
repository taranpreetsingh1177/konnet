"use client";

import { useEffect, useState } from "react";
import { Editor } from "@/components/editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getDefaultTemplate, updateTemplate, type EmailTemplate } from "../actions/content-actions";
import { Loader2, Save } from "lucide-react";

export function ContentEditor() {
    const [template, setTemplate] = useState<EmailTemplate | null>(null);
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function loadTemplate() {
            try {
                const data = await getDefaultTemplate();
                setTemplate(data);
                setSubject(data.subject);
                setBody(data.body);
            } catch (error) {
                console.error("Failed to load template:", error);
                toast.error("Failed to load template");
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
            await updateTemplate(template.id, { subject, body });
            toast.success("Template saved successfully");
            // Update local state to reflect saved version if needed
        } catch (error) {
            console.error("Failed to save template:", error);
            toast.error("Failed to save template");
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
                        <h2 className="text-2xl font-bold tracking-tight">Email Template</h2>
                        <p className="text-muted-foreground">
                            Customize the default email template used for campaigns.
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

                <div className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="subject">Subject Line</Label>
                        <Input
                            id="subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Enter email subject..."
                        />
                        <p className="text-xs text-muted-foreground">
                            Supports {"{{company_name}}"} placeholder.
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label>Email Body</Label>
                        <Editor
                            content={body}
                            onChange={setBody}
                            className="min-h-[400px]"
                        />
                        <p className="text-xs text-muted-foreground">
                            Supports {"{{name}}"} and {"{{company_name}}"} placeholders.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
