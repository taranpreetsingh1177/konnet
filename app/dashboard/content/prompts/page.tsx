import { PromptsEditor } from "@/features/content/components/prompts-editor";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "AI Prompts | Konnet",
    description: "Manage AI prompts for email generation.",
};

export default function PromptsPage() {
    return <PromptsEditor />;
}
