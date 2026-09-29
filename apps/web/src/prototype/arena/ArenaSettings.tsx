/* Arena look settings: board colors and battlefield, with a live preview.
   The board's light or dark look follows the app theme. */

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeading, Surface } from "../panels";
import { BATTLEFIELDS, PALETTES, paletteStyle, useArenaBattlefield, useArenaPalette } from "./arenaData";

function PreviewHalf({ label, side }: { label: string; side: "player" | "opponent" }) {
  return (
    <div className="relative flex h-1/2 items-center justify-center gap-2">
      <span
        data-side={side}
        className="arena-zone-label absolute top-1.5 left-2 font-display text-[9px] font-bold tracking-[0.14em] uppercase"
      >
        {label}
      </span>
      {[0, 1, 2].map((slot) => (
        <span
          key={slot}
          data-side={side}
          className="arena-security aspect-[63/88] w-8 rounded-[6%/4.3%] bg-white/15 backdrop-blur-sm"
        />
      ))}
    </div>
  );
}

/** Preview, board colors, and battlefield; used by Settings and the arena's gear modal. */
export function ArenaLookControls() {
  const [paletteId, choosePalette] = useArenaPalette();
  const [battlefieldId, chooseBattlefield] = useArenaBattlefield();
  const palette = PALETTES.find((option) => option.id === paletteId) ?? PALETTES[0];
  const battlefield = BATTLEFIELDS.find((option) => option.id === battlefieldId) ?? BATTLEFIELDS[0];

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="grid content-start gap-2">
        <div className="arena" style={paletteStyle(palette)}>
          <div className="arena-board relative isolate h-44 overflow-hidden rounded-lg border">
            {battlefield.src ? (
              <div
                aria-hidden
                className="absolute inset-0 -z-20 bg-cover bg-center"
                style={{ backgroundImage: `url(${battlefield.src})` }}
              />
            ) : null}
            <div
              aria-hidden
              data-art={battlefield.src ? true : undefined}
              className="arena-backdrop absolute inset-0 -z-10"
            />
            <PreviewHalf label="Opponent" side="opponent" />
            <PreviewHalf label="You" side="player" />
            <span aria-hidden className="arena-clash absolute inset-x-0 top-1/2 h-px" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          The board follows the app theme: dark shows the console board, light the blueprint board.
        </p>
      </div>

      <div className="grid content-start gap-5">
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Board colors</legend>
          <div role="radiogroup" aria-label="Board colors" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PALETTES.map((option) => {
              const chosen = option.id === paletteId;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={chosen}
                  onClick={() => choosePalette(option.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-left text-sm transition-colors hover:border-primary/50",
                    chosen && "border-primary ring-2 ring-primary/25",
                  )}
                >
                  <span
                    aria-hidden
                    className="size-6 shrink-0 rounded-full ring-1 ring-black/10"
                    style={{
                      background: `linear-gradient(to bottom, ${option.opponent[0]} 50%, ${option.player[0]} 50%)`,
                    }}
                  />
                  <span className="flex-1">{option.label}</span>
                  {chosen ? <Check className="size-4 text-primary" aria-hidden /> : null}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Battlefield</legend>
          <div role="radiogroup" aria-label="Battlefield" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {BATTLEFIELDS.map((option) => {
              const chosen = option.id === battlefieldId;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={chosen}
                  onClick={() => chooseBattlefield(option.id)}
                  className={cn(
                    "grid gap-1 rounded-lg border bg-card p-1.5 text-left transition-colors hover:border-primary/50",
                    chosen && "border-primary ring-2 ring-primary/25",
                  )}
                >
                  <span className="arena block" style={paletteStyle(palette)}>
                    <span className="relative isolate block aspect-video overflow-hidden rounded-md">
                      {option.src ? (
                        <img
                          src={option.src}
                          alt=""
                          loading="lazy"
                          className="absolute inset-0 size-full object-cover"
                        />
                      ) : (
                        <span aria-hidden className="arena-backdrop absolute inset-0" />
                      )}
                    </span>
                  </span>
                  <span className="truncate px-0.5 text-xs font-medium">{option.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>
    </div>
  );
}

export function ArenaSettings() {
  return (
    <Surface className="grid content-start gap-5 p-5 lg:col-span-2">
      <SectionHeading title="Arena" />
      <ArenaLookControls />
    </Surface>
  );
}
