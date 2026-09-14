import {
  CardKind,
  KEYWORDS,
  getCardDefinition,
  type GameState,
  type Keyword,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { formatKeyword } from "../game/keywordDisplay";

/** Internal IR names are not additional printed keyword abilities. */
export type DemoKeyword = Exclude<Keyword, "LinkMax" | "DigiXrosSubstitute">;
export const DEMO_KEYWORDS = KEYWORDS.filter(
  (keyword): keyword is DemoKeyword => keyword !== "LinkMax" && keyword !== "DigiXrosSubstitute",
);

export interface DemoKeywordGrant {
  keyword: DemoKeyword;
  amount?: number;
  parameter?: string;
}
export type DemoKeywordGrants = Readonly<Record<string, readonly DemoKeywordGrant[]>>;

export const NUMERIC_KEYWORDS: Partial<Record<DemoKeyword, { min: number; max: number; initial: number }>> = {
  SecurityAttack: { min: -9, max: 9, initial: 1 },
  Draw: { min: 1, max: 9, initial: 1 },
  DeDigivolve: { min: 1, max: 9, initial: 1 },
  Recovery: { min: 1, max: 9, initial: 1 },
  DigiBurst: { min: 1, max: 9, initial: 1 },
  Digisorption: { min: -9, max: -1, initial: -1 },
  MaterialSave: { min: 1, max: 9, initial: 1 },
  Link: { min: 1, max: 9, initial: 1 },
  Fragment: { min: 1, max: 9, initial: 1 },
};

/** These requirements remain text in this visual preview, as in printed cards. */
export const TEXT_KEYWORDS: Partial<Record<DemoKeyword, string>> = {
  Decoy: "Black",
  "Mind Link": "[Pulsemon]",
  Partition: "Lv.4 & Lv.4",
  Decode: "Lv.4",
  Overclock: "[Puppet] trait",
  UseReq: "[Appmon]",
  Detach: "[Seven Code] trait",
  Succession: "[Ceresmon]",
};

export function demoKeywordName(keyword: DemoKeyword): string {
  if (keyword === "BlastDNADigivolve") return "Blast DNA Digivolve";
  if (keyword === "BlastDigivolve") return "Blast Digivolve";
  if (keyword === "UseReq") return "Use Req.";
  return formatKeyword(keyword);
}

export function demoKeywordLabel(grant: DemoKeywordGrant): string {
  const name = demoKeywordName(grant.keyword);
  let label = name;
  if (grant.amount !== undefined) {
    if (grant.keyword === "Fragment") label += ` (${grant.amount})`;
    else if (grant.keyword === "Recovery") label += ` +${grant.amount} (Deck)`;
    else if (grant.keyword === "SecurityAttack" || grant.keyword === "Link")
      label += ` ${grant.amount >= 0 ? "+" : ""}${grant.amount}`;
    else label += ` ${grant.amount}`;
  }
  if (grant.parameter?.trim()) label += ` (${grant.parameter.trim()})`;
  return label;
}

export function demoDigimon(state: GameState, seat: Seat = 0): Permanent[] {
  const player = state.players.find((candidate) => candidate.seat === seat);
  if (!player) return [];
  return [...player.battleArea, ...(player.breeding ? [player.breeding] : [])].filter((permanent) =>
    getCardDefinition(permanent.topCard?.cardId ?? "")?.kinds.includes(CardKind.Digimon),
  );
}

export function upsertDemoKeywordGrant(
  grants: DemoKeywordGrants,
  permanentId: string,
  grant: DemoKeywordGrant,
): DemoKeywordGrants {
  const current = grants[permanentId] ?? [];
  const index = current.findIndex((candidate) => candidate.keyword === grant.keyword);
  const next = [...current];
  if (index < 0) next.push(grant);
  else next[index] = grant;
  return { ...grants, [permanentId]: next };
}

export function removeDemoKeywordGrant(
  grants: DemoKeywordGrants,
  permanentId: string,
  keyword: DemoKeyword,
): DemoKeywordGrants {
  return { ...grants, [permanentId]: (grants[permanentId] ?? []).filter((grant) => grant.keyword !== keyword) };
}

/** Apply only to a newly fabricated demo state; no live match or engine is mutated. */
export function applyDemoKeywordGrants(state: GameState, grants: DemoKeywordGrants): void {
  for (const permanent of demoDigimon(state)) {
    const additions = grants[permanent.permanentId] ?? [];
    const active = new Set(permanent.keywords);
    const granted = new Set(permanent.grantedKeywords);
    for (const addition of additions) {
      if (!DEMO_KEYWORDS.includes(addition.keyword)) continue;
      active.add(addition.keyword);
      granted.add(addition.keyword);
      if (addition.keyword === "SecurityAttack") {
        permanent.securityAttackModifier += addition.amount ?? 1;
        permanent.securityAttack = Math.max(0, Math.min(255, permanent.securityAttack + (addition.amount ?? 1)));
      }
    }
    permanent.keywords.clear();
    permanent.keywords.push(...active);
    permanent.grantedKeywords.clear();
    permanent.grantedKeywords.push(...granted);
  }
}

export function demoKeywordLabels(
  grants: DemoKeywordGrants,
): Readonly<Record<string, Readonly<Record<string, string>>>> {
  return Object.fromEntries(
    Object.entries(grants).map(([id, additions]) => [
      id,
      Object.fromEntries(additions.map((grant) => [grant.keyword, demoKeywordLabel(grant)])),
    ]),
  );
}
