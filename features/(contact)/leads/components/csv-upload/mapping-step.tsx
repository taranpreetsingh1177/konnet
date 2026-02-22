"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { FieldMapping } from "./types";

type MappingStepProps = {
    headers: string[];
    fieldMapping: FieldMapping;
    setFieldMapping: React.Dispatch<React.SetStateAction<FieldMapping>>;
    tagName: string;
    setTagName: (tag: string) => void;
    onImport: () => void;
    onBack: () => void;
    csvDataLength: number;
    advancedEnrichment: boolean;
    setAdvancedEnrichment: (val: boolean) => void;
    error: string | null;
};

export function MappingStep({
    headers,
    fieldMapping,
    setFieldMapping,
    tagName,
    setTagName,
    onImport,
    onBack,
    csvDataLength,
    advancedEnrichment,
    setAdvancedEnrichment,
    error,
}: MappingStepProps) {
    return (
        <>
            <div className="grid gap-4 py-4">
                <div className="grid gap-3">
                    <div className="grid grid-cols-2 gap-4 items-center">
                        <Label>Email *</Label>
                        <Select
                            value={fieldMapping.email || undefined}
                            onValueChange={(val) =>
                                setFieldMapping((prev: FieldMapping) => ({ ...prev, email: val || "" }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select column" />
                            </SelectTrigger>
                            <SelectContent>
                                {headers.map((header) => (
                                    <SelectItem key={header} value={header}>
                                        {header}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4 items-center">
                        <Label>Name</Label>
                        <Select
                            value={fieldMapping.name}
                            onValueChange={(val) =>
                                setFieldMapping((prev: FieldMapping) => ({ ...prev, name: val || "" }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select column" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">-- None --</SelectItem>
                                {headers.map((header) => (
                                    <SelectItem key={header} value={header}>
                                        {header}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4 items-center">
                        <Label>Company</Label>
                        <Select
                            value={fieldMapping.company}
                            onValueChange={(val) =>
                                setFieldMapping((prev: FieldMapping) => ({
                                    ...prev,
                                    company: val || "",
                                }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select column" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">-- None --</SelectItem>
                                {headers.map((header) => (
                                    <SelectItem key={header} value={header}>
                                        {header}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4 items-center">
                        <Label>Role / Title</Label>
                        <Select
                            value={fieldMapping.role}
                            onValueChange={(val) =>
                                setFieldMapping((prev: FieldMapping) => ({ ...prev, role: val || "" }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select column" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">-- None --</SelectItem>
                                {headers.map((header) => (
                                    <SelectItem key={header} value={header}>
                                        {header}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4 items-center">
                        <Label>LinkedIn URL</Label>
                        <Select
                            value={fieldMapping.linkedin_url}
                            onValueChange={(val) =>
                                setFieldMapping((prev) => ({
                                    ...prev,
                                    linkedin_url: val || "",
                                }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select column" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">-- None --</SelectItem>
                                {headers.map((header) => (
                                    <SelectItem key={header} value={header}>
                                        {header}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4 items-center border-t pt-4 mt-2">
                        <div className="space-y-1">
                            <Label>Custom Tag (Optional)</Label>
                            <p className="text-xs text-muted-foreground">
                                Assign a tag to all imported leads (e.g. "Event 2024")
                            </p>
                        </div>
                        <Input
                            placeholder="Enter tag name..."
                            value={tagName}
                            onChange={(e) => setTagName(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4 items-center border-t mt-2 pt-4">
                        <div className="space-y-1">
                            <Label>Advanced Enrichment</Label>
                            <p className="text-xs text-muted-foreground">
                                Attempt to find extensive company data (may take longer)
                            </p>
                        </div>
                        <div className="flex justify-end">
                            <Switch
                                checked={advancedEnrichment}
                                onCheckedChange={setAdvancedEnrichment}
                            />
                        </div>
                    </div>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <div className="flex justify-end gap-2 border-t pt-4 mt-2">
                <Button variant="outline" onClick={onBack}>
                    Back
                </Button>
                <Button onClick={onImport}>
                    Import {csvDataLength} Leads
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </>
    );
}
