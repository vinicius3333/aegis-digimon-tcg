/* What the permanent inspector reads out (`PermanentDetail.cs`): not the printed
   card, but the position as it stands right now — its live DP against the printed
   figure, the keywords the server resolved for it, and every card in the stack.

   Every figure here is server truth. `Permanent.keywords` is re-derived by the
   engine each continuous-recompute pass, `currentDP` already has every modifier
   applied, and the stack is the synchronized array. Nothing is re-derived from
   card text — with one narrow exception, called out on `securityAttackPrinted`
   below.

   Pure projection over a `Permanent`; no rules, no measurement. */

import { getCardDefinition, type Permanent } from "@aegis/shared";
import type { StackCard } from "./overlays";

/**
 * The keyword the server normalizes ＜Security Attack +N＞ down to. The engine
 * strips the parameter, so the resolved list says only *that* the position attacks
 * security more than once.
 */
const SECURITY_ATTACK_KEYWORD = "SecurityAttack";

/** The printed spelling on the card, which still carries the number. */
const SECURITY_ATTACK_PRINTED = /＜Security Attack ([+-]?\d+)＞/;

export interface PermanentDetail {
  permanentId: string;
  cardId: string;
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
  /**
   * The ＜Security Attack＞ value as *printed on the top card*, shown only when the
   * server's resolved keyword list says the keyword is actually active. The engine
   * normalizes the parameter away, so a granted or modified value cannot be shown;
   * undefined means "active, value not projected" as much as it means "absent" —
   * which is why the badge reads the keyword and this only decorates it.
   */
  securityAttackPrinted?: number;
  suspended: boolean;
  summoningSick: boolean;
  inBreeding: boolean;
}

function printedSecurityAttack(cardId: string): number | undefined {
  const text = `${getCardDefinition(cardId)?.effectText ?? ""} ${getCardDefinition(cardId)?.inheritedEffectText ?? ""}`;
  const match = SECURITY_ATTACK_PRINTED.exec(text);
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : undefined;
}

/** Everything the inspector shows for one field position. */
export function buildPermanentDetail(permanent: Permanent): PermanentDetail {
  const topCardId = permanent.topCard?.cardId ?? "";
  const cards: StackCard[] = [
    ...(topCardId ? [{ cardId: topCardId, role: "top" as const }] : []),
    ...[...permanent.stack].map((card) => ({ cardId: card.cardId, role: "stack" as const })),
    ...[...permanent.linked].map((card) => ({ cardId: card.cardId, role: "linked" as const })),
  ];
  const keywords = [...permanent.keywords];
  return {
    permanentId: permanent.permanentId,
    cardId: topCardId,
    name: getCardDefinition(topCardId)?.nameEn ?? topCardId,
    cards,
    currentDP: permanent.currentDP,
    baseDP: permanent.baseDP,
    dpDelta: permanent.currentDP - permanent.baseDP,
    keywords,
    grantedKeywords: [...permanent.grantedKeywords],
    securityAttackPrinted: keywords.includes(SECURITY_ATTACK_KEYWORD) ? printedSecurityAttack(topCardId) : undefined,
    suspended: permanent.isSuspended,
    summoningSick: permanent.summoningSick,
    inBreeding: permanent.inBreeding,
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
