import { MyProjects } from "@/components/projects/my-projects";
import { createMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = createMetadata({
  title: "My projects",
  description: "View your submitted projects and their review status.",
  path: "/my-projects",
});

export default function MyProjectsPage(): ReactNode {
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pt-28 pb-28 sm:px-10 sm:pt-36"
    >
      <p className="text-foreground/55 mb-3 text-sm font-medium tracking-[0.16em] uppercase">
        Your work
      </p>
      <h1 className="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
        My projects
      </h1>
      <p className="text-foreground/65 mt-4 max-w-2xl text-lg leading-relaxed">
        Track project reviews, open previews, or remove your submissions.
      </p>
      <MyProjects />
    </main>
  );
}
