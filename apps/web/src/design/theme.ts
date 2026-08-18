/* Aegis visual theme: the seven gameplay colors, geometric sigil heraldry, and
   small projections of @aegis/shared card data into display fields. The board and
   card components render real CardDefinitions through here — there is no fictional
   card data on the client; only the *look* (colors + sigils) is design-authored. */

import {
  CardColor,
  CardKind,
  getCardDefinition,
  type CardDefinition,
} from "@aegis/shared";

export interface GameColor {
  base: string;
  edge: string;
  soft: string;
  on: string;
  knock: string;
}

/** Muted, sophisticated gameplay palette tuned for the light/neutral surfaces. */
export const COLORS = {
  Red: { base: "#c4495a", edge: "#9c3344", soft: "rgba(196,73,90,0.10)", on: "#ffffff", knock: "#7a2331" },
  Blue: { base: "#2f6fe0", edge: "#1d4ed8", soft: "rgba(47,111,224,0.10)", on: "#ffffff", knock: "#1a3c80" },
  Yellow: { base: "#d99a2b", edge: "#b07d18", soft: "rgba(217,154,43,0.12)", on: "#3a2c08", knock: "#7a5510" },
  Green: { base: "#2f9e6b", edge: "#1d8a5b", soft: "rgba(47,158,107,0.10)", on: "#ffffff", knock: "#155138" },
  White: { base: "#8b93ab", edge: "#6b7488", soft: "rgba(139,147,171,0.12)", on: "#ffffff", knock: "#4a5165" },
  Black: { base: "#525a73", edge: "#3a4057", soft: "rgba(82,90,115,0.12)", on: "#ffffff", knock: "#2a2f43" },
  Purple: { base: "#8159c9", edge: "#6d3fd1", soft: "rgba(129,89,201,0.10)", on: "#ffffff", knock: "#4a2e80" },
  Neutral: { base: "#9098a8", edge: "#6b7488", soft: "rgba(144,152,168,0.12)", on: "#ffffff", knock: "#4a5165" },
} satisfies Record<string, GameColor>;

/** A palette key guaranteed to exist in {@link COLORS}. */
export type ColorName = keyof typeof COLORS;

/** The seven pickable identity colors, in the design's canonical order. */
export const COLOR_KEYS = ["Red", "Blue", "Yellow", "Green", "Black", "Purple", "White"] as const;

/** Map a CardColor enum value (or undefined) to a palette key present in COLORS. */
export function colorKey(color: CardColor | string | undefined): ColorName {
  if (color != null && color !== CardColor.None && color in COLORS) return color as ColorName;
  return "Neutral";
}

/** Palette for a card's first (primary) color. */
export function paletteFor(colors: readonly (CardColor | string)[] | undefined): GameColor {
  return COLORS[colorKey(colors?.[0])];
}

const EMBLEMS = ["fang", "crest", "orb", "wing", "core", "thorn", "bolt", "eye", "ward", "sigil"] as const;
export type Emblem = (typeof EMBLEMS)[number];

/** A stable, art-free geometric emblem for a card id (deterministic hash → sigil). */
export function emblemFor(cardId: string): Emblem {
  let h = 0;
  for (let i = 0; i < cardId.length; i += 1) h = (h * 31 + cardId.charCodeAt(i)) >>> 0;
  return EMBLEMS[h % EMBLEMS.length] ?? "sigil";
}

/** Inline SVG body for a geometric emblem, drawn in `currentColor`. */
export function sigilPaths(emblem: string): string {
  switch (emblem) {
    case "fang":
      return `<path d="M50 14 L70 40 L60 64 L50 52 L40 64 L30 40 Z" fill="currentColor" opacity="0.9"/>
        <path d="M50 30 L58 44 L50 78 L42 44 Z" fill="#0b0d14" opacity="0.45"/>
        <circle cx="50" cy="40" r="4" fill="#0b0d14" opacity="0.5"/>`;
    case "crest":
      return `<path d="M50 12 L82 24 V46 C82 66 68 80 50 88 C32 80 18 66 18 46 V24 Z" fill="currentColor" opacity="0.16"/>
        <path d="M50 12 L82 24 V46 C82 66 68 80 50 88 C32 80 18 66 18 46 V24 Z" fill="none" stroke="currentColor" stroke-width="3"/>
        <path d="M50 30 L62 50 L50 70 L38 50 Z" fill="currentColor"/>`;
    case "orb":
      return `<circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" stroke-width="3"/>
        <circle cx="50" cy="50" r="16" fill="currentColor" opacity="0.85"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5" stroke-dasharray="4 6"/>`;
    case "wing":
      return `<path d="M50 22 C30 30 18 44 14 62 C30 56 40 58 50 70 C60 58 70 56 86 62 C82 44 70 30 50 22 Z" fill="currentColor" opacity="0.85"/>
        <path d="M50 30 V74" stroke="#0b0d14" stroke-width="3" opacity="0.4"/>`;
    case "core":
      return `<rect x="32" y="32" width="36" height="36" rx="4" transform="rotate(45 50 50)" fill="none" stroke="currentColor" stroke-width="3"/>
        <rect x="40" y="40" width="20" height="20" rx="2" transform="rotate(45 50 50)" fill="currentColor"/>
        <path d="M50 8 V20 M50 80 V92 M8 50 H20 M80 50 H92" stroke="currentColor" stroke-width="3"/>`;
    case "thorn":
      return `<path d="M50 84 C50 60 40 40 24 26 C44 30 50 42 50 52 C50 40 58 26 78 22 C60 38 50 58 50 84 Z" fill="currentColor" opacity="0.85"/>
        <circle cx="50" cy="58" r="5" fill="#0b0d14" opacity="0.4"/>`;
    case "bolt":
      return `<path d="M56 12 L30 54 H48 L42 88 L72 42 H52 Z" fill="currentColor"/>
        <path d="M56 12 L30 54 H48 L42 88 L72 42 H52 Z" fill="none" stroke="#0b0d14" stroke-width="1.5" opacity="0.35"/>`;
    case "eye":
      return `<path d="M16 50 C30 32 70 32 84 50 C70 68 30 68 16 50 Z" fill="none" stroke="currentColor" stroke-width="3"/>
        <circle cx="50" cy="50" r="13" fill="currentColor"/>
        <circle cx="50" cy="50" r="5" fill="#0b0d14" opacity="0.55"/>`;
    case "ward":
      return `<path d="M50 14 L80 26 V50 C80 70 67 82 50 88 C33 82 20 70 20 50 V26 Z" fill="currentColor" opacity="0.85"/>
        <path d="M40 50 L47 58 L62 42" fill="none" stroke="#0b0d14" stroke-width="4" opacity="0.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    case "sigil":
    default:
      return `<polygon points="50,14 86,36 86,64 50,86 14,64 14,36" fill="none" stroke="currentColor" stroke-width="3"/>
        <polygon points="50,30 70,42 70,58 50,70 30,58 30,42" fill="currentColor" opacity="0.85"/>
        <circle cx="50" cy="50" r="5" fill="#0b0d14" opacity="0.45"/>`;
  }
}

/** Which broad kind a card is, for badges and labels. */
export function kindOf(def: CardDefinition): "Digimon" | "Tamer" | "Option" | "DigiEgg" {
  if (def.kinds.includes(CardKind.DigiEgg)) return "DigiEgg";
  if (def.kinds.includes(CardKind.Tamer)) return "Tamer";
  if (def.kinds.includes(CardKind.Option)) return "Option";
  return "Digimon";
}

/** Human label for a card's form/kind (e.g. "Champion", "Tamer", "Digi-Egg"). */
export function formLabel(def: CardDefinition): string {
  const k = kindOf(def);
  if (k === "Tamer") return "Tamer";
  if (k === "Option") return "Option";
  if (k === "DigiEgg") return "Digi-Egg";
  return def.forms?.[0] ?? "Digimon";
}

/** The display name for a card id (falls back to the id itself if unknown). */
export function cardName(cardId: string): string {
  return getCardDefinition(cardId)?.nameEn ?? cardId;
}
