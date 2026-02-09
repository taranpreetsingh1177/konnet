"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Mail,
  Check,
  Loader2,
  Save,
} from "lucide-react";
import {
  createCampaign,
  startCampaign,
  type CreateCampaignInput,
} from "../actions/actions";

type Account = {
  id: string;
  email: string;
};

type Company = {
  id: string;
  name: string;
  logo_url: string | null;
  leadCount: number;
  availableLeadCount: number;
  email_template?: string | null;
  email_subject?: string | null;
};

type CreateCampaignModalProps = {
  accounts: Account[];
  companies: Company[];
  onSuccess?: () => void;
};

export function CreateCampaignModal({
  accounts,
  companies,
  onSuccess,
}: CreateCampaignModalProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const toggleAccount = (id: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const toggleCompany = (id: string) => {
    setSelectedCompanies((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const selectAllCompanies = () => {
    const filteredCompanies = companies.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    setSelectedCompanies(filteredCompanies.map((c) => c.id));
  };

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCreate = async () => {
    setLoading(true);
    setError(null);

    const input: CreateCampaignInput = {
      name,
      account_ids: selectedAccounts,
      company_ids: selectedCompanies,
      scheduled_at: scheduledAt
        ? new Date(scheduledAt).toISOString()
        : undefined,
    };

    const result = await createCampaign(input);

    if (result.success && result.campaignId) {
      // Immediately start the campaign logic (will be 'scheduled' status if scheduled_at is present)
      const startResult = await startCampaign(result.campaignId);
      if (startResult.success) {
        setOpen(false);
        resetForm();
        onSuccess?.();
      } else {
        setError(startResult.error || "Failed to start campaign");
      }
    } else {
      setError(result.error || "Failed to create campaign");
    }

    setLoading(false);
  };

  const resetForm = () => {
    setStep(1);
    setName("");
    setSelectedAccounts([]);
    setSelectedCompanies([]);
    setScheduledAt("");
    setError(null);
    setSearchQuery("");
  };

  // ... (some code skipped for brevity if identical)

  const canProceedStep1 = name.trim() && selectedAccounts.length > 0;
  const canProceedStep2 = selectedCompanies.length > 0;

  return (
    <Dialog open={open} onOpenChange={() => setOpen(!open)}>
      {/* ... (Step 1 code) */}
      <DialogTrigger>
        <Button className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        {step === 1 && (
          // ... (Step 1 content)
          <>
            <DialogHeader>
              <DialogTitle>Create Campaign</DialogTitle>
              <DialogDescription>
                Step 1: Name your campaign and select Gmail accounts
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  placeholder="Q1 Outreach"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label>Select Gmail Accounts (emails will rotate)</Label>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {accounts.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No Gmail accounts connected. Go to Credentials to add one.
                    </p>
                  ) : (
                    accounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        onClick={() => toggleAccount(account.id)}
                      >
                        <Checkbox
                          id={`account-${account.id}`}
                          checked={selectedAccounts.includes(account.id)}
                          onCheckedChange={() => toggleAccount(account.id)}
                        />
                        <div className="flex items-center gap-3 flex-1">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <label
                            htmlFor={`account-${account.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {account.email}
                          </label>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 2: Select Companies */}
        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Select Targets</DialogTitle>
              <DialogDescription>
                Step 2: Choose which companies to target (
                {selectedCompanies.length} selected)
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <Input
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllCompanies}
                >
                  Select All ({filteredCompanies.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCompanies([])}
                >
                  Clear Selection
                </Button>
              </div>
              <div className="border rounded-lg p-3 max-h-60 overflow-y-auto space-y-1">
                {filteredCompanies.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {companies.length === 0
                      ? "No companies found. Upload leads with company info first."
                      : "No companies match your search."}
                  </p>
                ) : (
                  filteredCompanies.map((company) => (
                    <div
                      key={company.id}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      onClick={() => toggleCompany(company.id)}
                    >
                      <Checkbox
                        id={`company-${company.id}`}
                        checked={selectedCompanies.includes(company.id)}
                        onCheckedChange={() => toggleCompany(company.id)}
                      />
                      <div className="flex items-center gap-3 flex-1">
                        {company.logo_url ? (
                          <img
                            src={company.logo_url}
                            alt={company.name}
                            className="w-8 h-8 object-contain rounded bg-white border border-gray-100 p-0.5"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 uppercase">
                            {company.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-gray-900">
                            {company.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-normal h-5 px-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200"
                            >
                              Total: {company.leadCount}
                            </Badge>
                            {company.availableLeadCount > 0 ? (
                              <Badge
                                variant="secondary"
                                className="text-[10px] font-normal h-5 px-1.5 bg-green-50 text-green-700 hover:bg-green-100 border-green-100"
                              >
                                Available: {company.availableLeadCount}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-normal h-5 px-1.5 text-gray-400 border-dashed"
                              >
                                None Available
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canProceedStep2}>
                Next
                <ArrowRight className="w-4 h-4 mr-2" />
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 3: Review & Schedule */}
        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle>Review & Schedule</DialogTitle>
              <DialogDescription>
                Step 3: Review your campaign and schedule when to send
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Campaign Summary */}
              <div className="border rounded-lg p-4 bg-gray-50/50 space-y-3">
                <div>
                  <Label className="text-xs text-gray-500">Campaign Name</Label>
                  <p className="font-medium">{name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">
                      Gmail Accounts
                    </Label>
                    <p className="font-medium">
                      {selectedAccounts.length} account
                      {selectedAccounts.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">
                      Target Companies
                    </Label>
                    <p className="font-medium">
                      {selectedCompanies.length} compan
                      {selectedCompanies.length !== 1 ? "ies" : "y"}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-gray-500">Total Leads</Label>
                  <p className="font-medium">
                    {selectedCompanies.reduce((sum, id) => {
                      const company = companies.find((c) => c.id === id);
                      return sum + (company?.leadCount || 0);
                    }, 0)}{" "}
                    leads will receive personalized emails
                  </p>
                </div>
              </div>

              {/* Template Info */}
              <div className="border rounded-lg p-4 bg-blue-50/30 border-blue-200">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-blue-900 mb-1">
                      AI-Generated Templates Active
                    </h4>
                    <p className="text-xs text-blue-700">
                      Each company has its own personalized template with custom
                      research and service boxes. Leads will receive their
                      company's specific template with variables replaced.
                    </p>
                  </div>
                </div>
              </div>

              {/* Scheduling Section */}
              <div className="grid gap-2 pt-2">
                <Label htmlFor="schedule">Schedule Send (Optional)</Label>
                <Input
                  id="schedule"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Leave blank to send immediately. Time is in your local
                  timezone.
                </p>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {scheduledAt ? "Scheduling..." : "Sending..."}
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    {scheduledAt ? "Schedule Campaign" : "Send Now"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
