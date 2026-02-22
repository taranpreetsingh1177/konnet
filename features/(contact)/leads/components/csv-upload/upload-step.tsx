"use client";

import React, { useCallback, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileSpreadsheet } from "lucide-react";
import Papa from "papaparse";
import type { FieldMapping } from "./types";

type UploadStepProps = {
    onFileParsed: (
        headers: string[],
        data: string[][],
        autoMapping: FieldMapping,
        filename: string
    ) => void;
    setError: (error: string | null) => void;
    error: string | null;
};

export function UploadStep({ onFileParsed, setError, error }: UploadStepProps) {
    const handleFileUpload = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            setError(null);

            // Extract filename minus extension for the default tag feature
            const filenameWithoutExt = file.name.replace(/\.[^/.]+$/, "");

            Papa.parse(file, {
                complete: (results) => {
                    const data = results.data as string[][];
                    if (data.length < 2) {
                        setError(
                            "CSV file must have at least a header row and one data row"
                        );
                        return;
                    }

                    const headerRow = data[0];
                    const csvData = data.slice(1).filter((row) => row.some((cell) => cell?.trim()));

                    // Auto-detect common field names
                    const autoMapping: FieldMapping = {
                        email: "",
                        linkedin_url: "",
                        name: "",
                        company: "",
                        role: "",
                    };

                    headerRow.forEach((header) => {
                        const lowerHeader = header.toLowerCase().trim();
                        if (lowerHeader.includes("email") || lowerHeader.includes("e-mail")) {
                            autoMapping.email = header;
                        } else if (
                            lowerHeader.includes("linkedin") ||
                            lowerHeader.includes("profile")
                        ) {
                            autoMapping.linkedin_url = header;
                        } else if (
                            lowerHeader.includes("name") &&
                            !lowerHeader.includes("company")
                        ) {
                            autoMapping.name = header;
                        } else if (
                            lowerHeader.includes("company") ||
                            lowerHeader.includes("organization")
                        ) {
                            autoMapping.company = header;
                        } else if (
                            lowerHeader.includes("role") ||
                            lowerHeader.includes("title") ||
                            lowerHeader.includes("position")
                        ) {
                            autoMapping.role = header;
                        }
                    });

                    onFileParsed(headerRow, csvData, autoMapping, filenameWithoutExt);
                },
                error: (parseError) => {
                    setError(`Failed to parse CSV: ${parseError.message}`);
                },
            });
        },
        [onFileParsed, setError]
    );

    return (
        <div className="grid gap-4 py-4">
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-12 hover:border-gray-400 transition-colors">
                <FileSpreadsheet className="w-12 h-12 text-gray-400 mb-4" />
                <Label htmlFor="csv-upload" className="cursor-pointer text-center">
                    <span className="text-primary font-medium">Click to upload</span>
                    <span className="text-gray-500"> or drag and drop</span>
                    <p className="text-xs text-gray-400 mt-1">CSV files only</p>
                </Label>
                <Input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileUpload}
                />
            </div>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        </div>
    );
}
