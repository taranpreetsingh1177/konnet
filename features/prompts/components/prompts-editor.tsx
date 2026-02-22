"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getPrompt, savePrompt, type PromptType } from "../actions/content-actions";
import { Loader2, Save, FileText, Globe, Mail } from "lucide-react";
import { injectVariables } from "@/lib/prompts/variable-injector";

const PROMPT_CATEGORIES = [
    { id: 'doc' as PromptType, label: 'Document', icon: FileText, desc: 'Instructions for doc generation' },
    { id: 'linkedin' as PromptType, label: 'LinkedIn', icon: Globe, desc: 'Instructions for social outreach' },
    { id: 'mail' as PromptType, label: 'Email', icon: Mail, desc: 'Instructions for email campaigns' }
] as const;

const previewData = {
    companyName: "Alvion AI",
    domain: "alvion.ai",
    researchContext: "- Recently secured $5M in seed funding.\n- Launching new AI agent platform next quarter.\n- Primary tech stack is Next.js and Vercel AI SDK.",
};

export function PromptsEditor() {
    const [activeCategory, setActiveCategory] = useState<PromptType>('doc');
    const [activeTab, setActiveTab] = useState<"system" | "user" | "validation">("system");
    const [systemPrompt, setSystemPrompt] = useState("");
    const [userPrompt, setUserPrompt] = useState("");
    const [validationPrompt, setValidationPrompt] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Simple append insertion logic. For full cursor tracking, we would need a ref, 
    // but appending is a reliable standard for textareas without complex cursor state.
    const handleInsertVariable = (variable: string, currentText: string, setter: (val: string) => void) => {
        const spacer = currentText.length > 0 && !currentText.endsWith(' ') ? ' ' : '';
        setter(currentText + spacer + variable);
    };

    const loadPromptForCategory = useCallback(async (category: PromptType) => {
        setLoading(true);
        try {
            const data = await getPrompt(category);
            if (data) {
                setSystemPrompt(data.system_prompt || "");
                setUserPrompt(data.user_prompt || "");
                setValidationPrompt(data.validation_prompt || "");
            } else {
                setSystemPrompt("");
                setUserPrompt("");
                setValidationPrompt("");
            }
        } catch (error) {
            console.error("Failed to load prompt:", error);
            toast.error("Failed to load prompt for this category");
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        loadPromptForCategory(activeCategory);
    }, [activeCategory, loadPromptForCategory]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await savePrompt(activeCategory, systemPrompt, userPrompt, validationPrompt);
            toast.success("Prompt saved successfully");
        } catch (error) {
            console.error("Failed to save prompt:", error);
            toast.error("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background rounded-lg border shadow-sm w-full">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 border-b gap-4">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 flex-1">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">Prompts & Templates</h2>
                        <p className="text-sm text-muted-foreground whitespace-nowrap">
                            Manage your generation instructions.
                        </p>
                    </div>

                    <div className="hidden md:block h-8 w-px bg-border mx-2"></div>

                    <Select value={activeCategory} onValueChange={(v) => setActiveCategory(v as PromptType)}>
                        <SelectTrigger className="w-full md:w-[180px] h-10">
                            <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent>
                            {PROMPT_CATEGORIES.map(cat => (
                                <SelectItem value={cat.id} key={cat.id}>
                                    <div className="flex items-center gap-2">
                                        <cat.icon className="w-4 h-4" />
                                        <span>{cat.label}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <Select value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
                        <SelectTrigger className="w-full md:w-[180px] h-10">
                            <SelectValue placeholder="Select Prompt Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="system">System Prompt</SelectItem>
                            <SelectItem value="user">User Prompt</SelectItem>
                            <SelectItem value="validation">Validation Prompt</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button onClick={handleSave} disabled={saving || loading} className="w-full md:w-auto">
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex flex-col p-6 relative">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                )}

                <Tabs defaultValue="edit" className="w-full h-full flex flex-col flex-1">
                    <div className="flex flex-row items-center justify-between mb-4 gap-2">
                        <TabsList className="h-9 shrink-0">
                            <TabsTrigger value="edit" className="text-sm px-4">Edit</TabsTrigger>
                            <TabsTrigger value="preview" className="text-sm px-4">Preview</TabsTrigger>
                        </TabsList>
                        <div className="overflow-x-auto">
                            <VariablePills onInsert={(v) => {
                                if (activeTab === "system") handleInsertVariable(v, systemPrompt, setSystemPrompt);
                                else if (activeTab === "user") handleInsertVariable(v, userPrompt, setUserPrompt);
                                else if (activeTab === "validation") handleInsertVariable(v, validationPrompt, setValidationPrompt);
                            }} />
                        </div>
                    </div>

                    <TabsContent value="edit" className="flex-1 m-0 flex flex-col">
                        <Textarea
                            value={activeTab === "system" ? systemPrompt : activeTab === "user" ? userPrompt : validationPrompt}
                            onChange={(e) => {
                                if (activeTab === "system") setSystemPrompt(e.target.value);
                                else if (activeTab === "user") setUserPrompt(e.target.value);
                                else if (activeTab === "validation") setValidationPrompt(e.target.value);
                            }}
                            placeholder={
                                activeTab === "system" ? "Enter system instructions (defines persona, tone, rules)..." :
                                    activeTab === "user" ? "Enter user instructions (appended query, formatting guidelines)..." :
                                        "Enter strict QA constraints (e.g. 'Reject if length > 300' or 'Fail if {{company_name}} is not present')..."
                            }
                            className="flex-1 resize-none font-mono text-sm leading-relaxed p-4 h-full"
                        />
                    </TabsContent>

                    <TabsContent value="preview" className="flex-1 m-0 p-6 border rounded-md bg-muted/5 whitespace-pre-wrap font-sans text-sm overflow-y-auto w-full max-w-none shadow-inner h-full">
                        {injectVariables(
                            activeTab === "system" ? (systemPrompt || "No prompt entered.") :
                                activeTab === "user" ? (userPrompt || "No prompt entered.") :
                                    (validationPrompt || "No prompt entered."),
                            previewData
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

function VariablePills({ onInsert }: { onInsert: (val: string) => void }) {
    const vars = [
        { label: "Company Name", val: "{{company_name}}" },
        { label: "Company Domain", val: "{{company_domain}}" },
        { label: "Research Context", val: "{{research_context}}" },
    ];
    return (
        <div className="flex gap-2">
            {vars.map(v => (
                <Button
                    key={v.val}
                    variant="secondary"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onInsert(v.val)}
                >
                    + {v.label}
                </Button>
            ))}
        </div>
    );
}
