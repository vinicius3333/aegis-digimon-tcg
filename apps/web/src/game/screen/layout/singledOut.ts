import type { Permanent } from "@aegis/shared";
import type { PermanentChrome } from "../types";

/** Selection and pending state need a physical copy; visual pulses belong to its group. */
export function isSingledOut(permanent: Permanent, chrome: PermanentChrome): boolean {
  const id = permanent.permanentId;
  return (
    chrome.decisionHighlightPermanentId === id ||
    chrome.decisionPickedInstanceIds.has(id) ||
    chrome.decisionPickedInstanceIds.has(permanent.topCard.instanceId) ||
    chrome.pendingPermanentIds.has(id) ||
    chrome.fateBadges.has(id) ||
    chrome.attackLunge?.permanentId === id
  );
}
