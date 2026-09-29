import { useMemo, useState } from "react";
import { Bot, Check, DoorOpen, Search, Swords, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DeckListing } from "@/game/decks";
import { CardArt, ColorDots, ConsolePanel, SectionHeading, Surface } from "../panels";
import { deckColors, deckCover, famousDeckGroups, starterDecks } from "../sampleData";
import type { PreviewRoute } from "../routes";

const MODES = [
  {
    id: "bot",
    title: "Play vs Bot",
    detail: "Practice any deck against the Aegis bot.",
    icon: Bot,
    action: "Start match",
  },
  {
    id: "queue",
    title: "Quick match",
    detail: "Get paired with the next player in the queue.",
    icon: Users,
    action: "Enter queue",
  },
  {
    id: "room",
    title: "Private room",
    detail: "Create a room and share the code with a friend.",
    icon: DoorOpen,
    action: "Create room",
  },
] as const;

const ALL_COLLECTIONS = "all";
const MY_DECKS = "mine";

interface DeckGroup {
  id: string;
  title: string;
  decks: readonly DeckListing[];
}

const DECK_GROUPS: DeckGroup[] = [
  { id: MY_DECKS, title: "My decks", decks: starterDecks },
  ...famousDeckGroups.map((group) => ({ id: group.collection, title: group.collection, decks: group.decks })),
];

/* Stays under the site header while the page scrolls, so the chosen deck and
   the button to play it are always in reach. */
function SelectedDeckBar({ deck, onPlay }: { deck: DeckListing; onPlay: () => void }) {
  return (
    <ConsolePanel
      circuitNodes={false}
      className="sticky top-[calc(env(safe-area-inset-top,0px)+4.5rem)] z-20 flex items-center gap-3 p-2.5 shadow-[0_12px_30px_rgba(7,21,43,0.35)] sm:gap-4 sm:p-3"
    >
      <CardArt cardId={deckCover(deck)} className="w-11 shrink-0 sm:w-14" />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className="text-[10px] tracking-[0.14em] text-on-ink-muted uppercase">Selected deck</p>
        <p className="truncate font-display text-lg font-bold sm:text-xl">{deck.name}</p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-on-ink-muted">
          <ColorDots colors={deckColors(deck)} />
          <span className="font-mono tabular-nums">
            {deck.mainDeck.length} main · {deck.eggDeck.length} egg
          </span>
          <span className="inline-flex items-center gap-1 text-[var(--ds-card-rim-ready)]">
            <Check className="size-3.5" /> Legal
          </span>
        </p>
      </div>
      <Button onClick={onPlay} className="shrink-0">
        <Swords />
        <span className="hidden sm:inline">Play vs Bot</span>
        <span className="sm:hidden">Play</span>
      </Button>
    </ConsolePanel>
  );
}

function DeckTile({ deck, active, onSelect }: { deck: DeckListing; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "grid gap-2 rounded-lg border bg-card p-2 text-left transition-colors hover:border-primary/50",
        active && "border-primary ring-2 ring-primary/25",
      )}
    >
      <CardArt cardId={deckCover(deck)} className="w-full" />
      <span className="truncate text-sm font-semibold">{deck.name}</span>
      <span className="flex items-center justify-between gap-1">
        <ColorDots colors={deckColors(deck)} />
        {starterDecks.includes(deck) ? <Badge variant="secondary">Starter</Badge> : null}
      </span>
    </button>
  );
}

export function PlayScreen({ navigate }: { navigate: (route: PreviewRoute) => void }) {
  const [collection, setCollection] = useState(ALL_COLLECTIONS);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DeckListing>(starterDecks[0]!);

  const visibleGroups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return DECK_GROUPS.filter((group) => collection === ALL_COLLECTIONS || group.id === collection)
      .map((group) => ({ ...group, decks: group.decks.filter((deck) => deck.name.toLowerCase().includes(needle)) }))
      .filter((group) => group.decks.length > 0);
  }, [collection, query]);

  const deckCount = visibleGroups.reduce((sum, group) => sum + group.decks.length, 0);

  return (
    <>
      <SelectedDeckBar deck={selected} onPlay={() => navigate({ page: "arena" })} />

      <section className="grid gap-4">
        <SectionHeading title="Choose a mode" />
        <div className="grid gap-4 md:grid-cols-3">
          {MODES.map((mode) => (
            <Surface key={mode.id} className="grid gap-3 p-5">
              <span className="grid size-10 place-items-center rounded-md bg-ink text-signal">
                <mode.icon className="size-5" />
              </span>
              <div>
                <p className="font-display text-lg font-bold">{mode.title}</p>
                <p className="text-sm text-muted-foreground">{mode.detail}</p>
              </div>
              {mode.id === "room" ? (
                <div className="flex gap-2">
                  <Input placeholder="Room code" aria-label="Room code" className="font-mono uppercase" />
                  <Button variant="secondary">Join</Button>
                </div>
              ) : null}
              <Button className="w-full" onClick={() => navigate({ page: "arena" })}>
                {mode.action}
              </Button>
            </Surface>
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        <SectionHeading title="Choose a deck" />
        <div className="flex flex-wrap items-center gap-3">
          <Select value={collection} onValueChange={setCollection}>
            <SelectTrigger aria-label="Collection" className="w-48 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value={ALL_COLLECTIONS}>All collections</SelectItem>
              {DECK_GROUPS.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.title} ({group.decks.length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative w-full sm:w-64">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search decks"
              aria-label="Search decks"
              className="bg-card pl-8"
            />
          </div>
          <p className="ml-auto font-mono text-xs text-muted-foreground tabular-nums">{deckCount} decks</p>
        </div>

        {visibleGroups.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No decks match "{query}". Try another name or collection.
          </p>
        ) : null}

        {visibleGroups.map((group) => (
          <section key={group.id} className="grid gap-3" aria-label={group.title}>
            <h3 className="flex items-baseline gap-2 font-display text-sm font-bold tracking-[0.08em] uppercase">
              {group.title}
              <span className="font-mono text-xs font-normal text-muted-foreground">{group.decks.length}</span>
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6">
              {group.decks.map((deck) => (
                <DeckTile
                  key={deck.id}
                  deck={deck}
                  active={deck.id === selected.id}
                  onSelect={() => setSelected(deck)}
                />
              ))}
            </div>
          </section>
        ))}
      </section>
    </>
  );
}
