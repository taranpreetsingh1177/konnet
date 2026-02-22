import { PromptsEditor } from "@/features/prompts/components/prompts-editor";

export default function PromptsPage() {
    return (
        <div className="h-full flex-1 flex-col p-8 flex w-full">
            <div className="flex items-center justify-between space-y-2 mb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Prompts & Templates</h2>
                    <p className="text-muted-foreground">
                        Manage your generation prompts for Docs, LinkedIn, and Mail campaigns.
                    </p>
                </div>
            </div>

            <PromptsEditor />
        </div>
    );
}
