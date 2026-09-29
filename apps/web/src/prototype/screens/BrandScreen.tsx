import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AegisEmblem, chooseEmblem, EMBLEMS, useEmblem } from "../AegisLogo";
import { ConsolePanel, InfoNote, SectionHeading, Surface } from "../panels";

const PREVIEW_SIZES = [
  { pixels: 16, className: "size-4" },
  { pixels: 24, className: "size-6" },
  { pixels: 32, className: "size-8" },
  { pixels: 48, className: "size-12" },
  { pixels: 64, className: "size-16" },
];

export function BrandScreen() {
  const current = useEmblem();
  return (
    <>
      <ConsolePanel className="grid gap-3 p-6 sm:p-8">
        <h1 className="font-display text-3xl font-bold">Logo concepts</h1>
        <p className="text-on-ink-muted">Pick an emblem to use it in the header and the Home hero.</p>
      </ConsolePanel>
      <InfoNote>Generated with Codex image generation. Original artwork, no shield.</InfoNote>
      {EMBLEMS.map((emblem) => {
        const inUse = emblem.id === current.id;
        return (
          <section key={emblem.id} className="grid gap-4">
            <SectionHeading
              title={emblem.label}
              action={
                <Button size="sm" variant={inUse ? "secondary" : "default"} onClick={() => chooseEmblem(emblem.id)}>
                  {inUse ? (
                    <>
                      <Check /> In use
                    </>
                  ) : (
                    "Use this emblem"
                  )}
                </Button>
              }
            />
            <div className="grid gap-4 md:grid-cols-[auto_auto_1fr]">
              <Surface className="grid place-items-center bg-ink p-6">
                <AegisEmblem id={emblem.id} className="size-36" />
              </Surface>
              <Surface className="grid place-items-center p-6">
                <AegisEmblem id={emblem.id} className="size-36" />
              </Surface>
              <Surface className="flex flex-wrap items-end gap-6 p-5">
                {PREVIEW_SIZES.map(({ pixels, className }) => (
                  <span key={pixels} className="grid justify-items-center gap-1">
                    <AegisEmblem id={emblem.id} className={className} />
                    <span className="font-mono text-[10px] text-muted-foreground">{pixels}px</span>
                  </span>
                ))}
              </Surface>
            </div>
          </section>
        );
      })}
    </>
  );
}
