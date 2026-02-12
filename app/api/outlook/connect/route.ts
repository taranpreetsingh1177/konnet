import { getOutlookAuthUrl } from "@/lib/outlook";
import { NextResponse } from "next/server";

export async function GET() {
    const url = getOutlookAuthUrl();
    return NextResponse.redirect(url);
}
