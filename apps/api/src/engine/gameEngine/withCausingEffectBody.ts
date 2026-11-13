import type { TriggerInfo } from "#api/engine/effects/EffectContext";

export function withCausingEffectBody(payload: TriggerInfo, causingEffectBody: number | undefined): TriggerInfo {
  if (payload.causingEffectBody !== undefined || causingEffectBody === undefined) return payload;
  return { ...payload, causingEffectBody };
}
