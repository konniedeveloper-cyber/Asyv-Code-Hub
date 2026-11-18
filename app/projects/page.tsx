import { Projects } from "@/components/projects/projects";
import { createMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = createMetadata({
  title: "Explore projects",
  description: "Explore projects shared by the Asyv School community.",
  path: "/projects",
});

export default function ProjectsPage(): ReactNode {
  return (
    <main id="main-content" className="flex flex-1 flex-col pb-24">
      <section className="mx-auto w-full max-w-275 px-6 pt-28 pb-10 sm:px-10 sm:pt-36 sm:pb-14">
        <h1 className="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
          Explore projects
        </h1>
        <p className="text-foreground/65 mt-4 max-w-xl text-lg leading-relaxed">
          Browse ideas and experiments from the Asyv School community.
        </p>
      </section>
      <Projects />
    </main>
  );
}
