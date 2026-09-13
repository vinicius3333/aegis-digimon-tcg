import { describe, expect, it } from "vitest";
import { Zone, appFusionCostFor, getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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

  it("links legal cards from hand and its stack, shares the once-per-turn window, and resets next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-020", as: "base", under: [{ card: "BT21-041", as: "stackLink" }] }],
          hand: [
            { card: "AD1-005", as: "gaiamon-hand" },
            { card: "BT21-047", as: "handLink" },
            { card: "BT21-005", as: "invalidNoLink" },
          ],
          deck: [
            { card: "BT1-009", as: "evolutionDraw" },
            { card: "BT1-009", as: "laterDraw" },
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
          ],
          security: [
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
          ],
        },
        1: {
          battleArea: [{ card: "BT1-010", dp: 12000, as: "firstTarget" }],
          hand: ["BT1-010"],
          security: [
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
          ],
          deck: [
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 10;
    const basePermanentId = s.perm("base").permanentId;
    const stackLinkId = s.inst("stackLink").instanceId;
    const handLinkId = s.inst("handLink").instanceId;
    const invalidNoLinkId = s.inst("invalidNoLink").instanceId;
    const firstTargetId = s.perm("firstTarget").permanentId;

    // Enter Main through the production turn loop, then use the normal digivolve intent.
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const firstTurn = s.state.turnCount;
    const deckBeforeEvolution = s.state.players[0]!.deck.length;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: basePermanentId,
        instanceId: s.inst("gaiamon-hand").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "AD1-005" && s.state.players[1]!.battleArea.length === 0);
    await settle();

    const gaiamon = s.perm("base");
    expect(s.state.memory).toBe(6);
    expect(gaiamon.stack.map((card) => card.cardId)).toEqual(["BT1-020"]);
    expect(gaiamon.linked.map((card) => card.instanceId)).toEqual(expect.arrayContaining([stackLinkId, handLinkId]));
    expect(gaiamon.linked).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evolutionDraw").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(deckBeforeEvolution - 1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === invalidNoLinkId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === firstTargetId)).toBe(false);

    const lateLink = s.give(0, Zone.Hand, { card: "BT21-043", as: "lateLink" });
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: gaiamon.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.turnCount).toBe(firstTurn);
    expect(gaiamon.linked).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === lateLink.instanceId)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: gaiamon.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.turnCount).toBe(firstTurn + 2);
    expect(gaiamon.linked.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([handLinkId, lateLink.instanceId]),
    );
    expect(gaiamon.linked).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === lateLink.instanceId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === stackLinkId)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
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
