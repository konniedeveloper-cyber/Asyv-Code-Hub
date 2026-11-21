import { Projects } from "@/components/projects/projects";
import ParticleText from "@/components/ParticleText";
import WarpText from "@/components/WarpText";
import { TopNotch } from "@/components/layout/top-notch";
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
      <section className="relative mx-auto w-full max-w-275 px-6 pt-28 sm:px-10 sm:pt-36">
        <TopNotch />
        <div className="w-full">
          <ParticleText
            text="ASYV CODE HUB"
            particleSize={2.2}
            density={4}
            color="currentColor"
            highlightColor="#ff5a36"
            highlightMode="motion"
            fontSize="clamp(2rem, 7vw, 5rem)"
            fontWeight={800}
            intro="gather"
            clickBurst
            className="text-foreground"
            style={{ height: 156, minHeight: 0 }}
          />
        </div>
        <p className="text-foreground/55 mt-1 mb-2 text-sm font-medium tracking-[0.16em] uppercase">
          For Asyv Coders.
        </p>
        <h1 className="w-full text-4xl leading-tight font-semibold tracking-tight sm:text-6xl">
          <span className="sr-only">A hub for what you&apos;re building.</span>
          <span aria-hidden="true" className="block h-40 sm:h-44">
            <WarpText
              text={"A hub for what you're\nbuilding."}
              textAlign="left"
              fontSize="clamp(2.5rem, 6.5vw, 5rem)"
              fontWeight={700}
              letterSpacing="-0.045em"
              lineHeight={0.96}
              warpStrength={0.08}
              warpScale={1.7}
              speed={0.4}
              pointerStrength={0.35}
              intro
              className="text-foreground !min-h-0"
              style={{ height: "100%", minHeight: 0 }}
            />
          </span>
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
