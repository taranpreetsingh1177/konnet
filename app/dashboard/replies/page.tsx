
import { RepliesTable } from "@/features/replies/components/replies-table";
import { Separator } from "@/components/ui/separator";

export default function RepliesPage() {
    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Replies</h1>
                <p className="text-muted-foreground">
                    Track and manage incoming replies from your campaigns.
                </p>
            </div>
            <Separator />

            <RepliesTable />
        </div>
    );
}
