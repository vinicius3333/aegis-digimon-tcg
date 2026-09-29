import type { ReactNode } from "react";
import { Layers, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DeckListing } from "@/game/decks";
import { AegisEmblem } from "../AegisLogo";
import { CardArt, ColorDots, ConsolePanel } from "../panels";
import { deckColors, deckCover } from "../sampleData";

export const HERO_VARIANTS = [
  { id: "console", label: "Console" },
  { id: "centered", label: "Centered" },
  { id: "blueprint", label: "Blueprint" },
  { id: "quick-start", label: "Quick start" },
  { id: "compact", label: "Compact" },
  { id: "blueprint-compact", label: "Blueprint compact" },
] as const;

export type HeroVariant = (typeof HERO_VARIANTS)[number]["id"];

interface HeroProps {
  featured: DeckListing;
  activeDeck: DeckListing;
  onPlay: () => void;
  onBuild: () => void;
}

const EYEBROW = "Digimon TCG in your browser";
const HEADLINE = "Build a deck and play live. Free.";
const SUMMARY =
  "Every card is rules-checked by the server. Pick a famous list or bring your own, then play a bot or a friend in seconds.";

function Eyebrow({ className }: { className?: string }) {
  return (
    <p className={cn("font-display text-xs font-bold tracking-[0.14em] text-signal uppercase", className)}>{EYEBROW}</p>
  );
}

function Headline({ className }: { className?: string }) {
  return (
    <h1
      className={cn(
        "font-display text-4xl leading-[1.05] font-extrabold tracking-[-0.015em] uppercase sm:text-5xl",
        className,
      )}
    >
      {HEADLINE}
    </h1>
  );
}

function OnInkActions({ onPlay, onBuild, className }: Pick<HeroProps, "onPlay" | "onBuild"> & { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      <Button size="lg" onClick={onPlay}>
        <Swords />
        Play now
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="border-white/20 bg-white/5 text-on-ink hover:bg-white/10 hover:text-on-ink"
        onClick={onBuild}
      >
        <Layers />
        Build a deck
      </Button>
    </div>
  );
}

function OnSurfaceActions({
  onPlay,
  onBuild,
  className,
}: Pick<HeroProps, "onPlay" | "onBuild"> & { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      <Button size="lg" onClick={onPlay}>
        <Swords />
        Play now
      </Button>
      <Button size="lg" variant="outline" onClick={onBuild}>
        <Layers />
        Build a deck
      </Button>
    </div>
  );
}

function ConsoleHero({ featured, onPlay, onBuild }: HeroProps) {
  return (
    <ConsolePanel className="grid gap-8 p-6 sm:p-10 md:grid-cols-[1fr_auto] md:items-center">
      <div className="grid gap-5">
        <Eyebrow />
        <Headline />
        <p className="max-w-[48ch] text-on-ink-muted">{SUMMARY}</p>
        <OnInkActions onPlay={onPlay} onBuild={onBuild} />
      </div>
      <CardArt cardId={deckCover(featured)} className="mx-auto hidden w-40 md:block" />
    </ConsolePanel>
  );
}

function CenteredHero({ onPlay, onBuild }: HeroProps) {
  return (
    <ConsolePanel className="grid justify-items-center gap-5 px-6 py-12 text-center sm:py-16">
      <AegisEmblem className="size-20" />
      <Eyebrow />
      <Headline className="max-w-[18ch]" />
      <p className="max-w-[52ch] text-on-ink-muted">{SUMMARY}</p>
      <OnInkActions onPlay={onPlay} onBuild={onBuild} className="justify-center" />
    </ConsolePanel>
  );
}

function BlueprintHero({ featured, onPlay, onBuild }: HeroProps) {
  return (
    <section className="blueprint-panel grid gap-8 rounded-xl border p-6 sm:p-10 md:grid-cols-[1fr_auto] md:items-center">
      <div className="grid gap-5">
        <Eyebrow className="text-primary" />
        <Headline className="text-foreground" />
        <p className="max-w-[48ch] text-muted-foreground">{SUMMARY}</p>
        <OnSurfaceActions onPlay={onPlay} onBuild={onBuild} />
      </div>
      <div className="mx-auto hidden rounded-lg bg-ink p-4 md:block">
        <CardArt cardId={deckCover(featured)} className="w-36" />
      </div>
    </section>
  );
}

function QuickStartHero({ activeDeck, onPlay, onBuild }: HeroProps) {
  return (
    <ConsolePanel className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_minmax(0,340px)] lg:items-center">
      <div className="grid gap-5">
        <Eyebrow />
        <Headline />
        <p className="max-w-[48ch] text-on-ink-muted">{SUMMARY}</p>
      </div>
      <div className="scanner-frame grid gap-4 border border-trace/20 bg-ink p-5">
        <p className="text-[11px] tracking-[0.14em] text-on-ink-muted uppercase">Your active deck</p>
        <div className="grid grid-cols-[72px_1fr] items-center gap-4">
          <CardArt cardId={deckCover(activeDeck)} className="w-18" />
          <div className="grid min-w-0 gap-1.5">
            <p className="truncate font-display text-lg font-bold">{activeDeck.name}</p>
            <ColorDots colors={deckColors(activeDeck)} />
            <p className="font-mono text-xs text-on-ink-muted tabular-nums">
              {activeDeck.mainDeck.length} main · {activeDeck.eggDeck.length} egg
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={onPlay}>
            <Swords />
            Play
          </Button>
          <Button
            variant="outline"
            className="border-white/20 bg-white/5 text-on-ink hover:bg-white/10 hover:text-on-ink"
            onClick={onBuild}
          >
            Change deck
          </Button>
        </div>
      </div>
    </ConsolePanel>
  );
}

function CompactHero({ onPlay, onBuild }: HeroProps) {
  return (
    <ConsolePanel circuitNodes={false} className="flex flex-wrap items-center gap-x-8 gap-y-4 px-6 py-5">
      <AegisEmblem className="size-11" />
      <div className="grid flex-1 gap-1">
        <Eyebrow />
        <p className="font-display text-xl font-extrabold uppercase">{HEADLINE}</p>
      </div>
      <OnInkActions onPlay={onPlay} onBuild={onBuild} />
    </ConsolePanel>
  );
}

function BlueprintCompactHero({ onPlay, onBuild }: HeroProps) {
  return (
    <section className="blueprint-panel flex flex-wrap items-center gap-x-8 gap-y-4 rounded-xl border px-6 py-5">
      <span className="grid size-14 place-items-center rounded-lg bg-ink">
        <AegisEmblem className="size-11" />
      </span>
      <div className="grid flex-1 gap-1">
        <Eyebrow className="text-primary" />
        <p className="font-display text-xl font-extrabold text-foreground uppercase">{HEADLINE}</p>
      </div>
      <OnSurfaceActions onPlay={onPlay} onBuild={onBuild} />
    </section>
  );
}

const HEROES: Record<HeroVariant, (props: HeroProps) => ReactNode> = {
  console: ConsoleHero,
  centered: CenteredHero,
  blueprint: BlueprintHero,
  "quick-start": QuickStartHero,
  compact: CompactHero,
  "blueprint-compact": BlueprintCompactHero,
};

export function HomeHero({ variant, ...props }: HeroProps & { variant: HeroVariant }) {
  const Hero = HEROES[variant];
  return <Hero {...props} />;
}
