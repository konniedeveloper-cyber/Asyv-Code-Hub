import { Projects } from "@/components/projects/projects";
import { createMetadata, siteConfig } from "@/lib/metadata";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = createMetadata({
  title: "Asyv Code Hub",
  description: `Discover and share student projects on ${siteConfig.name}.`,
  path: "/",
});

export default function HomePage(): ReactNode {
  return (
    <main
      id="main-content"
      className="flex flex-1 flex-col gap-10 pb-24 sm:gap-14"
    >
      <section className="mx-auto w-full max-w-275 px-6 pt-28 sm:px-10 sm:pt-36">
        <p className="text-foreground/55 mb-3 text-sm font-medium tracking-[0.16em] uppercase">
          Asyv School
        </p>
        <h1 className="max-w-3xl text-4xl leading-tight font-semibold tracking-tight sm:text-6xl">
          A hub for what you&apos;re building.
        </h1>
        <p className="text-foreground/65 mt-5 max-w-2xl text-lg leading-relaxed sm:text-xl">
          Share your projects, explore what other students are making, and try
          HTML, CSS, and JavaScript projects right here.
        </p>
      </section>
      <Projects withHeadline viewMoreVisible />
    </main>
  );
}
