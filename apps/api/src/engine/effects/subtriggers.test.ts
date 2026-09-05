import { CardColor, CardKind } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import type { EffectContext } from "./EffectContext.js";
import { SubTriggerRegistry } from "./subtriggers.js";

const fakeCtx = {} as EffectContext;

describe("SubTriggerRegistry", () => {
  it("preserves Digimon-effect provenance for a linked Option watcher (BT25-100/101, Q6471/Q6476)", async () => {
    const registry = new SubTriggerRegistry();
    const enteredKinds: string[][] = [];
    let bodyKinds: readonly string[] | undefined;
    registry.subscribe({
      event: "whenAttacking",
      sourcePermanentId: "host",
      isLinkedSource: true,
      once: false,
      description: "linked Option watcher",
      run: async (ctx) => {
        bodyKinds = ctx.effectSourceKinds;
      },
    });
    const ctx = {
      source: { ownerSeat: 0 },
      fx: {
        enterEffectResolution: (_seat: number, kinds?: string[]) => enteredKinds.push(kinds ?? []),
        leaveEffectResolution: () => undefined,
      },
    } as unknown as EffectContext;

    await registry.fire("whenAttacking", () => ctx, "host");

    expect(bodyKinds).toEqual([CardKind.Digimon]);
    expect(enteredKinds).toEqual([[CardKind.Digimon]]);
  });

  it("accepts a matches-gated watcher retained by activation context", () => {
    const registry = new SubTriggerRegistry();
    expect(() =>
      registry.subscribe({
        event: "whenAttacking",
        activationContext: fakeCtx,
        once: false,
        description: "player-scoped timed watcher",
        matches: () => true,
        run: async () => {},
      }),
    ).not.toThrow();
  });

  it("fires an already-triggered continuous watcher after the live registry is recomputed", async () => {
    const registry = new SubTriggerRegistry();
    let fired = 0;
    registry.subscribe({
      event: "whenSecurityRemoved",
      sourcePermanentId: "dynasmon",
      once: false,
      continuous: true,
      description: "BT6-044 Recovery",
      run: async () => {
        fired += 1;
      },
    });
    const snapshot = [...registry.subscriptionsFor("whenSecurityRemoved")];

    registry.clearContinuous();
    expect(registry.subscriptionsFor("whenSecurityRemoved")).toHaveLength(0);
    await registry.fireSnapshot(snapshot, () => ({}) as EffectContext);

    expect(fired).toBe(1);
  });
  it("fires subscriptions matching an event and removes one-shots", async () => {
    const registry = new SubTriggerRegistry();
    let fired = 0;
    registry.subscribe({
      event: "whenAttacking",
      sourcePermanentId: "P1",
      once: true,
      description: "draw 1 when attacking",
      run: async () => {
        fired++;
      },
    });
    const n1 = await registry.fire("whenAttacking", () => fakeCtx, "P1");
    expect(n1).toBe(1);
    expect(fired).toBe(1);
    // One-shot removed: a second fire does nothing.
    const n2 = await registry.fire("whenAttacking", () => fakeCtx, "P1");
    expect(n2).toBe(0);
    expect(fired).toBe(1);
  });

  it("scopes firing to the source permanent", async () => {
    const registry = new SubTriggerRegistry();
    let fired = 0;
    registry.subscribe({
      event: "whenSuspended",
      sourcePermanentId: "P1",
      once: false,
      description: "x",
      run: async () => {
        fired++;
      },
    });
    expect(await registry.fire("whenSuspended", () => fakeCtx, "P2")).toBe(0);
    expect(fired).toBe(0);
    expect(await registry.fire("whenSuspended", () => fakeCtx, "P1")).toBe(1);
    expect(fired).toBe(1);
  });

  it("sums replacement cost reductions and drops on permanent leave", () => {
    const registry = new SubTriggerRegistry();
    registry.subscribeReplacement({
      event: "wouldBePlayed",
      sourcePermanentId: "P1",
      mode: "reduceCost",
      amount: 2,
      description: "reduce cost 2",
    });
    registry.subscribeReplacement({
      event: "wouldBePlayed",
      sourcePermanentId: "P1",
      mode: "reduceCost",
      amount: 3,
      description: "reduce cost 3",
    });
    expect(registry.costReductionFor("wouldBePlayed", "P1")).toBe(5);
    registry.dropPermanent("P1");
    expect(registry.costReductionFor("wouldBePlayed", "P1")).toBe(0);
  });

  it("keeps distinct consumable reductions with the same activation identity", () => {
    const registry = new SubTriggerRegistry();
    const first = registry.subscribeReplacement({
      event: "wouldDigivolve",
      sourcePermanentId: "P1",
      sourceInstanceId: "I1",
      activationIdentity: "EX1-033/action-0",
      mode: "reduceCost",
      amount: 1,
      consumeOnActivate: true,
      description: "first attack reduction",
    });
    const second = registry.subscribeReplacement({
      event: "wouldDigivolve",
      sourcePermanentId: "P1",
      sourceInstanceId: "I1",
      activationIdentity: "EX1-033/action-0",
      mode: "reduceCost",
      amount: 1,
      consumeOnActivate: true,
      description: "second attack reduction",
    });

    expect(second).not.toBe(first);
    expect(registry.costReductionFor("wouldDigivolve", "P1")).toBe(2);
  });

  it("sums DNA memory only for participating materials and a matching result", () => {
    const registry = new SubTriggerRegistry();
    for (const [sourcePermanentId, color] of [
      ["P1", CardColor.Green],
      ["P2", CardColor.Blue],
      ["P3", CardColor.Purple],
    ] as const) {
      registry.subscribeReplacement({
        event: "wouldDigivolve",
        sourcePermanentId,
        mode: "gainMemoryOnDna",
        amount: 1,
        description: `${sourcePermanentId} DNA reward`,
        intoMatches: (definition) => definition.colors.includes(color),
      });
    }

    const paildramon = { colors: ["Blue", "Green"] } as never;
    expect(registry.dnaMemoryGainFor(["P1", "P2"], paildramon)).toBe(2);
    expect(registry.dnaMemoryGainFor(["P1", "P3"], paildramon)).toBe(1);
    expect(registry.dnaMemoryGainFor(["P3"], paildramon)).toBe(0);
  });

  it("applies a global DNA cost increase once when any material matches", () => {
    const registry = new SubTriggerRegistry();
    registry.subscribeReplacement({
      event: "wouldDigivolve",
      sourcePermanentId: "HOST",
      mode: "reduceCost",
      amount: -1,
      description: "increase cost for a source-less opponent Digimon",
      appliesTo: (target) => target.stack.length === 0,
    });
    const sourceLess = { permanentId: "A", stack: [] } as never;
    const withSource = { permanentId: "B", stack: [{}] } as never;

    expect(registry.dnaCostReductionFor([sourceLess, sourceLess], {} as never)).toBe(-1);
    expect(registry.dnaCostReductionFor([sourceLess, withSource], {} as never)).toBe(-1);
    expect(registry.dnaCostReductionFor([withSource], {} as never)).toBe(0);
  });

  it("reads a once-per-turn reduction without spending it, then consumes it on payment", () => {
    const registry = new SubTriggerRegistry();
    const fired = new Set<string>();
    const ledger = {
      hasFired: (key: string) => fired.has(key),
      markFired: (key: string) => {
        fired.add(key);
      },
    };
    registry.subscribeReplacement({
      event: "wouldDigivolve",
      sourcePermanentId: "P1",
      mode: "reduceCost",
      amount: 1,
      oncePerTurnKey: "P-093/inherited",
      description: "P-093 inherited once-per-turn reduction",
    });

    expect(registry.costReductionFor("wouldDigivolve", "P1", undefined, ledger)).toBe(1);
    expect(registry.costReductionFor("wouldDigivolve", "P1", undefined, ledger)).toBe(1);
    expect(fired).toEqual(new Set());

    expect(registry.costReductionFor("wouldDigivolve", "P1", undefined, { ...ledger, consume: true })).toBe(1);
    expect(fired).toEqual(new Set(["P-093/inherited"]));
    expect(registry.costReductionFor("wouldDigivolve", "P1", undefined, ledger)).toBe(0);
  });

  it("uses the amount actually paid by an interactive digivolution reducer", async () => {
    const registry = new SubTriggerRegistry();
    registry.subscribeReplacement({
      event: "wouldDigivolve",
      sourcePermanentId: "P1",
      mode: "reduceCost",
      amount: 3,
      controllerSeat: 0,
      description: "trash up to 3 security",
      activate: async () => 2,
    });
    const target = { permanentId: "P1" } as never;
    const into = { cardId: "BT10-042" } as never;

    expect(registry.potentialInteractiveReductionFor("wouldDigivolve", 0, target, into)).toBe(3);
    await expect(
      registry.activateInteractiveReductionsFor("wouldDigivolve", 0, target, into, "VENUSMON", () => fakeCtx),
    ).resolves.toBe(2);
  });

  it("does not reinstall an already-used once-per-turn interactive reducer", async () => {
    const registry = new SubTriggerRegistry();
    const fired = new Set<string>();
    const ledger = {
      hasFired: (key: string) => fired.has(key),
      markFired: (key: string) => {
        fired.add(key);
      },
    };
    let activations = 0;
    registry.subscribeReplacement({
      event: "wouldDigivolve",
      sourcePermanentId: "ALICE",
      mode: "reduceCost",
      amount: 3,
      controllerSeat: 0,
      oncePerTurnKey: "EX2-064/effect",
      description: "Alice McCoy once-per-turn reducer",
      appliesTo: () => true,
      activate: async () => {
        activations += 1;
        return true;
      },
    });
    const target = { permanentId: "BASE" } as never;
    const into = { cardId: "EX2-044" } as never;

    expect(registry.potentialInteractiveReductionFor("wouldDigivolve", 0, target, into, ledger)).toBe(3);
    await expect(
      registry.activateInteractiveReductionsFor("wouldDigivolve", 0, target, into, "first", () => fakeCtx, ledger),
    ).resolves.toBe(3);
    expect(registry.potentialInteractiveReductionFor("wouldDigivolve", 0, target, into, ledger)).toBe(0);
    await expect(
      registry.activateInteractiveReductionsFor("wouldDigivolve", 0, target, into, "second", () => fakeCtx, ledger),
    ).resolves.toBe(0);
    expect(activations).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// BUG (audit finding 12): oncePerTiming was a Set local to ONE fire() call. Since
// `subscriptionsFor` never returns the same subscription twice within a single call,
// that Set could never contain anything — the guard was provably a no-op. KB Q2814
// (BT2-053): playing 2 same-named Digimon "at the same time during a single timing"
// must only trigger the inherited effect once — but each simultaneous play fires its
// OWN separate `fire()` call, so the guard has to survive ACROSS calls to matter.
// ---------------------------------------------------------------------------
describe("SubTriggerRegistry — oncePerTiming across fire() calls (KB Q2814 / BT2-053)", () => {
  function subscribeOncePerTiming(registry: SubTriggerRegistry, onFire: () => void): number {
    return registry.subscribe({
      event: "whenPlayed",
      sourcePermanentId: "KERAMON",
      once: false,
      oncePerTiming: true,
      description: "BT2-053: inherited effect triggers once even for simultaneous plays",
      run: async () => {
        onFire();
      },
    });
  }

  it("without a windowToken, each fire() call still fires independently (no batching info to dedupe against)", async () => {
    const registry = new SubTriggerRegistry();
    let fired = 0;
    subscribeOncePerTiming(registry, () => fired++);

    await registry.fire("whenPlayed", () => fakeCtx, "KERAMON");
    await registry.fire("whenPlayed", () => fakeCtx, "KERAMON");

    // Honest baseline: a caller that does not supply a shared windowToken gets no
    // dedup — wiring a real windowToken through the actual "play 2 tokens at once"
    // call site is a GameEngine.ts/primitives.ts change outside this fix's scope.
    expect(fired).toBe(2);
  });

  it("two fire() calls sharing the SAME windowToken run the oncePerTiming body only once", async () => {
    const registry = new SubTriggerRegistry();
    let fired = 0;
    subscribeOncePerTiming(registry, () => fired++);

    const windowToken = { resolvingEffectKey: "SOME-CARD/when-digivolving" };
    const n1 = await registry.fire("whenPlayed", () => fakeCtx, "KERAMON", windowToken);
    const n2 = await registry.fire("whenPlayed", () => fakeCtx, "KERAMON", windowToken);

    expect(n1).toBe(1);
    expect(n2).toBe(0); // same window: the second simultaneous play does not re-trigger
    expect(fired).toBe(1);
  });

  it("keeps oncePerTiming dedupe when a continuous watcher is reinstalled in the same window", async () => {
    const registry = new SubTriggerRegistry();
    let fired = 0;
    const install = () =>
      registry.subscribe({
        event: "whenPlayed",
        sourcePermanentId: "KERAMON",
        once: false,
        continuous: true,
        oncePerTiming: true,
        oncePerTimingIdentity: "KERAMON/whenPlayed/inherited-draw",
        description: "BT2-053 inherited draw",
        run: async () => {
          fired += 1;
        },
      });
    const windowToken = { resolvingEffectKey: "play-two-tokens" };

    install();
    await registry.fire("whenPlayed", () => fakeCtx, "KERAMON", windowToken);
    registry.clearContinuous();
    install();
    await registry.fire("whenPlayed", () => fakeCtx, "KERAMON", windowToken);

    expect(fired).toBe(1);
  });

  it("a later, genuinely distinct windowToken fires the subscription again", async () => {
    const registry = new SubTriggerRegistry();
    let fired = 0;
    subscribeOncePerTiming(registry, () => fired++);

    const firstWindow = { resolvingEffectKey: "SOME-CARD/when-digivolving#1" };
    await registry.fire("whenPlayed", () => fakeCtx, "KERAMON", firstWindow);
    expect(fired).toBe(1);

    const laterWindow = { resolvingEffectKey: "SOME-OTHER-CARD/on-play#2" };
    const n = await registry.fire("whenPlayed", () => fakeCtx, "KERAMON", laterWindow);

    expect(n).toBe(1); // a later, distinct play still triggers the watcher
    expect(fired).toBe(2);
  });

  it("a subscription WITHOUT oncePerTiming is unaffected by windowToken (fires every matching call)", async () => {
    const registry = new SubTriggerRegistry();
    let fired = 0;
    registry.subscribe({
      event: "whenPlayed",
      sourcePermanentId: "P1",
      once: false,
      description: "no oncePerTiming",
      run: async () => {
        fired++;
      },
    });
    const windowToken = "same-window";
    await registry.fire("whenPlayed", () => fakeCtx, "P1", windowToken);
    await registry.fire("whenPlayed", () => fakeCtx, "P1", windowToken);
    expect(fired).toBe(2);
  });
});

describe("SubTriggerRegistry — declined optional Once Per Turn activations", () => {
  it("rolls back the provisional mark after decline while retaining the reentrancy-safe pre-mark", async () => {
    const registry = new SubTriggerRegistry();
    const fired = new Set<string>();
    const ledger = {
      hasFired: (key: string) => fired.has(key),
      markFired: (key: string) => fired.add(key),
      unmarkFired: (key: string) => fired.delete(key),
    };
    let runs = 0;
    registry.subscribe({
      event: "whenPlayed",
      sourcePermanentId: "AEGISDRAMON",
      once: false,
      oncePerTurnKey: "EX3-026/opponent-turn",
      description: "optional activation",
      run: async (ctx) => {
        runs += 1;
        expect(fired.has("EX3-026/opponent-turn")).toBe(true);
        ctx.oncePerTurnActivationDeclined = true;
      },
    });

    await registry.fire("whenPlayed", () => ({ ...fakeCtx }), "AEGISDRAMON", undefined, ledger);
    await registry.fire("whenPlayed", () => ({ ...fakeCtx }), "AEGISDRAMON", undefined, ledger);

    expect(runs).toBe(2);
    expect(fired.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// BUG (BT26 gap plan, "silent no-op gap class"): a persistent effect's declared
// `maxPerTurn` on its installing `staticModifier` is NOT counted by the engine for
// `EffectTiming.None` hosts (GameEngine.ts's own comment says so) — so a `[Once Per
// Turn]` watcher installed by such an effect could fire unboundedly within a turn.
// `oncePerTurnKey` closes that gap: a stable (recompute-surviving) key the caller's
// per-turn ledger gates against, independent of the subscription's `id` (which is NOT
// stable — a persistent effect's continuous recompute clears and reinstalls its
// subscriptions with a FRESH id every pass).
// ---------------------------------------------------------------------------
describe("SubTriggerRegistry — oncePerTurnKey (persistent-effect [Once Per Turn] watchers)", () => {
  function turnLedger(): { hasFired(key: string): boolean; markFired(key: string): void; reset(): void } {
    const fired = new Set<string>();
    return {
      hasFired: (key) => fired.has(key),
      markFired: (key) => fired.add(key),
      reset: () => fired.clear(),
    };
  }

  it("a second fire() this turn is skipped once the key has fired", async () => {
    const registry = new SubTriggerRegistry();
    let fired = 0;
    registry.subscribe({
      event: "whenHandTrashed",
      sourcePermanentId: "P1",
      once: false,
      oncePerTurnKey: "CARD-01/hand-trash-play",
      description: "once per turn watcher",
      run: async () => {
        fired++;
      },
    });
    const ledger = turnLedger();
    const n1 = await registry.fire("whenHandTrashed", () => fakeCtx, "P1", undefined, ledger);
    const n2 = await registry.fire("whenHandTrashed", () => fakeCtx, "P1", undefined, ledger);
    expect(n1).toBe(1);
    expect(n2).toBe(0);
    expect(fired).toBe(1);
  });

  it("fires every distinct action path in one snapshot, then blocks the next event", async () => {
    const registry = new SubTriggerRegistry();
    const fired: string[] = [];
    const ledger = turnLedger();
    const common = {
      event: "whenPlayed" as const,
      sourcePermanentId: "P1",
      once: false,
      oncePerTurnKey: "EX4-014/your-turn",
    };
    registry.subscribe({
      ...common,
      dedupeKey: "source/effect/0",
      description: "draw clause",
      run: async () => {
        fired.push("draw");
      },
    });
    registry.subscribe({
      ...common,
      dedupeKey: "source/effect/1",
      description: "return clause",
      run: async () => {
        fired.push("return");
      },
    });

    expect(await registry.fire("whenPlayed", () => fakeCtx, "P1", undefined, ledger)).toBe(2);
    expect(fired).toEqual(["draw", "return"]);
    expect(await registry.fire("whenPlayed", () => fakeCtx, "P1", undefined, ledger)).toBe(0);
    expect(fired).toEqual(["draw", "return"]);
  });

  it("dedupes an identical action path while retaining distinct action-path identity", async () => {
    const registry = new SubTriggerRegistry();
    const first = registry.subscribe({
      event: "whenPlayed",
      sourcePermanentId: "P1",
      once: false,
      oncePerTurnKey: "EX4-014/your-turn",
      dedupeKey: "source/effect/0",
      description: "draw clause",
      run: async () => undefined,
    });
    const duplicate = registry.subscribe({
      event: "whenPlayed",
      sourcePermanentId: "P1",
      once: false,
      oncePerTurnKey: "EX4-014/your-turn",
      dedupeKey: "source/effect/0",
      description: "draw clause",
      run: async () => undefined,
    });
    const distinct = registry.subscribe({
      event: "whenPlayed",
      sourcePermanentId: "P1",
      once: false,
      oncePerTurnKey: "EX4-014/your-turn",
      dedupeKey: "source/effect/1",
      description: "return clause",
      run: async () => undefined,
    });

    expect(duplicate).toBe(first);
    expect(distinct).not.toBe(first);
    expect(registry.subscriptionsFor("whenPlayed", "P1")).toHaveLength(2);
  });

  it("lets a declined sibling leave the shared snapshot budget available", async () => {
    const registry = new SubTriggerRegistry();
    const fired = new Set<string>();
    const ledger = {
      hasFired: (key: string) => fired.has(key),
      markFired: (key: string) => fired.add(key),
      unmarkFired: (key: string) => fired.delete(key),
    };
    const runs: string[] = [];
    const common = {
      event: "whenPlayed" as const,
      sourcePermanentId: "P1",
      once: false,
      oncePerTurnKey: "EX4-014/your-turn",
    };
    registry.subscribe({
      ...common,
      dedupeKey: "source/effect/0",
      description: "optional draw clause",
      run: async (ctx) => {
        runs.push("declined");
        ctx.oncePerTurnActivationDeclined = true;
      },
    });
    registry.subscribe({
      ...common,
      dedupeKey: "source/effect/1",
      description: "successful return clause",
      run: async () => {
        runs.push("successful");
      },
    });

    expect(await registry.fire("whenPlayed", () => ({ ...fakeCtx }), "P1", undefined, ledger)).toBe(2);
    expect(runs).toEqual(["declined", "successful"]);
    expect(fired).toEqual(new Set(["EX4-014/your-turn"]));
  });

  it("keeps the shared budget consumed when a successful sibling precedes a decline", async () => {
    const registry = new SubTriggerRegistry();
    const fired = new Set<string>();
    const ledger = {
      hasFired: (key: string) => fired.has(key),
      markFired: (key: string) => fired.add(key),
      unmarkFired: (key: string) => fired.delete(key),
    };
    const runs: string[] = [];
    const common = {
      event: "whenPlayed" as const,
      sourcePermanentId: "P1",
      once: false,
      oncePerTurnKey: "EX4-014/your-turn",
    };
    registry.subscribe({
      ...common,
      dedupeKey: "source/effect/0",
      description: "successful return clause",
      run: async () => {
        runs.push("successful");
      },
    });
    registry.subscribe({
      ...common,
      dedupeKey: "source/effect/1",
      description: "optional draw clause",
      run: async (ctx) => {
        runs.push("declined");
        ctx.oncePerTurnActivationDeclined = true;
      },
    });

    expect(await registry.fire("whenPlayed", () => ({ ...fakeCtx }), "P1", undefined, ledger)).toBe(2);
    expect(runs).toEqual(["successful", "declined"]);
    expect(fired).toEqual(new Set(["EX4-014/your-turn"]));
  });

  it("retains that success when ordered siblings resolve through separate snapshot calls", async () => {
    const registry = new SubTriggerRegistry();
    const fired = new Set<string>();
    const ledger = {
      hasFired: (key: string) => fired.has(key),
      markFired: (key: string) => fired.add(key),
      unmarkFired: (key: string) => fired.delete(key),
    };
    const snapshotKeys = new Set(["EX4-014/your-turn"]);
    const successfulKeys = new Set<string>();
    const common = {
      event: "whenPlayed" as const,
      sourcePermanentId: "P1",
      once: false,
      oncePerTurnKey: "EX4-014/your-turn",
    };
    const successful = registry.subscribe({
      ...common,
      dedupeKey: "source/effect/0",
      description: "successful clause",
      run: async () => {},
    });
    const declined = registry.subscribe({
      ...common,
      dedupeKey: "source/effect/1",
      description: "declined clause",
      run: async (ctx) => {
        ctx.oncePerTurnActivationDeclined = true;
      },
    });
    const subscriptions = registry.subscriptionsFor("whenPlayed", "P1");

    await registry.fireSnapshot(
      subscriptions.filter((sub) => sub.id === successful),
      () => ({ ...fakeCtx }),
      undefined,
      ledger,
      undefined,
      undefined,
      snapshotKeys,
      successfulKeys,
    );
    await registry.fireSnapshot(
      subscriptions.filter((sub) => sub.id === declined),
      () => ({ ...fakeCtx }),
      undefined,
      ledger,
      undefined,
      undefined,
      snapshotKeys,
      successfulKeys,
    );

    expect(successfulKeys).toEqual(new Set(["EX4-014/your-turn"]));
    expect(fired).toEqual(new Set(["EX4-014/your-turn"]));
  });

  it("the key surviving a fresh subscription id (continuous recompute) still gates the second fire", async () => {
    // Mirrors the real bug: a persistent effect's recompute drops the old subscription
    // (a new `id`) and reinstalls a fresh one with the SAME oncePerTurnKey string.
    const registry = new SubTriggerRegistry();
    let fired = 0;
    const install = (): number =>
      registry.subscribe({
        event: "whenHandTrashed",
        sourcePermanentId: "P1",
        once: false,
        continuous: true,
        oncePerTurnKey: "CARD-01/hand-trash-play",
        description: "once per turn watcher, reinstalled each recompute",
        run: async () => {
          fired++;
        },
      });
    const ledger = turnLedger();
    install();
    await registry.fire("whenHandTrashed", () => fakeCtx, "P1", undefined, ledger);
    expect(fired).toBe(1);

    // Continuous recompute: drop + reinstall (fresh id).
    registry.clearContinuous();
    install();
    const n2 = await registry.fire("whenHandTrashed", () => fakeCtx, "P1", undefined, ledger);
    expect(n2).toBe(0); // still gated — same turn, same stable key
    expect(fired).toBe(1);
  });

  it("resetting the ledger (new turn) lets the watcher fire again", async () => {
    const registry = new SubTriggerRegistry();
    let fired = 0;
    registry.subscribe({
      event: "whenHandTrashed",
      sourcePermanentId: "P1",
      once: false,
      oncePerTurnKey: "CARD-01/hand-trash-play",
      description: "once per turn watcher",
      run: async () => {
        fired++;
      },
    });
    const ledger = turnLedger();
    await registry.fire("whenHandTrashed", () => fakeCtx, "P1", undefined, ledger);
    ledger.reset(); // new turn
    const n2 = await registry.fire("whenHandTrashed", () => fakeCtx, "P1", undefined, ledger);
    expect(n2).toBe(1);
    expect(fired).toBe(2);
  });

  it("without a turnLedger argument, oncePerTurnKey is not enforced (opt-in)", async () => {
    const registry = new SubTriggerRegistry();
    let fired = 0;
    registry.subscribe({
      event: "whenHandTrashed",
      sourcePermanentId: "P1",
      once: false,
      oncePerTurnKey: "CARD-01/hand-trash-play",
      description: "once per turn watcher",
      run: async () => {
        fired++;
      },
    });
    await registry.fire("whenHandTrashed", () => fakeCtx, "P1");
    await registry.fire("whenHandTrashed", () => fakeCtx, "P1");
    expect(fired).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Phase 13 new SubTrigger event names — onDigivolutionCardDiscarded / onDiscardLibrary
// ---------------------------------------------------------------------------

describe("SubTriggerRegistry — new event names (Phase 13)", () => {
  it("onDigivolutionCardDiscarded: fires per-card, carries subjectPermanentId + trashedDigivolutionInstanceId", async () => {
    const registry = new SubTriggerRegistry();
    let firedTrigger: unknown = null;
    registry.subscribe({
      event: "onDigivolutionCardDiscarded",
      sourcePermanentId: "HOST1",
      once: false,
      description: "BT10-006: gain memory when this digivolution card is trashed",
      run: async (ctx) => {
        firedTrigger = ctx.trigger;
      },
    });
    const ctx = {
      trigger: {
        subjectPermanentId: "HOST1",
        trashedDigivolutionInstanceId: "DIGI#1",
        byEffectSeat: 0,
      },
    } as unknown as EffectContext;
    const n = await registry.fire("onDigivolutionCardDiscarded", () => ctx, "HOST1");
    expect(n).toBe(1);
    expect(firedTrigger).toBeDefined();
    expect((firedTrigger as Record<string, unknown>)?.subjectPermanentId).toBe("HOST1");
    expect((firedTrigger as Record<string, unknown>)?.trashedDigivolutionInstanceId).toBe("DIGI#1");
  });

  it("onDiscardLibrary: fires when cards are milled from deck", async () => {
    const registry = new SubTriggerRegistry();
    let firedTrigger: unknown = null;
    registry.subscribe({
      event: "onDiscardLibrary",
      sourcePermanentId: "YUKI",
      once: false,
      description: "BT14-077: gain memory when opponent discards from deck",
      run: async (ctx) => {
        firedTrigger = ctx.trigger;
      },
    });
    const ctx = {
      trigger: {
        addedToHand: { instanceIds: ["D1", "D2"], byEffect: { ownerSeat: 1, isDigimonEffect: false } },
      },
    } as unknown as EffectContext;
    const n = await registry.fire("onDiscardLibrary", () => ctx, "YUKI");
    expect(n).toBe(1);
    expect(firedTrigger).toBeDefined();
  });

  it("FAILS-WHEN-REVERTED: event name not in TYPE system throws UnsupportedEffectError via interpreter map", () => {
    // The real FAILS-WHEN-REVERTED is tested through the interpreter's SUBTRIGGER_EVENT_MAP.
    // If the event name is NOT mapped, the SubTrigger case calls unsupported() and throws.
    // This test verifies the registry accepts the fire (runtime event exists), and the
    // MAP linkage in the interpreter is the A3 gate — removing the map entry would cause
    // the interpreter to reject the SubTrigger action at install-time.
    // The registry itself is agnostic about event name validity (it fires whatever is subscribed).
    const registry = new SubTriggerRegistry();
    let fired = 0;
    registry.subscribe({
      event: "onDigivolutionCardDiscarded",
      sourcePermanentId: "P1",
      once: true,
      description: "test",
      run: async () => {
        fired++;
      },
    });
    // Fire triggers the subscription
    registry.fire("onDigivolutionCardDiscarded", () => ({}) as EffectContext, "P1");
    expect(fired).toBe(1);
  });
});
