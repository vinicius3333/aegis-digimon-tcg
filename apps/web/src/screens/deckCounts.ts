/* Deck contents as counts per card id — the shape the builder edits before it is
   serialized back to a deck's card lists. */

import { type CardDefinition } from "@aegis/shared";
import { kindOf } from "../design/theme";

export const MAIN_TARGET = 50;
export const EGG_TARGET = 5;

export type CountMap = Record<string, number>;

export function toCountMap(cardIds: readonly string[]): CountMap {
  const map: CountMap = {};
  for (const id of cardIds) map[id] = (map[id] ?? 0) + 1;
  return map;
}

export function expand(map: CountMap): string[] {
  const out: string[] = [];
  for (const [id, n] of Object.entries(map)) for (let i = 0; i < n; i += 1) out.push(id);
  return out;
}

export const total = (map: CountMap): number => Object.values(map).reduce((a, b) => a + b, 0);

export const isEggCard = (def: CardDefinition): boolean => kindOf(def) === "DigiEgg";
