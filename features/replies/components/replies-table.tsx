
"use client";

import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export function RepliesTable() {
    const searchParams = useSearchParams();
    const page = Number(searchParams.get("page")) || 1;
    const limit = 50;

    const { data, isLoading, isError } = trpc.replies.getAll.useQuery({
        page,
        limit,
    });

    if (isLoading) {
        return <Skeleton className="w-full h-[400px]" />;
    }

    if (isError || !data) {
        return <div className="text-red-500">Failed to load replies.</div>;
    }

    if (data.data.length === 0) {
        return <div className="p-4 text-center text-muted-foreground">No replies found.</div>;
    }

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Lead</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Received</TableHead>
                        <TableHead>Campaign</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.data.map((reply: any) => (
                        <TableRow key={reply.id}>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium">{reply.leads?.name || "Unknown"}</span>
                                    <span className="text-xs text-muted-foreground">{reply.leads?.email}</span>
                                </div>
                            </TableCell>
                            <TableCell>{reply.leads?.companies?.name || "-"}</TableCell>
                            <TableCell>
                                <div className="flex flex-col max-w-[300px]">
                                    <span className="truncate font-medium">{reply.subject}</span>
                                    <span className="truncate text-xs text-muted-foreground">{reply.snippet}</span>
                                </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                                {reply.received_at
                                    ? formatDistanceToNow(new Date(reply.received_at), { addSuffix: true })
                                    : "-"}
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline">{reply.campaigns?.name || "Unknown"}</Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
