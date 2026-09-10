import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import type { SubTriggerSubscription } from "../../engine/effects/subtriggers.js";
import { compiled } from "./EX2-037.js";
import "./EX2-037.js";
import "./EX2-034.js";
import "./EX2-014.js";
import "../BT1/BT1-009.js";
import "../BT1/BT1-010.js";
import "../BT1/BT1-011.js";
import "../BT1/BT1-012.js";
import "../BT1/BT1-013.js";
import "../BT1/BT1-014.js";
import "../BT1/BT1-036.js";

const inertSecurity = ["BT1-009", "BT1-010"];

describe("EX2-037 Reapermon", () => {
  it("matches the catalog and compiled IR for Reboot and its mandatory once-per-turn effect", () => {
    expect(getCardDefinition("EX2-037")).toMatchObject({
      cardId: "EX2-037",
      nameEn: "Reapermon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 11000,
      evoCosts: [{ color: "Black", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Cyborg"],
      effectText:
        "＜Reboot＞ (Unsuspend this Digimon during your opponent's unsuspend phase.)[Opponent's Turn][Once Per Turn] When an opponent's Digimon becomes unsuspended, <De-Digivolve 1> that Digimon.",
    });
    expect(compiled).toMatchObject({
      effects: [
        { trigger: "Static", keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }] },
        {
          trigger: "OpponentsTurn",
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenUnsuspended",
              sourceFilter: { controller: "opponent", kind: ["Digimon"] },
              actions: [
                {
                  kind: "DeDigivolve",
                  target: {
                    sourceRef: "triggerSubject",
                    filter: { controllerDefault: "opponent", kind: ["Digimon"] },
                    count: 1,
                  },
                  amount: 1,
                },
              ],
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("has Reboot", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-037", as: "reapermon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("reapermon"), "Reboot")).toBe(true);
  });

  it("arms the Opponent's Turn watcher and observes the public unsuspend subject", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-037", as: "reapermon" }] },
        1: {
          battleArea: [{ card: "EX2-037", as: "target", under: ["EX2-032", "EX2-031"], suspended: true }],
          hand: [{ card: "BT1-036", as: "unsuspender" }],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    const registry = (
      s.engine as unknown as {
        subTriggers: {
          subscriptionsFor(event: string): ReadonlyArray<SubTriggerSubscription>;
          subscribe(subscription: Omit<SubTriggerSubscription, "id">): number;
        };
      }
    ).subTriggers;
    expect(
      registry
        .subscriptionsFor("whenUnsuspended")
        .some((subscription) => subscription.sourcePermanentId === s.perm("reapermon").permanentId),
    ).toBe(true);

    const seenUnsuspends: unknown[] = [];
    const seenWatcherBodies: unknown[] = [];
    const reapermonId = s.perm("reapermon").permanentId;
    expect(
      registry
        .subscriptionsFor("whenUnsuspended")
        .some((subscription) => subscription.sourcePermanentId === reapermonId),
    ).toBe(true);
    const originalSubscribe = registry.subscribe.bind(registry);
    registry.subscribe = (subscription) => {
      if (subscription.event === "whenUnsuspended" && subscription.sourcePermanentId === reapermonId) {
        subscription = {
          ...subscription,
          run: async (context) => {
            seenWatcherBodies.push({
              trigger: context.trigger,
              sourcePermanentId: context.source.permanent()?.permanentId,
            });
          },
        };
      }
      return originalSubscribe(subscription);
    };
    const instrumented = s.engine as unknown as {
      fireSubTrigger: (event: string, payload?: unknown, sourceScope?: unknown) => Promise<void>;
    };
    const fireSubTrigger = instrumented.fireSubTrigger.bind(s.engine);
    instrumented.fireSubTrigger = async (event, payload, sourceScope) => {
      if (event === "whenUnsuspended") seenUnsuspends.push(payload);
      return fireSubTrigger(event, payload, sourceScope);
    };

    preferred.push(s.perm("target").topCard.instanceId);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("unsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => seenWatcherBodies.length > 0);
    expect(seenUnsuspends).toContainEqual({ unsuspendedPermanentId: s.perm("target").permanentId });
    expect(seenWatcherBodies).toHaveLength(1);
    expect(seenWatcherBodies).toContainEqual({
      trigger: { unsuspendedPermanentId: s.perm("target").permanentId },
      sourcePermanentId: reapermonId,
    });
  });

  it("de-digivolves the opponent Digimon that became unsuspended", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: ["EX2-037"], deck: ["BT1-011", "BT1-012"], security: inertSecurity },
        1: {
          battleArea: [{ card: "EX2-037", as: "target", under: ["EX2-032", "EX2-031"], suspended: true }],
          hand: [{ card: "BT1-036", as: "unsuspender" }],
          deck: ["BT1-013", "BT1-014"],
          security: inertSecurity,
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    await s.ready();
    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    preferred.push(s.perm("target").topCard.instanceId);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("unsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 1);
    expect(s.perm("target").stack).toHaveLength(1);
    // The live top card is not part of `stack`; de-digivolve removes the previous
    // top (EX2-031), promoting the first source (EX2-032).
    expect(s.perm("target").topCard.cardId).toBe("EX2-031");
    expect(s.perm("target").stack[0]?.cardId).toBe("EX2-032");
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("de-digivolves only once when the opponent unsuspends twice in one turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: ["EX2-037"], deck: ["BT1-011", "BT1-012"], security: inertSecurity },
        1: {
          battleArea: [
            { card: "EX2-037", as: "target1", under: ["EX2-032", "EX2-031"], suspended: true },
            { card: "EX2-037", as: "target2", under: ["EX2-032", "EX2-031"], suspended: true },
          ],
          hand: [
            { card: "BT1-036", as: "firstUnsuspender" },
            { card: "BT1-036", as: "secondUnsuspender" },
          ],
          deck: ["BT1-013", "BT1-014"],
          security: inertSecurity,
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    await s.ready();

    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    s.state.memory = 12;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("target1").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target1").isSuspended);
    preferred.push(s.perm("target1").topCard.instanceId);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("firstUnsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target1").stack.length === 1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("target2").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target2").isSuspended);
    preferred[0] = s.perm("target2").topCard.instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("secondUnsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("target2").isSuspended);
    expect([s.perm("target1").stack.length, s.perm("target2").stack.length].sort()).toEqual([1, 2]);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("consumes its once-per-turn trigger even when the selected Digimon has no cards to de-digivolve", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: ["EX2-037"],
          deck: ["BT1-011", "BT1-012"],
          security: inertSecurity,
        },
        1: {
          battleArea: [
            // Override DP so this source-free Digimon survives the public security
            // attack used to create the first unsuspend transition.
            { card: "EX2-014", as: "noSource", dp: 12000, suspended: true },
            { card: "EX2-037", as: "stacked", under: ["EX2-032", "EX2-031"], suspended: true },
          ],
          hand: [
            { card: "BT1-036", as: "firstUnsuspender" },
            { card: "BT1-036", as: "secondUnsuspender" },
          ],
          deck: ["BT1-013", "BT1-014"],
          security: inertSecurity,
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("noSource").topCard.instanceId);
    await s.ready();
    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 12;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("noSource").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("noSource").isSuspended);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("firstUnsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("noSource").isSuspended);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("stacked").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("stacked").isSuspended);
    preferred[0] = s.perm("stacked").topCard.instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("secondUnsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("stacked").isSuspended);
    expect(s.perm("noSource").topCard.cardId).toBe("EX2-014");
    expect(s.perm("noSource").stack).toHaveLength(0);
    // The source-free first event consumes the once-per-turn trigger; the second
    // unsuspend is therefore a true no-op and its two-card source stack is unchanged.
    expect(s.perm("stacked").stack).toHaveLength(2);
    expect(s.perm("stacked").topCard.cardId).toBe("EX2-037");
    expect(s.perm("stacked").stack.map((card) => card.cardId)).toEqual(["EX2-032", "EX2-031"]);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("retains Reboot after a legal black level-5 evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-034", as: "base" }],
        hand: [{ card: "EX2-037", as: "evolution" }],
        deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        security: inertSecurity,
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX2-037");
    expect(s.state.memory).toBe(6);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX2-034"]);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Reboot")).toBe(true);
  });

  it("rejects evolution from a non-black source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-014", as: "blueSource" }],
        hand: [{ card: "EX2-037", as: "evolution" }],
        deck: ["BT1-011", "BT1-012"],
        security: inertSecurity,
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueSource").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("blueSource").topCard.cardId).toBe("EX2-014");
    expect(s.state.memory).toBe(10);
  });
});
