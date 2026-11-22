import { getCardDefinition, parseTriggerKey } from "@aegis/shared";

export type TriggerLabelPart = {
  name: string;
  copy?: { index: number; total: number };
};

type Params = {
  triggerKeys: readonly string[];
  cardIds: readonly string[];
  getDisplayName: (cardId: string) => string;
};

export function getTriggerLabelParts({ triggerKeys, cardIds, getDisplayName }: Params): TriggerLabelPart[] {
  const entries = triggerKeys.map((key, index) => {
    const cardId = cardIds[index] ?? "";
    return {
      identity: getCardDefinition(cardId)?.nameEn ?? cardId,
      cardId,
      instanceId: parseTriggerKey(key).instanceId,
    };
  });
  const instancesByIdentity = new Map<string, string[]>();
  for (const entry of entries) {
    const seen = instancesByIdentity.get(entry.identity) ?? [];
    if (!seen.includes(entry.instanceId)) seen.push(entry.instanceId);
    instancesByIdentity.set(entry.identity, seen);
  }
  return entries.map(({ identity, cardId, instanceId }) => {
    const name = getDisplayName(cardId);
    const instances = instancesByIdentity.get(identity) ?? [];
    if (triggerKeys.length === 1 || instances.length <= 1) return { name };
    return { name, copy: { index: instances.indexOf(instanceId) + 1, total: instances.length } };
  });
}
