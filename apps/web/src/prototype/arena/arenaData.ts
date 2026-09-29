/* Options and invented match state for the arena prototype. Cards are real,
   picked from the starter decks; everything else is example data. */

import { useSyncExternalStore, type CSSProperties } from "react";
import { getCardDefinition } from "@aegis/shared";
import { COLORS } from "@/design/theme";
import { pickCards, pickTamers, starterDecks } from "../sampleData";

/** A BT1 Tamer from the starter card pool, for a deck that lists none. */
const FALLBACK_TAMER = "BT1-085";

export type SideName = "player" | "opponent";

export interface ArenaPalette {
  id: string;
  label: string;
  player: readonly [string, string];
  opponent: readonly [string, string];
}

const playerDeckColor = COLORS[starterDecks[0]!.color];
const opponentDeckColor = COLORS[starterDecks[1]!.color];

export const PALETTES = [
  {
    id: "aegis",
    label: "Aegis: blue vs violet",
    player: ["var(--ds-accent)", "var(--ds-brand-wordmark-bottom)"],
    opponent: ["var(--ds-particle-glow)", COLORS.Purple.edge],
  },
  {
    id: "red-blue",
    label: "Blue vs red",
    player: [COLORS.Blue.base, "var(--ds-brand-wordmark-bottom)"],
    opponent: [COLORS.Red.base, "var(--ds-card-rim-threat)"],
  },
  {
    id: "green-purple",
    label: "Green vs purple",
    player: [COLORS.Green.base, "var(--ds-card-rim-ready)"],
    opponent: [COLORS.Purple.base, COLORS.Purple.edge],
  },
  {
    id: "gold-black",
    label: "Gold vs black",
    player: [COLORS.Yellow.base, "var(--ds-card-rim-attention)"],
    opponent: [COLORS.Black.base, COLORS.Black.edge],
  },
  {
    id: "deck-colors",
    label: "Each deck's main color",
    player: [playerDeckColor.base, playerDeckColor.edge],
    opponent: [opponentDeckColor.base, opponentDeckColor.edge],
  },
] as const satisfies readonly ArenaPalette[];

export type PaletteId = (typeof PALETTES)[number]["id"];

export function paletteStyle(palette: ArenaPalette): CSSProperties {
  return {
    "--arena-player": palette.player[0],
    "--arena-player-2": palette.player[1],
    "--arena-opponent": palette.opponent[0],
    "--arena-opponent-2": palette.opponent[1],
  } as CSSProperties;
}

interface Battlefield<Id extends string = string> {
  id: Id;
  label: string;
  src: string | undefined;
  /** Tall version for phones; without one, phones center-crop `src`. */
  portraitSrc: string | undefined;
}

function generated<Id extends string>(id: Id, label: string): Battlefield<Id> {
  return {
    id,
    label,
    src: `/battlefield/aegis-arena-${id}.jpg`,
    portraitSrc: `/battlefield/aegis-arena-${id}-portrait.jpg`,
  };
}

export const BATTLEFIELDS = [
  generated("digital-island", "Digital island"),
  generated("egg-village", "Egg village"),
  generated("data-sea", "Data sea"),
  generated("server-canyon", "Server canyon"),
  generated("dark-network", "Dark network"),
  generated("data-plaza", "Data plaza"),
  generated("panorama-plains", "Panorama plains"),
  generated("jungle-cove", "Jungle cove"),
  generated("pipe-lake", "Pipe lake"),
  generated("cyber-hub", "Cyber hub"),
  generated("wire-woods", "Wire woods"),
  { id: "none", label: "Colors only", src: undefined, portraitSrc: undefined },
] as const satisfies readonly Battlefield[];

export type BattlefieldId = (typeof BATTLEFIELDS)[number]["id"];

export const PHASES = ["Unsuspend", "Draw", "Breeding", "Main"] as const;
export type Phase = (typeof PHASES)[number];

export const GAUGE_MAX = 10;
export const TURN_SECONDS = 90;
export const CARD_BACK = "/sleeves/digimon-standard.webp";
export const EGG_BACK = "/sleeves/digimon-egg.webp";

export const FIELD_STATUSES = {
  protected: "Immune to opponent's Digimon effects",
  mustAttack: "Attacks at the start of the main phase",
  cannotAttack: "Can't attack",
} as const;

export type FieldStatus = keyof typeof FIELD_STATUSES;

export interface Permanent {
  cardId: string;
  /** Cards under this one in the digivolution stack. */
  sources: number;
  /** The cards under this one, top first. */
  sourceIds: string[];
  suspended?: boolean;
  /** Can attack this turn. */
  ready?: boolean;
  dpDelta?: number;
  statuses: FieldStatus[];
}

type PermanentState = Omit<Permanent, "cardId" | "sourceIds">;

/* A believable digivolution stack: lower-level Digimon from the same deck,
   the closest level first. */
function stackUnder(topCardId: string, count: number, deck: readonly string[]): string[] {
  const levelOf = (cardId: string) => getCardDefinition(cardId)?.level ?? 0;
  const topLevel = levelOf(topCardId);
  return [...new Set(deck)]
    .filter((cardId) => {
      const level = levelOf(cardId);
      return level > 0 && level < topLevel;
    })
    .sort((a, b) => levelOf(b) - levelOf(a))
    .slice(0, count);
}

const KEYWORD_PATTERN =
  /<(Blocker|Rush|Piercing|Jamming|Reboot|Retaliation|Alliance|Evade|Raid|Barrier|Blitz|Decoy[^>]*|Security Attack [+-]\d+|Recovery \+\d[^>]*|Draw \d+|De-Digivolve \d+)>/g;

/** Keywords printed on the card, in the order they appear. */
export function cardKeywords(effectText: string | undefined): string[] {
  const text = normalizeBrackets(effectText ?? "");
  return [...new Set([...text.matchAll(KEYWORD_PATTERN)].map((match) => match[1]!))];
}

/** Card data writes keywords in full-width brackets (＜Blocker＞); this turns them into ASCII ones. */
export function normalizeBrackets(text: string): string {
  return text.replace(/＜/g, "<").replace(/＞/g, ">");
}

export interface Side {
  name: string;
  avatar: string;
  field: Permanent[];
  raising: string | undefined;
  trashTop: string | undefined;
  hand: string[];
  security: number;
  deck: number;
  trash: number;
  eggs: number;
}

function buildSide(
  deckIndex: number,
  name: string,
  avatar: string,
  handSize: number,
  fieldStates: PermanentState[],
): Side {
  const deck = starterDecks[deckIndex]!;
  const digimon = pickCards(deck, 6, { digimonOnly: true });
  const everything = pickCards(deck, 12);
  const tamer = pickTamers(deck)[0] ?? FALLBACK_TAMER;
  return {
    name,
    avatar,
    field: [
      ...fieldStates.map((state, index) => {
        const cardId = digimon[index]!;
        return { cardId, ...state, sourceIds: stackUnder(cardId, state.sources, deck.mainDeck) };
      }),
      { cardId: tamer, sources: 0, sourceIds: [], statuses: [] },
    ],
    raising: digimon[5],
    trashTop: everything[everything.length - 1],
    hand: everything.slice(0, handSize),
    security: 4,
    deck: 31,
    trash: 3,
    eggs: 3,
  };
}

export const player = buildSide(0, "NeonTamer", "greymon", 5, [
  { sources: 3, ready: true, dpDelta: 2000, statuses: [] },
  { sources: 1, suspended: true, statuses: ["cannotAttack"] },
  { sources: 2, statuses: ["protected"] },
]);

export const opponent = buildSide(1, "ByteKnight", "garurumon", 6, [
  { sources: 2, dpDelta: -3000, statuses: ["protected"] },
  { sources: 0, suspended: true, statuses: [] },
  { sources: 1, statuses: ["mustAttack"] },
]);

const CHOICE_CHANGE = "aegis-ui-preview-choice";
const memoryChoices = new Map<string, string>();

/* A choice saved in localStorage and shared by every component that reads the
   same key, so the arena updates while its settings dialog is open. The
   in-memory copy keeps it working when storage is blocked. */
export function useRememberedChoice<Id extends string>(key: string, options: readonly { id: Id }[], fallback: Id) {
  const read = (): Id => {
    let saved: string | null | undefined = memoryChoices.get(key);
    try {
      saved = localStorage.getItem(key) ?? saved;
    } catch {
      // Storage is a convenience; fall back to the in-memory copy.
    }
    return options.find((option) => option.id === saved)?.id ?? fallback;
  };
  const value = useSyncExternalStore((onChange) => {
    window.addEventListener(CHOICE_CHANGE, onChange);
    return () => window.removeEventListener(CHOICE_CHANGE, onChange);
  }, read);
  const choose = (next: Id) => {
    memoryChoices.set(key, next);
    try {
      localStorage.setItem(key, next);
    } catch {
      // Storage is a convenience; the in-memory copy still updates this page.
    }
    window.dispatchEvent(new Event(CHOICE_CHANGE));
  };
  return [value, choose] as const;
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
  );
}

/* The arena look is chosen in Settings and read by the match screen. */
export function useArenaPalette() {
  return useRememberedChoice<PaletteId>("aegis.uiPreview.arenaPalette", PALETTES, "aegis");
}

export function useArenaBattlefield() {
  return useRememberedChoice<BattlefieldId>("aegis.uiPreview.arenaBattlefield", BATTLEFIELDS, "digital-island");
}
