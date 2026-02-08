"use client";

import AuthForm from "@/features/auth/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-4">
        <AuthForm />
      </div>
    </div>
  );
}
