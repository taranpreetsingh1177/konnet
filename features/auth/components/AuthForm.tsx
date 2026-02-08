"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signInWithGoogle } from "../actions/ServerActions";
import { GoogleIcon } from "hugeicons-react";

function AuthForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleGoogleSignIn = () => {
    setError(null);
    startTransition(async () => {
      const result = await signInWithGoogle();
      if (result.error) {
        setError(result.error);
      } else if (result.url) {
        window.location.href = result.url;
      }
    });
  };

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Konnet</CardTitle>
        <CardDescription>Sign in with your Google account.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <Button
            onClick={handleGoogleSignIn}
            disabled={isPending}
            variant={"outline"}
            className="w-full text-primary border-primary hover:bg-primary hover:text-primary-foreground"
          >
            <GoogleIcon className="size-4" />
            {isPending ? "Signing in..." : "Sign in with Google"}
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default AuthForm;
