import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { allCards } from "@aegis/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { COLOR_KEYS, COLORS } from "@/design/theme";
import { CardArt, ConsolePanel, SectionHeading, StatStrip } from "../panels";
import { setsNewestFirst } from "../sampleData";

const PAGE_SIZE = 36;

export function CollectionScreen() {
  const sets = useMemo(setsNewestFirst, []);
  const [set, setSet] = useState(sets[0] ?? "BT1");
  const [query, setQuery] = useState("");
  const [colors, setColors] = useState<string[]>([]);

  const cardsInSet = useMemo(() => allCards().filter((card) => card.set === set), [set]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return cardsInSet.filter(
      (card) =>
        card.nameEn.toLowerCase().includes(needle) &&
        (colors.length === 0 || card.colors.some((color) => colors.includes(color))),
    );
  }, [cardsInSet, query, colors]);

  const toggleColor = (color: string) =>
    setColors((current) =>
      current.includes(color) ? current.filter((value) => value !== color) : [...current, color],
    );

  return (
    <>
      <ConsolePanel className="grid gap-5 p-6 sm:p-8">
        <h1 className="font-display text-3xl font-bold">Card library</h1>
        <p className="max-w-[56ch] text-on-ink-muted">
          Browse every card Aegis can play, with its rulings and effects.
        </p>
        <StatStrip
          stats={[
            { label: "Set", value: set },
            { label: "Cards in set", value: cardsInSet.length },
            { label: "Digimon", value: cardsInSet.filter((card) => card.level !== undefined).length },
            { label: "Matching", value: visible.length },
          ]}
        />
      </ConsolePanel>

      <section className="grid gap-4">
        <SectionHeading title="Filters" />
        <div className="flex flex-wrap items-center gap-3">
          <Select value={set} onValueChange={setSet}>
            <SelectTrigger className="w-32 bg-card" aria-label="Set">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sets.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Colors">
            {COLOR_KEYS.map((color) => {
              const on = colors.includes(color);
              return (
                <button
                  key={color}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleColor(color)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium transition-colors hover:border-primary/40",
                    on && "border-primary bg-primary/10",
                  )}
                >
                  <span className="size-2.5 rounded-full" style={{ background: COLORS[color].base }} />
                  {color}
                </button>
              );
            })}
          </div>
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name"
              aria-label="Search cards"
              className="bg-card pl-8"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {visible.slice(0, PAGE_SIZE).map((card) => (
            <button
              key={card.cardId}
              type="button"
              className="group grid gap-1.5 text-left"
              aria-label={`${card.nameEn} (${card.cardId})`}
            >
              <CardArt cardId={card.cardId} className="w-full" />
              <span className="truncate text-xs font-medium">{card.nameEn}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{card.cardId}</span>
            </button>
          ))}
        </div>
        {visible.length > PAGE_SIZE ? (
          <Button variant="secondary" className="mx-auto">
            Show all ({visible.length})
          </Button>
        ) : null}
      </section>
    </>
  );
}
