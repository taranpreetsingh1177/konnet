import { ContentEditor } from "@/features/content/components/content-editor";
import { Metadata } from "next";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: "Email Content | Konnet",
    description: "Manage email templates and content.",
};

export default function ContentPage() {
    return <ContentEditor />;
}
