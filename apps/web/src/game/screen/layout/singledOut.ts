import type { Permanent } from "@aegis/shared";
import type { PermanentChrome } from "../types";

/** A cue is playing on this permanent, so a group of copies must not hide which one. */
export function isSingledOut(permanent: Permanent, chrome: PermanentChrome): boolean {
  const id = permanent.permanentId;
  return (
    chrome.effectSourcePermanentIds.has(id) ||
    chrome.effectLinkedPermanentIds.has(id) ||
    chrome.decisionHighlightPermanentId === id ||
    chrome.decisionPickedInstanceIds.has(id) ||
    chrome.decisionPickedInstanceIds.has(permanent.topCard.instanceId) ||
    chrome.permanentBursts.has(id) ||
    chrome.pendingPermanentIds.has(id) ||
    chrome.fateBadges.has(id) ||
    chrome.combatImpactIds.has(id) ||
    chrome.dpPulses.has(id) ||
    chrome.freezePulses.has(id) ||
    chrome.attackLunge?.permanentId === id
  );
}
