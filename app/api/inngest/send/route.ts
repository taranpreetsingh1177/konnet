import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, data } = body;

        if (!name || !data) {
            return NextResponse.json(
                { error: "Missing event name or data" },
                { status: 400 }
            );
        }

        // Send event to Inngest
        await inngest.send({
            name,
            data,
        });

        return NextResponse.json({ success: true, message: "Event sent successfully" });
    } catch (error: any) {
        console.error("Error sending Inngest event:", error);
        return NextResponse.json(
            { error: error.message || "Failed to send event" },
            { status: 500 }
        );
    }
}
