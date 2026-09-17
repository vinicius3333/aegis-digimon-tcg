import type { Translate } from "../../i18n";
import type { HandEntry, HandSelection } from "./types";

/**
 * Two copies of one card look identical in the fan, so a selection labels each
 * one by its position among the copies the way the dialog's grid does.
 */
export function buildHandCopyLabels(
  cards: readonly HandEntry[],
  selection: HandSelection | undefined,
  t: Translate,
): Map<string, string> {
  const copyLabels = new Map<string, string>();
  if (!selection) return copyLabels;
  const totals = new Map<string, number>();
  for (const entry of cards) totals.set(entry.cardId, (totals.get(entry.cardId) ?? 0) + 1);
  const seen = new Map<string, number>();
  for (const entry of cards) {
    const total = totals.get(entry.cardId) ?? 0;
    const index = (seen.get(entry.cardId) ?? 0) + 1;
    seen.set(entry.cardId, index);
    if (total > 1) copyLabels.set(entry.instanceId, t("overlay.cardCopy", { index, total }));
  }
  return copyLabels;
}
