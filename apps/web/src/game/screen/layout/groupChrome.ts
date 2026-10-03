import type { Permanent } from "@aegis/shared";
import type { PermanentChrome } from "../types";

/** Every copy addresses the same drawn group, including effects on a hidden member. */
export function groupChrome(members: readonly Permanent[], chrome: PermanentChrome) {
  const ids = members.map((member) => member.permanentId);
  function pulse<T extends { key: number }>(pulses: ReadonlyMap<string, T>): T | undefined {
    let newest: T | undefined;
    for (const id of ids) {
      const value = pulses.get(id);
      if (value !== undefined && (newest === undefined || value.key > newest.key)) newest = value;
    }
    return newest;
  }
  return {
    effectSource: ids.some((id) => chrome.effectSourcePermanentIds.has(id)),
    effectLinked: ids.some((id) => chrome.effectLinkedPermanentIds.has(id)),
    burst: pulse(chrome.permanentBursts),
    shake: ids.some((id) => chrome.combatImpactIds.has(id)),
    claw: ids.some((id) => chrome.combatImpactIds.has(id)),
    dpPulse: pulse(chrome.dpPulses),
    dpBadgeSuppressed: ids.some((id) => chrome.dpBadgeSuppressedIds.has(id)),
    freezePulse: pulse(chrome.freezePulses),
  };
}
