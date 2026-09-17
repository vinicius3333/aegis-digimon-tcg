import type { CardInstance, Seat } from "@aegis/shared";
import type { TriggerInfo } from "../effects/EffectContext.js";

/** One deletion a rule-check sweep performed, held until the whole pass can react to it. */
export interface PooledRuleDeletion {
  trigger: TriggerInfo;
  ascensionCandidates: { instanceId: string; seat: Seat }[];
  /** Token cards vanish on deletion, so retain their sources until this window flushes. */
  transientCandidates: CardInstance[];
}

/**
 * Fuse a rule-check pass's pooled deletions into the ONE trigger the pass's single
 * [On Deletion] window runs on. The card sets are unioned because the window admits its
 * candidates by them; the scalars keep the first pooled value, since a pass produces one
 * cause (`byRule`) and the fields naming "the deleted permanent" describe a batch that is
 * now the whole pass. `deletedByDpZero` is already a per-batch "any of them" flag inside a
 * single sweep, and stays one across the pass; `deletedByDpZeroInstanceIds` carries the
 * per-card truth an effect needs.
 */
export function mergeRuleDeletions(pool: readonly PooledRuleDeletion[]): PooledRuleDeletion {
  const merged = pool.reduce<TriggerInfo>((into, { trigger }) => {
    const union = (
      key:
        | "deletedInstanceIds"
        | "deletedWasStackInstanceIds"
        | "deletedWasLinkedInstanceIds"
        | "deletedByDpZeroInstanceIds"
        | "fortitudeInstanceIds",
    ): string[] => [...(into[key] ?? []), ...(trigger[key] ?? [])];
    return {
      ...trigger,
      ...into,
      deletedInstanceIds: union("deletedInstanceIds"),
      deletedWasStackInstanceIds: union("deletedWasStackInstanceIds"),
      deletedWasLinkedInstanceIds: union("deletedWasLinkedInstanceIds"),
      deletedByDpZeroInstanceIds: union("deletedByDpZeroInstanceIds"),
      fortitudeInstanceIds: union("fortitudeInstanceIds"),
      deletedHostInstanceByInstanceId: {
        ...trigger.deletedHostInstanceByInstanceId,
        ...into.deletedHostInstanceByInstanceId,
      },
      deletedLinkHostInstanceByLinkedInstanceId: {
        ...trigger.deletedLinkHostInstanceByLinkedInstanceId,
        ...into.deletedLinkHostInstanceByLinkedInstanceId,
      },
      deletedByDpZero: into.deletedByDpZero === true || trigger.deletedByDpZero === true,
      deletedPermanentIds: [...(into.deletedPermanentIds ?? []), ...(trigger.deletedPermanentIds ?? [])],
      deletedEffectiveColorsByInstanceId: {
        ...trigger.deletedEffectiveColorsByInstanceId,
        ...into.deletedEffectiveColorsByInstanceId,
      },
      deletedPermanentSnapshots: [
        ...(into.deletedPermanentSnapshots ?? []),
        ...(trigger.deletedPermanentSnapshots ?? []),
      ],
    };
  }, {});
  return {
    trigger: merged,
    ascensionCandidates: pool.flatMap((entry) => entry.ascensionCandidates),
    transientCandidates: pool.flatMap((entry) => entry.transientCandidates),
  };
}
