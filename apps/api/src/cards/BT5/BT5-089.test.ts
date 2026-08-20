import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-089.js";
import "./BT5-058.js";

describe("BT5-089 Izzy Izumi & Mimi Tachikawa", () => {
  it("gains 2 memory at the start of your turn when the opponent has a suspended Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-089", as: "tamer" }] },
      1: { battleArea: [{ card: "BT1-010", suspended: true }] },
    });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tamer"));

    expect(s.state.memory).toBe(2);
  });

  it("suspends to digivolve an attacking green level 5 into a revealed green level 6", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-089", as: "tamer" },
            { card: "BT5-052", as: "attacker" },
          ],
          deck: [{ card: "BT5-055", as: "level6" }, "BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard.instanceId === s.inst("level6").instanceId);

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("attacker").topCard.instanceId).toBe(s.inst("level6").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(1); // CR 7-1-4-1 digivolution bonus draw
  });

  it("reveals all three card identities while choosing the attack-time level 6", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-089", as: "tamer" },
            { card: "BT5-052", as: "attacker" },
          ],
          deck: [
            { card: "BT5-055", as: "levelSix" },
            { card: "BT1-010", as: "otherOne" },
            { card: "BT1-011", as: "otherTwo" },
          ],
        },
        1: { security: ["BT1-012"] },
      },
      { autoAcceptOptional: true, autoOrderCards: false },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const decision = s.decisions.at(-1)!.req;
    expect(decision.sourceCardId).toBe("BT5-089");
    expect(decision.options?.candidateInstanceIds).toEqual([s.inst("levelSix").instanceId]);
    expect(decision.options?.visibleCards).toEqual([
      { instanceId: s.inst("levelSix").instanceId, cardId: "BT5-055" },
      { instanceId: s.inst("otherOne").instanceId, cardId: "BT1-010" },
      { instanceId: s.inst("otherTwo").instanceId, cardId: "BT1-011" },
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: {
          kind: "selectCards",
          instanceIds: [s.inst("levelSix").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    const ordering = s.decisions.at(-1)!.req;
    const bottomOrder = [s.inst("otherTwo").instanceId, s.inst("otherOne").instanceId];
    expect(ordering.options?.visibleCards).toEqual([
      { instanceId: s.inst("otherOne").instanceId, cardId: "BT1-010" },
      { instanceId: s.inst("otherTwo").instanceId, cardId: "BT1-011" },
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderCards", order: bottomOrder },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.perm("attacker").topCard.instanceId === s.inst("levelSix").instanceId &&
        s.state.players[0]!.deck.length === 1,
    );

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(bottomOrder.slice(0, 1));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(bottomOrder[1]);
  });

  it("Q1363 orders the remaining cards before the level 6 When Digivolving effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-089", as: "tamer" },
            { card: "BT5-052", as: "attacker" },
          ],
          deck: [
            { card: "BT5-058", as: "argomon" },
            { card: "BT1-010", as: "otherOne" },
            { card: "BT1-011", as: "otherTwo" },
          ],
        },
        1: {
          battleArea: [{ card: "BT4-097", as: "opponentTamer" }],
          security: ["BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoOrderCards: false, autoSelectCards: false },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const selection = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("argomon").instanceId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    expect(s.perm("opponentTamer").isSuspended).toBe(false);
    const ordering = s.state.pendingDecision!;
    const order = [s.inst("otherTwo").instanceId, s.inst("otherOne").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderCards", order },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.perm("opponentTamer").isSuspended);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(order);
    expect(s.perm("attacker").topCard.cardId).toBe("BT5-058");
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT5-089", as: "security", faceUp: true }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("security").instanceId)).toBe(
      true,
    );
  });
});
