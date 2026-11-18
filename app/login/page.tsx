import { AuthForm } from "@/components/auth/auth-form";
import { createMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = createMetadata({
  title: "Account",
  description: "Sign in or create an Asyv Code Hub account.",
  path: "/login",
});

export default function LoginPage(): ReactNode {
  return (
    <main
      id="main-content"
      className="flex flex-1 items-start justify-center px-6 pt-28 pb-28 sm:pt-36"
    >
      <section className="border-foreground/10 bg-background w-full max-w-md rounded-3xl border p-6 sm:p-8">
        <p className="text-foreground/55 mb-3 text-sm font-medium tracking-[0.16em] uppercase">
          Asyv Code Hub
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Your account</h1>
        <p className="text-foreground/65 mt-3 mb-7 text-sm leading-relaxed">
          Sign in to publish projects and like work from other students.
        </p>
        <AuthForm />
      </section>
    </main>
  );
}
