import { describe, expect, it } from "vitest";
import { Zone, EffectTiming, appFusionCostFor, getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../../cards/index.js";

describe("AD1-005 Gaiamon", () => {
  it("publishes the exact zero-cost Globemon and Charismon App Fusion requirement", () => {
    const compiled = registeredCompiledCards.get("AD1-005") ?? getCompiledCard("AD1-005");
    expect(compiled?.appFusionRequirement).toEqual([{ names: ["Globemon", "Charismon"], cost: 0 }]);
    expect(appFusionCostFor("AD1-005", { topName: "Globemon", linkedNames: ["Charismon"] })).toBe(0);
    expect(appFusionCostFor("AD1-005", { topName: "Globemon", linkedNames: ["Globemon"] })).toBeUndefined();
  });

  it("deletes an opposing Digimon within its DP ceiling when played", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "AD1-005", as: "gaiamon" },
            { card: "BT21-005", as: "swipemon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 12000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaiamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("links legal cards from hand and its stack, rejects a no-Link card, and shares once-per-turn use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-005", dp: 12000, as: "gaiamon", under: [{ card: "BT21-041", as: "stackLink" }] }],
          hand: [
            { card: "BT21-047", as: "handLink" },
            { card: "BT21-005", as: "invalidNoLink" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-010", dp: 12000, as: "firstTarget" }],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    const gaiamon = s.perm("gaiamon");

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: gaiamon.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => gaiamon.linked.length === 2 && s.state.players[1]!.battleArea.length === 0);
    await settle();

    expect(gaiamon.linked.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("stackLink").instanceId, s.inst("handLink").instanceId]),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("invalidNoLink").instanceId)).toBe(true);

    const lateLink = s.give(0, Zone.Hand, { card: "P-190", as: "lateLink" });
    await advance(s.engine).fire(EffectTiming.OnUseAttack, gaiamon);

    expect(gaiamon.linked).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === lateLink.instanceId)).toBe(true);
  });

  it("can Blast Digivolve from hand for zero memory when its red level-5 route is legal", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          battleArea: [{ card: "BT1-021", as: "base" }],
          hand: [{ card: "AD1-005", as: "gaiamon" }],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"), 5000);
    const counter = s.events.find((event) => event.kind === "counterWindowOpened");
    if (counter?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = counter.eligibleCounters.find((entry) => entry.instanceId === s.inst("gaiamon").instanceId);
    expect(eligible).toBeDefined();

    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "AD1-005", 5000);
    expect(s.perm("base").topCard?.cardId).toBe("AD1-005");
    expect(s.state.memory).toBe(0);
  });

  it("rejects play when memory is below the printed cost", () => {
    const s = setupEngine({ 0: { hand: [{ card: "AD1-005", as: "gaiamon" }] } });
    s.state.memory = -10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaiamon").instanceId })).toEqual({
      ok: false,
      reason: "insufficient-memory",
    });
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-005");
    const compiled = registeredCompiledCards.get("AD1-005") ?? getCompiledCard("AD1-005");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-005");
    expect(definition?.nameEn).toBe("Gaiamon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));
  });
});
