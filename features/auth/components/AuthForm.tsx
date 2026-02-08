"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail } from "lucide-react";
import { z } from "zod";
import { FormComponent } from "@/components/FormComponent";
import { sendMagicLink } from "../actions/ServerActions";

function AuthForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const authSchema = z.object({
    email: z.string().email("Invalid email address"),
  });

  const fields = [
    {
      name: "email",
      label: "Email",
      type: "email",
      placeholder: "m@example.com",
    },
  ];

  const buttons = [
    {
      label: "Send Magic Link",
      variant: "default" as const,
      loading: loading,
      loadingText: "Sending link...",
    },
  ];

  const handleSubmit = async (data: Record<string, unknown>) => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("email", data.email as string);

      const result = await sendMagicLink(formData);

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setSuccess(result.success || "Check your email for the magic link.");
      setLoading(false);
    } catch {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <FormComponent
      title={<p className="text-md">Konnet</p>}
      schema={authSchema}
      fields={fields}
      buttons={buttons}
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      description="A secure link will be sent to your inbox."
    />
  );
}

export default AuthForm;
