import "../P/P-106.js";
import { observe } from "../../engine/testkit/observe.js";
import { describe, it, expect } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT20-078.js";
import "./BT20-073.js";
import "./BT20-069.js";
import "./index.js";

// A3 for BT20-078 (Reapermon — Purple Lv.6 Digimon).
//
// [Static] ＜Collision＞
// [Static] ＜Blocker＞
// [On Deletion] Delete 1 of your opponent's Digimon or Tamers with a play cost of 4 or less.
//
// FAILS-WHEN-REVERTED: on Reapermon's deletion, a <=4-cost opponent permanent is deleted.

const REAPERMON = "BT20-078";
// BT1-010 Agumon — cost 3, Digimon (qualifies for "cost 4 or less" deletion target).
const AGUMON = "BT1-010";
// BT1-021 MetalGreymon — cost 6 Digimon (does NOT qualify — too expensive).
const METAL_GREYMON = "BT1-021";

describe("BT20-078 Reapermon — On Deletion deletes cheap opponent permanent", () => {
  it("watches opponent effect-driven digivolutions and de-digivolves once per turn", () => {
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns");
    expect(allTurns).toMatchObject({ frequency: "OncePerTurn" });
    expect(allTurns?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAnyDigivolves",
      sourceFilter: { controllerDefault: "opponent", kind: ["Digimon"], byEffect: true },
      actions: [
        {
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 1,
        },
      ],
    });
  });

  it("de-digivolves an opponent effect evolution once and resets on a later opponent turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: REAPERMON, as: "reapermon" }], hand: [AGUMON], deck: [AGUMON, AGUMON, AGUMON] },
        1: {
          battleArea: [{ card: "BT1-064", as: "base" }],
          hand: [
            { card: "P-106", as: "training1" },
            { card: "P-106", as: "training2" },
            { card: "P-106", as: "training3" },
            { card: "BT20-039", as: "evolution1" },
            { card: "BT1-071", as: "evolution2" },
            { card: "BT1-075", as: "evolution3" },
            AGUMON,
          ],
          deck: Array(20).fill(AGUMON),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.turnCount = 1;
    s.state.memory = 10;
    await s.ready();
    const placementTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    for (const alias of ["training1", "training2", "training3"]) {
      const id = s.inst(alias).instanceId;
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: id })).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === id));
      expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === id)).toBe(true);
    }
    advance(s.engine).endMainPhaseIfOpen(1);
    await placementTurn;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    async function train(alias: string, expectedTop: string, expectedStack: number) {
      const training = s.perm(alias);
      const id = training.topCard.instanceId;
      const entry = observe(s.engine).activatableEffects(training)[0];
      expect(entry).toBeDefined();
      const before = s.events.filter((e) => e.kind === "effectActivated").length;
      expect(
        s.engine.applyIntent(1, { type: "activateEffect", sourceInstanceId: id, effectKey: entry!.effectKey }),
      ).toEqual({ ok: true });
      await settle(() => s.events.filter((e) => e.kind === "effectActivated").length > before);
      expect(s.perm("base").topCard.cardId).toBe(expectedTop);
      expect(s.perm("base").stack).toHaveLength(expectedStack);
      expect(s.state.players[1]!.trash.some((c) => c.instanceId === id)).toBe(true);
    }
    await train("training1", "BT1-064", 0);
    expect(s.perm("reapermon").isSuspended).toBe(true);
    const turnPlayerTrigger = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT20-039",
    );
    const reapermonTrigger = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === REAPERMON,
    );
    expect(turnPlayerTrigger).toBeGreaterThanOrEqual(0);
    expect(reapermonTrigger).toBeGreaterThan(turnPlayerTrigger);

    await train("training2", "BT1-071", 1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await firstTurn;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await train("training3", "BT1-071", 1);
    expect(s.state.players[1]!.trash.some((c) => c.cardId === "BT1-075")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await nextTurn;
  });

  it("grants Collision and Blocker as static keywords", () => {
    expect(
      compiled.effects.filter((effect) => effect.trigger === "Static").map((effect) => effect.keywords?.[0]?.keyword),
    ).toEqual(["Collision", "Blocker"]);
  });

  it("does not react to an opponent's ordinary Main digivolution", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: REAPERMON, as: "reapermon" }] },
        1: { battleArea: [{ card: "BT1-064", as: "base" }], hand: [{ card: "BT1-071", as: "evolution" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-071");
    expect(s.perm("base").topCard.cardId).toBe("BT1-071");
  });

  it("[On Deletion] deletes opponent Digimon with play cost <= 4 when Reapermon is deleted", async () => {
    const s = setupEngine(
      {
        // Seat 0: Reapermon (the card being deleted).
        0: { battleArea: [{ card: REAPERMON, dp: 11000, as: "reapermon" }] },
        1: {
          battleArea: [
            // Agumon (cost 3 — valid deletion target).
            // Suspended on purpose: Reapermon prints ＜Collision＞, which per Comprehensive Rules
            // §16-30-1 grants every opponent Digimon ＜Blocker＞ and forces the opponent to block
            // whenever possible. An unsuspended Agumon would therefore be compelled to block and
            // the attack would never reach MetalGreymon, so Reapermon would never die and this
            // [On Deletion] clause would never be reached.
            { card: AGUMON, dp: 2000, as: "agumon", suspended: true },
            // MetalGreymon (> 11000 DP to kill Reapermon in battle); suspended so it can be attacked.
            { card: METAL_GREYMON, dp: 15000, as: "metalGreymon", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const reapermon = s.perm("reapermon");
    const agumon = s.perm("agumon");
    const metalGreymon = s.perm("metalGreymon");

    // Seat 0 attacks with Reapermon (11000 DP) vs MetalGreymon (15000 DP).
    s.state.memory = 5;
    const res = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: reapermon.permanentId,
      target: { kind: "permanent", permanentId: metalGreymon.permanentId },
    });

    expect(res).toEqual({ ok: true });

    // After battle, Reapermon (11000) loses to MetalGreymon (15000) and is deleted.
    // [On Deletion] should then delete Agumon (cost 3 <= 4).
    await settle(() => !p1.battleArea.some((pp) => pp.permanentId === agumon.permanentId), 600);

    expect(p1.battleArea.some((pp) => pp.permanentId === agumon.permanentId)).toBe(false);
    // Agumon should now be in p1's trash.
    expect(p1.trash.some((c) => c.cardId === AGUMON)).toBe(true);
  });

  it("[On Deletion] does NOT delete opponent Digimon with play cost > 4", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: REAPERMON, dp: 11000, as: "reapermon" }] },
        1: {
          battleArea: [
            // MetalGreymon cost 10 — NOT eligible for deletion.
            { card: METAL_GREYMON, dp: 15000, as: "metalGreymon", suspended: true },
            // The attacking MetalGreymon.
            { card: METAL_GREYMON, dp: 15000, as: "oppAttacker", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const reapermon = s.perm("reapermon");
    const metalGreymon = s.perm("metalGreymon");

    // Fire the card's deletion timing directly so this target-boundary assertion is
    // independent of Collision/blocker combat resolution.
    await advance(s.engine).fire(EffectTiming.OnDeletion, reapermon);

    // MetalGreymon (cost > 4) must not be offered to the Delete action.
    expect(p1.battleArea.some((pp) => pp.permanentId === metalGreymon.permanentId)).toBe(true);
  });

  it("[On Deletion] deletes a cost-3 opponent Tamer while preserving a cost-5 Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: REAPERMON, dp: 11000, as: "reapermon" }] },
        1: {
          battleArea: [
            { card: "BT10-087", as: "cheapTamer" },
            { card: "AD1-020", as: "expensiveTamer" },
            { card: "BT20-076", dp: 15000, as: "attacker", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const cheapTamerId = s.perm("cheapTamer").permanentId;
    const expensiveTamerId = s.perm("expensiveTamer").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("reapermon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("attacker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === REAPERMON));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === cheapTamerId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === expensiveTamerId)).toBe(true);
  });

  it("publicly forces an opponent Digimon to block through Collision, then redirects with its own Blocker", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: REAPERMON, dp: 11000, as: "reapermon" }], security: ["BT1-010"] },
        1: {
          battleArea: [
            { card: "BT1-010", dp: 1000, as: "blocker" },
            { card: "BT20-076", dp: 15000, as: "attacker", suspended: true },
          ],
          security: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const blockerId = s.perm("blocker").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("reapermon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("attacker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declineBlock" }).ok).toBe(false);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === blockerId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("reapermon").permanentId)).toBe(true);
  });

  it("publicly redirects an opponent player attack with Reapermon's Blocker", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: REAPERMON, dp: 11000, as: "reapermon" }], security: ["BT1-010"] },
        1: { battleArea: [{ card: "BT1-010", dp: 2000, as: "attacker" }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("reapermon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("reapermon").permanentId)).toBe(true);
  });
});
