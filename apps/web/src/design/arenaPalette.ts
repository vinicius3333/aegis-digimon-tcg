/* Player-selectable board colors. Each side of the arena has two hues; the
   board reads them from the four `--arena-*` custom properties that
   `arenaPaletteStyle` returns, with fallbacks in arenaTheme.css. */

import { useMemo, type CSSProperties } from "react";
import { COLORS, colorKey, type GameColor } from "./theme";
import { getInterfaceTheme, setInterfaceTheme, subscribeInterfaceTheme, useInterfaceTheme } from "./interfaceTheme";

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
    player: ["var(--ds-accent)", "var(--ds-ink-accent)"],
    opponent: ["var(--ds-ink-accent)", COLORS.Purple.edge],
  },
  "red-blue": {
    // This hue was the fixed Aegis chrome accent in production. Keep the saved
    // board combination while the site's chrome now follows the chosen theme.
    player: [COLORS.Blue.base, "#ff8cc8"],
    opponent: [COLORS.Red.base, "var(--ds-rim-threat)"],
  },
  "green-purple": {
    player: [COLORS.Green.base, "var(--ds-rim-ready)"],
    opponent: [COLORS.Purple.base, COLORS.Purple.edge],
  },
  "gold-black": {
    player: [COLORS.Yellow.base, "var(--ds-rim-attention)"],
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

export function getArenaPaletteId(): ArenaPaletteId {
  const id = getInterfaceTheme().preset;
  return isArenaPaletteId(id) ? id : DEFAULT_ARENA_PALETTE_ID;
}

export function setArenaPaletteId(id: ArenaPaletteId): void {
  if (!isArenaPaletteId(id)) return;
  setInterfaceTheme(id);
}

export function subscribeArenaPalette(listener: () => void): () => void {
  return subscribeInterfaceTheme(listener);
}

/** The chosen palette, re-rendering when the choice changes. */
export function useArenaPalette(deckColors?: ArenaDeckColors): ArenaPalette {
  const theme = useInterfaceTheme();
  const id = isArenaPaletteId(theme.preset) ? theme.preset : DEFAULT_ARENA_PALETTE_ID;
  const player = deckColors?.player;
  const opponent = deckColors?.opponent;
  return useMemo(() => arenaPaletteById(id, { player, opponent }), [id, player, opponent]);
}
