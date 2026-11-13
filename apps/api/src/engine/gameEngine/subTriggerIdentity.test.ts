import { describe, expect, it } from "vitest";
import type { EffectContext, SubTriggerEventName, TriggerInfo } from "#api/engine/effects/EffectContext";
import type { SubTriggerSubscription } from "#api/engine/effects/subtriggers";
import {
  subTriggerIdentity,
  uniqueOncePerTurnWatcherOccurrences,
  type ArmedSubTrigger,
} from "#api/engine/gameEngine/subTriggerIdentity";

const watcher = (event: SubTriggerEventName): SubTriggerSubscription =>
  ({
    id: 1,
    event,
    sourcePermanentId: "perm-1",
    sourceInstanceId: "source",
    description: "[All Turns] [Once Per Turn] When a card is added to your security stack, gain 1 memory.",
    oncePerTurnKey: "source/opt",
  }) as SubTriggerSubscription;

const armedFrom = (sub: SubTriggerSubscription, windowToken: number, trigger: TriggerInfo = {}): ArmedSubTrigger => {
  const ctx = { trigger } as EffectContext;
  return {
    sub,
    ctx,
    contextAtFireTime: () => ctx,
    occurrence: {
      windowToken,
      oncePerTurnSnapshotKeys: new Set(),
      oncePerTurnSuccessfulKeys: new Set(),
      resolvedWatcherKeys: new Set(),
    },
  };
};

describe("pending once-per-turn watcher occurrences", () => {
  it("keeps a watcher pending once per causing effect body", () => {
    const sub = watcher("whenAddSecurity");
    const earlier = armedFrom(sub, 7);
    const later = armedFrom(sub, 9);

    expect(uniqueOncePerTurnWatcherOccurrences([earlier, later])).toEqual([earlier, later]);
  });

  it("merges the subjects of one effect body into a single occurrence", () => {
    const sub = watcher("onDeletionOf");
    const firstSubject = armedFrom(sub, 7, { deletedPermanentId: "perm-2" });
    const secondSubject = armedFrom(sub, 7, { deletedPermanentId: "perm-3" });

    expect(uniqueOncePerTurnWatcherOccurrences([firstSubject, secondSubject])).toEqual([firstSubject]);
  });

  it("keeps one occurrence per attack declaration", () => {
    const sub = watcher("whenAttacking");

    expect(uniqueOncePerTurnWatcherOccurrences([armedFrom(sub, 7), armedFrom(sub, 9)])).toHaveLength(1);
  });
});

describe("consumed watcher identity", () => {
  it("separates events caused by different effect bodies", () => {
    const sub = watcher("whenAddSecurity");

    expect(subTriggerIdentity(sub, { causingEffectBody: 7 })).not.toBe(
      subTriggerIdentity(sub, { causingEffectBody: 9 }),
    );
    expect(subTriggerIdentity(sub, { causingEffectBody: 7 })).toBe(subTriggerIdentity(sub, { causingEffectBody: 7 }));
  });

  it("separates each Option use", () => {
    const sub = watcher("whenOptionUsed");

    expect(subTriggerIdentity(sub, { optionUseEventId: 1, causingEffectBody: 7 })).not.toBe(
      subTriggerIdentity(sub, { optionUseEventId: 2, causingEffectBody: 7 }),
    );
  });
});
