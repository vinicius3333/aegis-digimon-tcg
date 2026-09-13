/* What the permanent inspector reads out (`PermanentDetail.cs`): not the printed
   card, but the position as it stands right now — its live DP against the printed
   figure, the keywords the server resolved for it, and every card in the stack.

   Every figure here is server truth. `Permanent.keywords` is re-derived by the
   engine each continuous-recompute pass, `currentDP` already has every modifier
   applied, and the stack is the synchronized array. Nothing is re-derived from
   card text.

   Pure projection over a `Permanent`; no rules, no measurement. */

import { getCardDefinition, type Permanent } from "@aegis/shared";
import { restrictionBadges, type RestrictionBadge } from "./fieldBadges";
import type { StackCard } from "./overlays";

/** How many security cards an attack checks with no modifier at all. */
const BASE_SECURITY_ATTACK = 1;

export interface PermanentDetail {
  permanentId: string;
  cardId: string;
  artId?: string;
  name: string;
  /** Top card, digivolution sources bottom-up, then linked cards. */
  cards: StackCard[];
  currentDP: number;
  baseDP: number;
  /** How far the live figure sits from the printed one; 0 when nothing modified it. */
  dpDelta: number;
  /** Server-resolved active keywords, printed spelling left to the caller. */
  keywords: readonly string[];
  /** The subset of those that an effect granted rather than the card printing. */
  grantedKeywords: readonly string[];
  /** Optional printed parameter labels for the demo editor. */
  keywordLabels?: Readonly<Record<string, string>>;
  /**
   * How many security cards an attack by this position would check, as the server
   * resolved it: base 1 plus every ＜Security Attack ±N＞ in effect, floored at 0
   * (`Permanent.securityAttack`). Undefined when it is the plain 1 nobody needs told.
   * A granted or inverted modifier is already folded in — this is the same figure the
   * security-check loop itself reads, not a number scraped out of printed text.
   */
  securityAttack?: number;
  /**
   * The blanket "can't ..." locks currently imposed on this position, in reading order
   * (`restrictionBadges`). Server truth like every other figure here: the engine
   * re-derives each flag from the ledger the rule itself reads.
   */
  restrictions: readonly RestrictionBadge[];
  suspended: boolean;
  summoningSick: boolean;
  inBreeding: boolean;
}

/**
 * The figure worth showing: anything other than the default single check. The keyword
 * being active and the count differing are the same question in the engine, but a
 * ＜Security Attack -1＞ takes the count to 0 with the keyword still listed, so the
 * count is what decides rather than the keyword.
 */
function shownSecurityAttack(permanent: Permanent): number | undefined {
  const resolved = permanent.securityAttack;
  if (resolved === BASE_SECURITY_ATTACK) return undefined;
  return resolved;
}

/** Everything the inspector shows for one field position. */
export function buildPermanentDetail(
  permanent: Permanent,
  keywordLabels?: Readonly<Record<string, string>>,
): PermanentDetail {
  const topCardId = permanent.topCard?.cardId ?? "";
  const cards: StackCard[] = [
    ...(topCardId
      ? [
          {
            cardId: topCardId,
            ...(permanent.topCard?.artId ? { artId: permanent.topCard.artId } : {}),
            role: "top" as const,
          },
        ]
      : []),
    ...[...permanent.stack].map((card) => ({
      cardId: card.cardId,
      ...(card.artId ? { artId: card.artId } : {}),
      role: "stack" as const,
    })),
    ...[...permanent.linked].map((card) => ({
      cardId: card.cardId,
      ...(card.artId ? { artId: card.artId } : {}),
      role: "linked" as const,
    })),
  ];
  const keywords = [...permanent.keywords];
  return {
    permanentId: permanent.permanentId,
    cardId: topCardId,
    ...(permanent.topCard?.artId ? { artId: permanent.topCard.artId } : {}),
    name: getCardDefinition(topCardId)?.nameEn ?? topCardId,
    cards,
    currentDP: permanent.currentDP,
    baseDP: permanent.baseDP,
    dpDelta: permanent.currentDP - permanent.baseDP,
    keywords,
    grantedKeywords: [...permanent.grantedKeywords],
    ...(keywordLabels ? { keywordLabels } : {}),
    securityAttack: shownSecurityAttack(permanent),
    restrictions: restrictionBadges(permanent),
    suspended: permanent.isSuspended,
    summoningSick: permanent.summoningSick,
    inBreeding: permanent.inBreeding,
  };
}

/** Printed information for a card outside the field, without inventing a permanent. */
export type CardInspectionDetail = Pick<
  PermanentDetail,
  | "cardId"
  | "artId"
  | "name"
  | "cards"
  | "currentDP"
  | "baseDP"
  | "dpDelta"
  | "keywords"
  | "grantedKeywords"
  | "keywordLabels"
  | "securityAttack"
  | "restrictions"
  | "suspended"
> & { printedOnly?: boolean };

export function buildPrintedCardDetail(cardId: string, artId?: string): CardInspectionDetail {
  const definition = getCardDefinition(cardId);
  return {
    cardId,
    artId,
    printedOnly: true,
    name: definition?.nameEn ?? cardId,
    cards: [{ cardId, artId, role: "top" }],
    currentDP: definition?.dp ?? 0,
    baseDP: definition?.dp ?? 0,
    dpDelta: 0,
    keywords: [],
    grantedKeywords: [],
    restrictions: [],
    suspended: false,
  };
}

export interface InspectorPlacement {
  /** Which side of the clicked card the panel opens on. */
  side: "left" | "right";
  left: number;
  top: number;
}

/**
 * Where the inspector opens. The reference client puts it on the opposite side of
 * the card that was clicked, so the card stays visible while its detail is read;
 * it flips back rather than sliding off when the far side has no room, and clamps
 * into the viewport either way.
 */
export function inspectorPlacement({
  anchorX,
  anchorY,
  viewportWidth,
  viewportHeight,
  panelWidth,
  panelHeight,
  gap = 16,
  margin = 12,
}: {
  anchorX: number;
  anchorY: number;
  viewportWidth: number;
  viewportHeight: number;
  panelWidth: number;
  panelHeight: number;
  gap?: number;
  margin?: number;
}): InspectorPlacement {
  // Opposite side means: a card on the left half opens its panel to the right.
  const preferRight = anchorX < viewportWidth / 2;
  const rightLeft = anchorX + gap;
  const leftLeft = anchorX - gap - panelWidth;
  const rightFits = rightLeft + panelWidth <= viewportWidth - margin;
  const leftFits = leftLeft >= margin;
  const side: "left" | "right" = preferRight
    ? rightFits || !leftFits
      ? "right"
      : "left"
    : leftFits
      ? "left"
      : "right";
  const rawLeft = side === "right" ? rightLeft : leftLeft;
  return {
    side,
    left: Math.max(margin, Math.min(rawLeft, viewportWidth - panelWidth - margin)),
    top: Math.max(margin, Math.min(anchorY - panelHeight / 2, viewportHeight - panelHeight - margin)),
  };
}
