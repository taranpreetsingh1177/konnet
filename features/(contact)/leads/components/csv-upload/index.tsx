"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UploadCloud } from "lucide-react";
import { createLeads, type LeadInput } from "../../actions/actions";

import { UploadStep } from "./upload-step";
import { MappingStep } from "./mapping-step";
import { FieldMapping } from "./types";

type CSVUploadModalProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
};

export function CSVUploadModal({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
}: CSVUploadModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const [step, setStep] = useState<"upload" | "mapping">("upload");
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({
    email: "",
    linkedin_url: "",
    name: "",
    company: "",
    role: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [tagName, setTagName] = useState("");
  const [advancedEnrichment, setAdvancedEnrichment] = useState(false);

  const handleFileParsed = (
    parsedHeaders: string[],
    parsedData: string[][],
    autoMapping: FieldMapping,
    autoDetectedTag: string
  ) => {
    setHeaders(parsedHeaders);
    setCsvData(parsedData);
    setFieldMapping(autoMapping);
    setTagName(autoDetectedTag);
    setStep("mapping");
  };

  const handleImport = async () => {
    if (!fieldMapping.email) {
      setError("Email field mapping is required");
      return;
    }

    setError(null);

    try {
      const emailIndex = headers.indexOf(fieldMapping.email);
      const linkedinIndex = fieldMapping.linkedin_url
        ? headers.indexOf(fieldMapping.linkedin_url)
        : -1;
      const nameIndex = fieldMapping.name
        ? headers.indexOf(fieldMapping.name)
        : -1;
      const companyIndex = fieldMapping.company
        ? headers.indexOf(fieldMapping.company)
        : -1;
      const roleIndex = fieldMapping.role
        ? headers.indexOf(fieldMapping.role)
        : -1;

      // Get custom fields (columns not mapped to standard fields)
      const mappedColumns = [
        fieldMapping.email,
        fieldMapping.linkedin_url,
        fieldMapping.name,
        fieldMapping.company,
        fieldMapping.role,
      ].filter(Boolean);

      const customFieldHeaders = headers.filter(
        (h) => !mappedColumns.includes(h)
      );

      const leads: LeadInput[] = csvData
        .filter((row) => row[emailIndex]?.trim()) // Must have email
        .map((row) => {
          const customFields: Record<string, string> = {};
          customFieldHeaders.forEach((header) => {
            const idx = headers.indexOf(header);
            if (idx >= 0 && row[idx]?.trim()) {
              customFields[header] = row[idx].trim();
            }
          });

          return {
            email: row[emailIndex]?.trim() || "",
            linkedin_url:
              linkedinIndex >= 0 ? row[linkedinIndex]?.trim() : undefined,
            name: nameIndex >= 0 ? row[nameIndex]?.trim() : undefined,
            company: companyIndex >= 0 ? row[companyIndex]?.trim() : undefined,
            role: roleIndex >= 0 ? row[roleIndex]?.trim() : undefined,
            custom_fields:
              Object.keys(customFields).length > 0 ? customFields : undefined,
          };
        });

      // Dispatch the job
      const result = await createLeads(leads, tagName, advancedEnrichment);

      if (result.success) {
        // Since it's imported in the background, we just close and reset the modal
        onSuccess?.();
        handleOpenChange(false);
      } else {
        setError(result.error || "Failed to start lead import job.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during import setup.");
    }
  };

  const resetModal = () => {
    setStep("upload");
    setCsvData([]);
    setHeaders([]);
    setFieldMapping({
      email: "",
      linkedin_url: "",
      name: "",
      company: "",
      role: "",
    });
    setError(null);
    setTagName("");
    setAdvancedEnrichment(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Delay resetting state until dialog animation finishes
      setTimeout(resetModal, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {controlledOpen === undefined && (
        <DialogTrigger>
          <Button
            variant="outline"
            className="text-primary border-primary hover:text-primary-foreground hover:bg-primary"
          >
            <UploadCloud className="size-4 mr-2" />
            Upload
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        {step === "upload" && (
          <>
            <DialogHeader>
              <DialogTitle>Upload CSV File</DialogTitle>
              <DialogDescription>
                Upload a CSV file containing your leads data.
              </DialogDescription>
            </DialogHeader>
            <UploadStep
              onFileParsed={handleFileParsed}
              error={error}
              setError={setError}
            />
          </>
        )}

        {step === "mapping" && (
          <>
            <DialogHeader>
              <DialogTitle>Map Your Fields</DialogTitle>
              <DialogDescription>
                Match your CSV columns to lead fields. Found {csvData.length}{" "}
                rows.
              </DialogDescription>
            </DialogHeader>
            <MappingStep
              headers={headers}
              fieldMapping={fieldMapping}
              setFieldMapping={setFieldMapping}
              tagName={tagName}
              setTagName={setTagName}
              advancedEnrichment={advancedEnrichment}
              setAdvancedEnrichment={setAdvancedEnrichment}
              onImport={handleImport}
              onBack={() => setStep("upload")}
              csvDataLength={csvData.length}
              error={error}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
