import type { Translate } from "../i18n";
import { cardDisplayName } from "./cardLinks";
import { TIMING_LABELS, noticeEffectClause } from "./overlay";
import type { NarrationItem } from "./narration";

type PeekTone = "effect" | "deletion" | "keyword" | "gain" | "rejection";

export function narrationSummary(
  item: NarrationItem,
  t: Translate,
): { label: string; name: string; tone: PeekTone; cardId?: string; artId?: string; clause?: string } {
  const body = item.notice?.body;
  if (body?.variant === "effect") {
    const clause = noticeEffectClause({
      cardId: body.cardId,
      timing: body.timing,
      description: body.description,
      effectTextPart: body.effectTextPart,
      ...(body.isInherited ? { isInherited: body.isInherited } : {}),
    });
    return {
      label: (body.timing ? TIMING_LABELS[body.timing] : undefined) ?? t("overlay.effect"),
      name: `${cardDisplayName(body.cardId, t)}${body.count !== undefined && body.count > 1 ? ` ×${body.count}` : ""}`,
      tone: "effect",
      cardId: body.cardId,
      ...(body.artId ? { artId: body.artId } : {}),
      ...(clause ? { clause } : {}),
    };
  }
  if (body?.variant === "keyword")
    return {
      label: t(`notice.keyword.${body.keyword}` as const),
      name: body.keyword === "guard" ? "" : cardDisplayName(body.cardId, t),
      tone: "keyword",
      cardId: body.cardId,
    };
  if (body?.variant === "stackStrip")
    return {
      label: t(`notice.stackStrip.${body.reason}` as const),
      name: cardDisplayName(body.cardId, t),
      tone: "deletion",
      cardId: body.cardId,
    };
  if (body?.variant === "deletion")
    return {
      label: t("notice.deletion"),
      name: cardDisplayName(body.cards[0]?.cardId, t),
      tone: "deletion",
      ...(body.cards[0]?.cardId ? { cardId: body.cards[0].cardId } : {}),
    };
  if (body?.variant === "recovery" || body?.variant === "securityGain")
    return {
      label: t(body.variant === "recovery" ? "overlay.recovery" : "overlay.securityGain", { count: body.amount }),
      name: "",
      tone: "gain",
    };
  if (body?.variant === "rejection") return { label: t("notice.rejected"), name: body.reason, tone: "rejection" };
  const panel = item.panel;
  if (panel)
    return {
      label: t(panel.titleKey as "panel.revealedCards"),
      name: cardDisplayName(panel.cards[0]?.cardId, t),
      tone: "effect",
      ...(panel.cards[0]?.cardId ? { cardId: panel.cards[0].cardId } : {}),
    };
  return { label: t("overlay.effect"), name: "", tone: "effect" };
}
