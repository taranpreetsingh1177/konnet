"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import React from "react";

interface Field {
  name: string;
  label: string;
  type: string;
  placeholder?: string;
}

interface CustomButton {
  label: string;
  variant?:
  | "default"
  | "outline"
  | "secondary"
  | "ghost"
  | "link"
  | "destructive";
  type?: "submit" | "button";
  onClick?: () => void;
  loading?: boolean;
  loadingText?: string;
}

interface FormComponentProps {
  title: React.ReactNode;
  schema: z.ZodTypeAny;
  fields: Field[];
  buttons: CustomButton[];
  onSubmit: (data: Record<string, unknown>) => void;
  loading?: boolean;
  error?: string | null;
  description?: string;
}

export function FormComponent({
  title,
  description,
  schema,
  fields,
  buttons,
  onSubmit,
  loading = false,
  error,
}: FormComponentProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    // Zod resolver is typed as ZodTypeAny, so we need to cast our schema to avoid type issues
    // This is a known issue where the resolver types haven't fully caught up with Zod v4's new type system.
    resolver: zodResolver(schema as any),
  });

  return (
    <>

      <Card className="w-[380px]">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((data) =>
              onSubmit(data as Record<string, unknown>),
            )}
            className="space-y-4"
          >
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}
            {fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>{field.label}</Label>
                <Input
                  id={field.name}
                  type={field.type}
                  placeholder={field.placeholder}
                  {...register(field.name)}
                  disabled={loading}
                />
                {errors[field.name] && (
                  <p className="text-sm text-red-500">
                    {errors[field.name]?.message as string}
                  </p>
                )}
              </div>
            ))}
            <div className="flex flex-col space-y-2 pt-2">
              {buttons.map((button, index) => (
                <Button
                  key={index}
                  type={button.type || "submit"}
                  className="w-full"
                  variant={button.variant || "default"}
                  disabled={loading}
                  onClick={button.onClick}
                >
                  {button.loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                      {button.loadingText || "Loading..."}
                    </>
                  ) : (
                    button.label
                  )}
                </Button>
              ))}
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
