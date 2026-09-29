/* Phone-sized arena pieces. The player tag shrinks to one line (the zones
   already show hand, deck, and trash counts), each side's zones share one
   row, and the memory gauge becomes a panel with the phase and end turn. */

import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CARD_BACK, EGG_BACK, GAUGE_MAX, type Phase, type Side, type SideName } from "./arenaData";
import { CardBack, Field, FieldCard, TrashTop, useTurnClock, WaitingDots } from "./ArenaParts";

export function PlayerLine({ side, sideName, active }: { side: Side; sideName: SideName; active?: boolean }) {
  const clock = useTurnClock(Boolean(active));
  return (
    <div data-side={sideName} className="arena-player-line flex min-w-0 items-center gap-1.5">
      <span className={cn("arena-avatar-frame shrink-0 rounded-md p-[2px]", active && "arena-timer-ring")}>
        <img
          src={`/avatars/digimon-world-1/${side.avatar}.png`}
          alt=""
          className="arena-avatar block size-5 rounded object-contain [image-rendering:pixelated]"
        />
      </span>
      <span className="truncate text-xs font-semibold">{side.name}</span>
      <span className="arena-zone-label inline-flex shrink-0 items-center gap-1 font-mono text-[10px] tabular-nums">
        {active ? (
          <>
            <span className="sr-only">Time left</span>
            {clock}
          </>
        ) : (
          <WaitingDots />
        )}
      </span>
    </div>
  );
}

function MiniSlot({ label, count, children }: { label: string; count?: number; children: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-0.5">
      <div className="relative">
        {children}
        {count === undefined ? null : <span className="arena-badge absolute -right-1.5 -bottom-1">{count}</span>}
      </div>
      <span className="arena-zone-label font-display text-[8px] font-bold tracking-[0.1em] uppercase">{label}</span>
    </div>
  );
}

function SecurityStack({ count, side }: { count: number; side: SideName }) {
  return (
    <div className="flex" aria-label={`${count} security cards`}>
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          data-side={side}
          className="arena-security aspect-[63/88] w-[var(--arena-card)] rounded-[6%/4.3%] bg-cover bg-center not-first:-ml-[calc(var(--arena-card)*0.8)]"
          style={{ backgroundImage: `url(${CARD_BACK})` }}
        />
      ))}
    </div>
  );
}

export function MiniSideRow({ side, sideName }: { side: Side; sideName: SideName }) {
  return (
    <div
      data-side={sideName}
      className="arena-zone flex items-end justify-between gap-1 rounded-lg px-2.5 pt-2 pb-1 [--arena-card:clamp(28px,9vw,40px)] [&_figcaption]:hidden"
    >
      <MiniSlot label="Eggs" count={side.eggs}>
        <CardBack src={EGG_BACK} className="arena-stack" />
      </MiniSlot>
      <MiniSlot label="Raising">
        {side.raising ? <FieldCard cardId={side.raising} owner={sideName} zone="raising" /> : null}
      </MiniSlot>
      <MiniSlot label="Security" count={side.security}>
        <SecurityStack count={side.security} side={sideName} />
      </MiniSlot>
      <MiniSlot label="Deck" count={side.deck}>
        <CardBack className="arena-stack" />
      </MiniSlot>
      <MiniSlot label="Trash" count={side.trash}>
        {side.trashTop ? <TrashTop cardId={side.trashTop} owner={sideName} /> : null}
      </MiniSlot>
    </div>
  );
}

export function MemoryPanel({ memory, phase }: { memory: number; phase: Phase }) {
  const cells = Array.from({ length: GAUGE_MAX * 2 + 1 }, (_, index) => index - GAUGE_MAX);
  return (
    <div className="arena-gauge-track grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl py-1.5 pr-1.5 pl-3">
      <div className="grid min-w-0 gap-1">
        <span className="arena-phase-active w-fit rounded-full px-2 py-0.5 font-display text-[9px] font-bold tracking-[0.12em] uppercase">
          {phase}
        </span>
        <div
          className="flex h-6 items-center gap-[2px]"
          role="meter"
          aria-valuemin={-GAUGE_MAX}
          aria-valuemax={GAUGE_MAX}
          aria-valuenow={memory}
          aria-label="Memory"
        >
          {cells.map((cell) => (
            <span
              key={cell}
              data-side={cell < 0 ? "opponent" : cell > 0 ? "player" : "zero"}
              className="arena-gauge-cell relative h-2 flex-1 rounded-full"
            >
              {cell === memory ? (
                <span className="arena-gauge-cell arena-gauge-current absolute top-1/2 left-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full font-mono text-xs font-bold">
                  {Math.abs(cell)}
                </span>
              ) : null}
            </span>
          ))}
        </div>
        <div aria-hidden className="arena-zone-label flex justify-between px-0.5 font-mono text-[9px] tabular-nums">
          {[10, 5, 0, 5, 10].map((mark, index) => (
            <span key={index}>{mark}</span>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="arena-end-turn grid size-14 place-items-center rounded-full bg-primary px-1 text-center font-display text-[10px] leading-tight font-bold tracking-[0.06em] text-primary-foreground uppercase"
      >
        End turn
      </button>
    </div>
  );
}

/* A side's field can hold more cards than a phone shows, so it scrolls
   sideways and shows an arrow while more cards sit off screen. */
export function ScrollingField({ side, sideName }: { side: Side; sideName: SideName }) {
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!scroller) return;
    const update = () => setHasMore(scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 4);
    update();
    scroller.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    return () => {
      scroller.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [scroller]);

  return (
    <div className="relative">
      <div ref={setScroller} className="overflow-x-auto px-3 pt-2 pb-1 [scrollbar-width:none]">
        <div className="mx-auto w-max">
          <Field side={side} sideName={sideName} />
        </div>
      </div>
      {hasMore ? (
        <button
          type="button"
          aria-label="Show more cards"
          onClick={() => scroller?.scrollBy({ left: scroller.clientWidth * 0.7, behavior: "smooth" })}
          className="absolute top-1/2 right-0 grid size-8 -translate-y-1/2 place-items-center rounded-lg bg-ink/90 text-on-ink shadow-lg ring-1 ring-white/25"
        >
          <ChevronRight className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
