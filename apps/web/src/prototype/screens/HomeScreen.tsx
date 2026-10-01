import { useState } from "react";
import { ArrowRight, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardArt, ColorDots, SectionHeading, Surface } from "../panels";
import { HERO_VARIANTS, HomeHero, type HeroVariant } from "./HomeHero";
import { deckColors, deckCover, famousDecks, starterDecks } from "../sampleData";
import type { PreviewRoute } from "../routes";

const HERO_VARIANT_KEY = "aegis.uiPreview.heroVariant";

function loadHeroVariant(): HeroVariant {
  try {
    const saved = localStorage.getItem(HERO_VARIANT_KEY);
    return HERO_VARIANTS.find((variant) => variant.id === saved)?.id ?? "console";
  } catch {
    return "console";
  }
}

export function HomeScreen({ navigate }: { navigate: (route: PreviewRoute) => void }) {
  const [communityOpen, setCommunityOpen] = useState(true);
  const [heroVariant, setHeroVariant] = useState(loadHeroVariant);
  const featured = famousDecks[1] ?? starterDecks[0]!;

  const chooseHeroVariant = (variant: HeroVariant) => {
    setHeroVariant(variant);
    try {
      localStorage.setItem(HERO_VARIANT_KEY, variant);
    } catch {
      // Remembering the choice is a convenience; the preview works without storage.
    }
  };

  return (
    <>
      <div className="grid gap-3 [&>*]:min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">Hero variant</span>
          <Tabs
            value={heroVariant}
            onValueChange={(value) => chooseHeroVariant(value as HeroVariant)}
            className="min-w-0 max-w-full"
          >
            <TabsList className="max-w-full justify-start overflow-x-auto rounded-full">
              {HERO_VARIANTS.map((variant) => (
                <TabsTrigger key={variant.id} value={variant.id} className="flex-none rounded-full">
                  {variant.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <HomeHero
          variant={heroVariant}
          featured={featured}
          activeDeck={starterDecks[0]!}
          onPlay={() => navigate({ page: "play" })}
          onBuild={() => navigate({ page: "decks" })}
        />
      </div>

      {communityOpen ? (
        <Surface className="flex flex-wrap items-center gap-3 border-info-border/60 bg-info-surface/40 px-4 py-3">
          <span className="grid size-9 place-items-center rounded-md border border-info-border/60 bg-card text-primary">
            <MessageCircle className="size-4" />
          </span>
          <p className="min-w-0 flex-1 basis-52 text-sm font-medium">
            Find opponents and report bugs on the Aegis Discord.
          </p>
          <Button>Join Discord</Button>
          <Button variant="ghost" size="icon" aria-label="Dismiss" onClick={() => setCommunityOpen(false)}>
            <X />
          </Button>
        </Surface>
      ) : null}

      <section className="grid gap-4">
        <SectionHeading
          title="Jump back in"
          action={
            <Button variant="link" onClick={() => navigate({ page: "decks" })}>
              All decks <ArrowRight />
            </Button>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...starterDecks, ...famousDecks.slice(3, 5)].map((deck) => (
            <Surface key={deck.id} className="grid grid-cols-[64px_1fr] gap-3 p-3">
              <CardArt cardId={deckCover(deck)} className="w-16" />
              <div className="grid min-w-0 content-start gap-1.5">
                <p className="truncate font-semibold">{deck.name}</p>
                <ColorDots colors={deckColors(deck)} />
                <p className="font-mono text-xs text-muted-foreground tabular-nums">
                  {deck.mainDeck.length} main · {deck.eggDeck.length} egg
                </p>
                <Button size="sm" variant="secondary" className="mt-1 w-fit" onClick={() => navigate({ page: "play" })}>
                  Play
                </Button>
              </div>
            </Surface>
          ))}
        </div>
      </section>
    </>
  );
}
