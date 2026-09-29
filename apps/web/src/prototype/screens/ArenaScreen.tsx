/* A static mock of the match screen in the prototype's visual language. Zones
   follow the real board: opponent on top, memory gauge in the middle, player at
   the bottom. On wide screens the breeding area sits on the left and the piles
   on the right; on phones each side collapses into a strip of small zones. */

import { useState } from "react";
import { ArrowLeft, Flag, ScrollText, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ArenaLookControls } from "../arena/ArenaSettings";
import { cn } from "@/lib/utils";
import { AegisEmblem } from "../AegisLogo";
import { ArenaAmbience } from "../ArenaAmbience";
import {
  BATTLEFIELDS,
  PALETTES,
  opponent,
  paletteStyle,
  player,
  useArenaBattlefield,
  useArenaPalette,
  useMediaQuery,
} from "../arena/arenaData";
import {
  OpponentHand,
  DeckZone,
  EggsZone,
  Field,
  Hand,
  MemoryGauge,
  PhaseRail,
  PlayerPlate,
  RaisingZone,
  SecurityRow,
  TrashZone,
} from "../arena/ArenaParts";
import { MemoryPanel, MiniSideRow, PlayerLine, ScrollingField } from "../arena/ArenaMobileParts";
import { CardDetailsOverlay, InspectProvider, type InspectTarget } from "../arena/CardInspector";
import type { PreviewRoute } from "../routes";

/* Board colors and battlefield live in Settings; the header keeps only what a
   player needs mid-match. */
function ArenaLookDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-3xl">
        <DialogTitle className="font-display text-xl font-bold">Arena look</DialogTitle>
        <DialogDescription>Board colors and battlefield. Also in Settings.</DialogDescription>
        <ArenaLookControls />
      </DialogContent>
    </Dialog>
  );
}

function ArenaHeader({ navigate, compact }: { navigate: (route: PreviewRoute) => void; compact: boolean }) {
  const [lookOpen, setLookOpen] = useState(false);
  const iconButton = "text-ink-nav hover:bg-white/8 hover:text-on-ink";
  const actions = [
    { icon: ScrollText, label: "Game log", onClick: undefined, wideOnly: true },
    { icon: Settings, label: "Arena look", onClick: () => setLookOpen(true), wideOnly: false },
    { icon: Flag, label: "Concede", onClick: undefined, wideOnly: false },
  ];
  return (
    <header className="relative z-30 flex items-center gap-2 rounded-lg bg-ink px-2 py-1.5 text-on-ink sm:gap-3 sm:px-3 sm:py-2">
      <Button
        variant="ghost"
        size={compact ? "icon" : "sm"}
        aria-label="Back to lobby"
        className={iconButton}
        onClick={() => navigate({ page: "play" })}
      >
        <ArrowLeft />
        {compact ? null : "Lobby"}
      </Button>
      <AegisEmblem className="size-7 sm:size-8" />
      <p className="font-display text-xs font-bold tracking-[0.08em] uppercase sm:text-sm">Turn 4</p>
      <span className="arena-turn-pill rounded-full px-2.5 py-1 font-display text-[10px] font-bold tracking-[0.12em] uppercase sm:text-[11px]">
        Your turn
      </span>
      <div className="ml-auto flex items-center gap-1">
        {actions
          .filter((action) => !(compact && action.wideOnly))
          .map(({ icon: Icon, label, onClick }) => (
            <Button key={label} variant="ghost" size="icon" aria-label={label} className={iconButton} onClick={onClick}>
              <Icon />
            </Button>
          ))}
      </div>
      <ArenaLookDialog open={lookOpen} onOpenChange={setLookOpen} />
    </header>
  );
}

/* Equal side columns keep the gauge's zero cell on the board's center axis,
   however wide the phase rail and the End turn button are. */
function CenterLine() {
  return (
    <div className="relative col-span-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-6 py-1">
      <span aria-hidden className="arena-clash absolute inset-x-0 top-1/2 -z-10 h-px" />
      <div className="min-w-0 justify-self-end">
        <PhaseRail active="Main" />
      </div>
      <MemoryGauge memory={3} />
      <Button size="lg" className="arena-end-turn justify-self-start">
        End turn
      </Button>
    </div>
  );
}

function DesktopBoard({ selected, onSelect }: { selected?: string; onSelect: (cardId: string) => void }) {
  return (
    <div className="relative grid h-full grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[1fr_auto_1fr] gap-3 p-3 [--arena-card:clamp(52px,5.2vw,84px)]">
      <div className="grid content-start gap-2">
        <PlayerPlate side={opponent} sideName="opponent" />
        <div className="flex gap-2">
          <EggsZone side={opponent} sideName="opponent" />
          <RaisingZone side={opponent} sideName="opponent" />
        </div>
      </div>
      <div className="grid min-h-0 content-between justify-items-center gap-2">
        <OpponentHand count={opponent.hand.length} />
        <SecurityRow count={opponent.security} side="opponent" />
        <Field side={opponent} sideName="opponent" />
      </div>
      <div className="flex content-start justify-end gap-2 self-start">
        <DeckZone side={opponent} sideName="opponent" />
        <TrashZone side={opponent} sideName="opponent" />
      </div>

      <CenterLine />

      <div className="grid content-end gap-2">
        <div className="flex gap-2">
          <EggsZone side={player} sideName="player" />
          <RaisingZone side={player} sideName="player" />
        </div>
        <PlayerPlate side={player} sideName="player" active />
      </div>
      <div className="grid min-h-0 content-between justify-items-center gap-2">
        <Field side={player} sideName="player" />
        <SecurityRow count={player.security} side="player" />
        <Hand cards={player.hand} selected={selected} onSelect={onSelect} />
      </div>
      <div className="flex justify-end gap-2 self-end">
        <DeckZone side={player} sideName="player" />
        <TrashZone side={player} sideName="player" />
      </div>
    </div>
  );
}

/* The field is the focus on a phone: large cards, each side's other zones
   in one short row, and the memory panel between the two fields. */
function MobileBoard() {
  return (
    <div className="relative flex h-full flex-col justify-between gap-1 p-1.5 [--arena-card:clamp(60px,21vw,92px)]">
      <div className="flex items-center justify-between gap-2 px-1 [--arena-card:40px]">
        <PlayerLine side={opponent} sideName="opponent" />
        <OpponentHand count={opponent.hand.length} compact />
      </div>
      <MiniSideRow side={opponent} sideName="opponent" />
      <ScrollingField side={opponent} sideName="opponent" />
      <MemoryPanel memory={3} phase="Main" />
      <ScrollingField side={player} sideName="player" />
      <MiniSideRow side={player} sideName="player" />
    </div>
  );
}

function MobileHandTray({ selected, onSelect }: { selected?: string; onSelect: (cardId: string) => void }) {
  return (
    <div className="arena-hand-tray grid gap-1 rounded-xl px-2 pt-1.5 pb-[calc(env(safe-area-inset-bottom,0px)+4px)]">
      <PlayerLine side={player} sideName="player" active />
      <Hand cards={player.hand} selected={selected} onSelect={onSelect} compact />
    </div>
  );
}

export function ArenaScreen({ navigate }: { navigate: (route: PreviewRoute) => void }) {
  const [paletteId] = useArenaPalette();
  const [battlefieldId] = useArenaBattlefield();
  const [selected, setSelected] = useState<string>();
  const wide = useMediaQuery("(min-width: 1024px)");
  const palette = PALETTES.find((option) => option.id === paletteId) ?? PALETTES[0];
  const battlefield = BATTLEFIELDS.find((option) => option.id === battlefieldId) ?? BATTLEFIELDS[0];
  const backdropImage = wide ? battlefield.src : (battlefield.portraitSrc ?? battlefield.src);
  const [inspected, setInspected] = useState<InspectTarget>();

  const openHandCard = (cardId: string) => {
    setSelected(cardId);
    setInspected({ cardId, owner: "player", zone: "hand" });
  };

  const closeDetails = () => {
    setInspected(undefined);
    setSelected(undefined);
  };

  return (
    <InspectProvider value={setInspected}>
      <div
        className={cn(
          "arena relative z-10 grid h-dvh gap-1.5 p-1.5 sm:gap-2 sm:p-2",
          wide ? "grid-rows-[auto_1fr]" : "grid-rows-[auto_1fr_auto]",
        )}
        style={paletteStyle(palette)}
      >
        <ArenaHeader navigate={navigate} compact={!wide} />

        <section className="arena-board relative isolate min-h-0 overflow-hidden rounded-xl border">
          {backdropImage ? (
            <div
              aria-hidden
              className="absolute inset-0 -z-20 bg-cover bg-center"
              style={{ backgroundImage: `url(${backdropImage})` }}
            />
          ) : null}
          <div
            aria-hidden
            data-art={battlefield.src ? true : undefined}
            className="arena-backdrop absolute inset-0 -z-10"
          />
          <ArenaAmbience />
          {wide ? <DesktopBoard selected={selected} onSelect={openHandCard} /> : <MobileBoard />}
        </section>

        {wide ? null : <MobileHandTray selected={selected} onSelect={openHandCard} />}
      </div>
      <CardDetailsOverlay target={inspected} onClose={closeDetails} />
    </InspectProvider>
  );
}
