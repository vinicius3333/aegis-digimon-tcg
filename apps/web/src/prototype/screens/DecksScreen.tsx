import { Download, Pencil, Plus, Star, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CardArt, ColorDots, ConsolePanel, SectionHeading, Surface, StatStrip } from "../panels";
import { deckColors, deckCover, famousDeckGroups, starterDecks } from "../sampleData";
import type { PreviewRoute } from "../routes";

export function DecksScreen({ navigate }: { navigate: (route: PreviewRoute) => void }) {
  const active = starterDecks[0]!;
  return (
    <>
      <ConsolePanel className="grid gap-5 p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-2">
            <Badge className="w-fit bg-white/10 text-signal">Deck builder</Badge>
            <h1 className="font-display text-3xl font-bold">Your decks</h1>
            <p className="text-on-ink-muted">50 main cards and up to 5 eggs. The server checks every list.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="border-white/15 bg-white/5 text-on-ink hover:bg-white/10 hover:text-on-ink"
            >
              <Upload /> Import
            </Button>
            <Button>
              <Plus /> New deck
            </Button>
          </div>
        </div>
        <StatStrip
          stats={[
            { label: "Decks", value: starterDecks.length },
            { label: "Active", value: active.name },
            { label: "Famous lists", value: famousDeckGroups.reduce((sum, group) => sum + group.decks.length, 0) },
          ]}
        />
      </ConsolePanel>

      <section className="grid gap-4">
        <SectionHeading title="Saved decks" />
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="ink-grid-header border-0 hover:bg-transparent">
                {["Deck", "Colors", "Main", "Egg", ""].map((heading) => (
                  <TableHead key={heading} className="text-[11px] tracking-[0.12em] text-on-ink uppercase">
                    {heading}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {starterDecks.map((deck) => (
                <TableRow key={deck.id}>
                  <TableCell>
                    <span className="flex items-center gap-3">
                      <CardArt cardId={deckCover(deck)} className="w-9" />
                      <span className="font-semibold">{deck.name}</span>
                      {deck.id === active.id ? (
                        <Badge className="bg-primary/10 text-primary">
                          <Star /> Active
                        </Badge>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ColorDots colors={deckColors(deck)} />
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">{deck.mainDeck.length}/50</TableCell>
                  <TableCell className="font-mono tabular-nums">{deck.eggDeck.length}/5</TableCell>
                  <TableCell>
                    <span className="flex justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Edit ${deck.name}`}>
                            <Pencil />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Export ${deck.name}`}>
                            <Download />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Export</TooltipContent>
                      </Tooltip>
                      <Button size="sm" onClick={() => navigate({ page: "play" })}>
                        Play
                      </Button>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {famousDeckGroups.slice(0, 2).map((group) => (
        <section key={group.collection} className="grid gap-4">
          <SectionHeading title={group.collection} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.decks.slice(0, 6).map((deck) => (
              <Surface key={deck.id} className="grid grid-cols-[56px_1fr_auto] items-center gap-3 p-3">
                <CardArt cardId={deckCover(deck)} className="w-14" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{deck.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{deck.blurb}</p>
                  <ColorDots colors={deckColors(deck)} />
                </div>
                <Button size="sm" variant="secondary">
                  Copy
                </Button>
              </Surface>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
