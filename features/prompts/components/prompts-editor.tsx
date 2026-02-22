"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getPrompt, savePrompt, type PromptType } from "../actions/content-actions";
import { Loader2, Save, FileText, Globe, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

const PROMPT_CATEGORIES = [
    { id: 'doc' as PromptType, label: 'Document', icon: FileText, desc: 'Instructions for doc generation' },
    { id: 'linkedin' as PromptType, label: 'LinkedIn', icon: Globe, desc: 'Instructions for social outreach' },
    { id: 'mail' as PromptType, label: 'Email', icon: Mail, desc: 'Instructions for email campaigns' }
] as const;

export function PromptsEditor() {
    const [activeCategory, setActiveCategory] = useState<PromptType>('doc');
    const [systemPrompt, setSystemPrompt] = useState("");
    const [userPrompt, setUserPrompt] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const loadPromptForCategory = useCallback(async (category: PromptType) => {
        setLoading(true);
        try {
            const data = await getPrompt(category);
            if (data) {
                setSystemPrompt(data.system_prompt || "");
                setUserPrompt(data.user_prompt || "");
            } else {
                setSystemPrompt("");
                setUserPrompt("");
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
            await savePrompt(activeCategory, systemPrompt, userPrompt);
            toast.success("Prompt saved successfully");
        } catch (error) {
            console.error("Failed to save prompt:", error);
            toast.error("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex h-full border rounded-lg overflow-hidden bg-background">
            {/* Left Sidebar Layout */}
            <div className="w-64 border-r bg-muted/20 flex flex-col p-4">
                <div className="space-y-1">
                    {PROMPT_CATEGORIES.map((cat) => {
                        const Icon = cat.icon;
                        const isActive = activeCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={cn(
                                    "w-full flex items-center justify-start gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                                    isActive
                                        ? "bg-primary text-primary-foreground font-medium"
                                        : "hover:bg-muted text-foreground"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{cat.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Right Body Layout */}
            <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h3 className="text-lg font-semibold">
                            {PROMPT_CATEGORIES.find(c => c.id === activeCategory)?.label} Settings
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {PROMPT_CATEGORIES.find(c => c.id === activeCategory)?.desc}
                        </p>
                    </div>
                    <Button onClick={handleSave} disabled={saving || loading}>
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

                <div className="flex-1 p-6 relative">
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : null}

                    <Tabs defaultValue="system" className="w-full h-full flex flex-col">
                        <TabsList className="mb-4">
                            <TabsTrigger value="system">System Prompt</TabsTrigger>
                            <TabsTrigger value="user">User Prompt</TabsTrigger>
                        </TabsList>

                        <TabsContent value="system" className="flex-1 m-0">
                            <Textarea
                                value={systemPrompt}
                                onChange={(e) => setSystemPrompt(e.target.value)}
                                placeholder="Enter system instructions (defines persona, tone, rules)..."
                                className="h-[400px] resize-none font-mono text-sm leading-relaxed"
                            />
                        </TabsContent>

                        <TabsContent value="user" className="flex-1 m-0">
                            <Textarea
                                value={userPrompt}
                                onChange={(e) => setUserPrompt(e.target.value)}
                                placeholder="Enter user instructions (appended query, formatting guidelines)..."
                                className="h-[400px] resize-none font-mono text-sm leading-relaxed"
                            />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
