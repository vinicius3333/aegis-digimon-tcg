/* Player-selectable board colors. Each side of the arena has two hues; the
   board reads them from the four `--arena-*` custom properties that
   `arenaPaletteStyle` returns, with fallbacks in arenaTheme.css. */

import { useMemo, useSyncExternalStore, type CSSProperties } from "react";
import { COLORS, colorKey, type GameColor } from "./theme";

const STORAGE_KEY = "aegis.arenaPalette";

export const ARENA_PALETTE_IDS = ["aegis", "red-blue", "green-purple", "gold-black", "deck-colors"] as const;

export type ArenaPaletteId = (typeof ARENA_PALETTE_IDS)[number];

export interface ArenaPalette {
  id: ArenaPaletteId;
  player: readonly [string, string];
  opponent: readonly [string, string];
}

/** Each deck's main color, as a card color name such as "Red". */
export interface ArenaDeckColors {
  player?: string;
  opponent?: string;
}

export const DEFAULT_ARENA_PALETTE_ID: ArenaPaletteId = "aegis";

const FALLBACK_DECK_COLORS = { player: "Red", opponent: "Blue" } as const;

function hues(color: GameColor): readonly [string, string] {
  return [color.base, color.edge];
}

const FIXED_PALETTES: Record<Exclude<ArenaPaletteId, "deck-colors">, Omit<ArenaPalette, "id">> = {
  aegis: {
    player: ["var(--ds-accent)", "var(--ds-brand-wordmark-bottom)"],
    opponent: ["var(--ds-particle-glow)", COLORS.Purple.edge],
  },
  "red-blue": {
    player: [COLORS.Blue.base, "var(--ds-brand-wordmark-bottom)"],
    opponent: [COLORS.Red.base, "var(--ds-card-rim-threat)"],
  },
  "green-purple": {
    player: [COLORS.Green.base, "var(--ds-card-rim-ready)"],
    opponent: [COLORS.Purple.base, COLORS.Purple.edge],
  },
  "gold-black": {
    player: [COLORS.Yellow.base, "var(--ds-card-rim-attention)"],
    opponent: [COLORS.Black.base, COLORS.Black.edge],
  },
};

/** The palette for an id; "deck-colors" uses `deckColors`, or Red vs Blue without them. */
export function arenaPaletteById(id: ArenaPaletteId, deckColors?: ArenaDeckColors): ArenaPalette {
  if (id === "deck-colors") {
    return {
      id,
      player: hues(COLORS[colorKey(deckColors?.player ?? FALLBACK_DECK_COLORS.player)]),
      opponent: hues(COLORS[colorKey(deckColors?.opponent ?? FALLBACK_DECK_COLORS.opponent)]),
    };
  }
  return { id, ...FIXED_PALETTES[id] };
}

/** Every palette in picker order, with "deck-colors" resolved against `deckColors`. */
export function arenaPalettes(deckColors?: ArenaDeckColors): ArenaPalette[] {
  return ARENA_PALETTE_IDS.map((id) => arenaPaletteById(id, deckColors));
}

export function arenaPaletteStyle(palette: ArenaPalette): CSSProperties {
  return {
    "--arena-player": palette.player[0],
    "--arena-player-2": palette.player[1],
    "--arena-opponent": palette.opponent[0],
    "--arena-opponent-2": palette.opponent[1],
  } as CSSProperties;
}

function isArenaPaletteId(value: string | null): value is ArenaPaletteId {
  return (ARENA_PALETTE_IDS as readonly (string | null)[]).includes(value);
}

function readId(): ArenaPaletteId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isArenaPaletteId(saved) ? saved : DEFAULT_ARENA_PALETTE_ID;
  } catch {
    return DEFAULT_ARENA_PALETTE_ID;
  }
}

const listeners = new Set<() => void>();
let currentId = readId();

export function getArenaPaletteId(): ArenaPaletteId {
  return currentId;
}

export function setArenaPaletteId(id: ArenaPaletteId): void {
  if (!isArenaPaletteId(id)) return;
  currentId = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Preference is cosmetic; a blocked storage still applies for this session.
  }
  for (const listener of listeners) listener();
}

export function subscribeArenaPalette(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The chosen palette, re-rendering when the choice changes. */
export function useArenaPalette(deckColors?: ArenaDeckColors): ArenaPalette {
  const id = useSyncExternalStore(subscribeArenaPalette, getArenaPaletteId, () => DEFAULT_ARENA_PALETTE_ID);
  const player = deckColors?.player;
  const opponent = deckColors?.opponent;
  return useMemo(() => arenaPaletteById(id, { player, opponent }), [id, player, opponent]);
}
