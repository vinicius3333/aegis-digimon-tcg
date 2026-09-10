import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import "../BT1/BT1-036.js";
import { compiled } from "./BT20-002.js";

describe("BT20-002 Bebydomon", () => {
  it("proves the inherited once-per-turn draw gate checks Dracomon or Examon text", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    const action = effect?.actions[0];

    expect(effect).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
    expect(action).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 1,
      condition: {
        kind: "selfTopHasText",
        filter: { nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }] },
      },
    });
  });

  it("tracks the source through public evolution into a full-text Dracomon variant and an Examon-text host", async () => {
    const dracomonVariant = getCardDefinition("BT21-046")!;
    expect(dracomonVariant.nameEn).toContain("Dracomon");
    expect(dracomonVariant.nameEn).not.toBe("Dracomon");
    const matching = setupEngine(
      {
        0: {
          breeding: { card: "BT20-002", as: "bebydomon" },
          hand: [
            { card: "BT21-046", as: "dracomon" },
            { card: "BT20-023", as: "coredramon" },
            { card: "BT20-025", as: "wingdramon" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT20-007", "BT20-008", "BT20-009", "BT20-010", "BT20-011"],
        },
        1: { security: ["BT1-090", "BT1-090", "BT1-090"] },
      },
      { autoSelectCards: true },
    );
    matching.state.memory = 10;
    await matching.ready();
    expect(
      matching.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: matching.perm("bebydomon").permanentId,
        instanceId: matching.inst("dracomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => matching.perm("bebydomon").topCard.cardId === "BT21-046");
    expect(matching.perm("bebydomon").stack.map((card) => card.cardId)).toEqual(["BT20-002"]);
    expect(
      matching.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: matching.perm("bebydomon").permanentId,
        instanceId: matching.inst("coredramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => matching.perm("bebydomon").topCard.cardId === "BT20-023");
    expect(matching.perm("bebydomon").stack.map((card) => card.cardId)).toEqual(["BT20-002", "BT21-046"]);
    const wingdramonDefinition = getCardDefinition("BT20-025")!;
    expect(wingdramonDefinition.effectText).toContain("[Examon]");
    expect(wingdramonDefinition.effectText).not.toContain("[Dracomon]");
    expect(
      matching.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: matching.perm("bebydomon").permanentId,
        instanceId: matching.inst("wingdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => matching.perm("bebydomon").topCard.cardId === "BT20-025");
    expect(matching.perm("bebydomon").stack.map((card) => card.cardId)).toEqual(["BT20-002", "BT21-046", "BT20-023"]);

    const legalStackTurn = matching.engine.runOneTurn();
    await settle(() => matching.state.phase === Phase.Breeding);
    expect(
      matching.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: matching.perm("bebydomon").permanentId }),
    ).toEqual({ ok: true });
    await advance(matching.engine).waitForMainPhase(0);
    const matchingHandBefore = matching.state.players[0]!.hand.length;
    expect(
      matching.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: matching.perm("bebydomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => matching.state.players[0]!.hand.length === matchingHandBefore + 1);
    expect(matching.state.players[0]!.hand).toHaveLength(matchingHandBefore + 1);
    await settle(() => matching.events.some((event) => event.kind === "securityChecked"));
    advance(matching.engine).endMainPhaseIfOpen(0);
    await legalStackTurn;

    const nonMatching = setupEngine(
      {
        0: {
          breeding: { card: "BT20-002", as: "bebydomon" },
          hand: [{ card: "BT11-023", as: "veemon" }],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: { security: ["BT1-090"] },
      },
      { autoSelectCards: true },
    );
    nonMatching.state.memory = 4;
    await nonMatching.ready();
    expect(
      nonMatching.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: nonMatching.perm("bebydomon").permanentId,
        instanceId: nonMatching.inst("veemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => nonMatching.perm("bebydomon").topCard.cardId === "BT11-023");
    expect(nonMatching.perm("bebydomon").stack.map((card) => card.cardId)).toEqual(["BT20-002"]);
    const noTextTurn = nonMatching.engine.runOneTurn();
    await settle(() => nonMatching.state.phase === Phase.Breeding);
    expect(
      nonMatching.engine.applyIntent(0, {
        type: "moveFromBreeding",
        permanentId: nonMatching.perm("bebydomon").permanentId,
      }),
    ).toEqual({ ok: true });
    await advance(nonMatching.engine).waitForMainPhase(0);
    const nonMatchingHandBefore = nonMatching.state.players[0]!.hand.length;
    expect(
      nonMatching.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: nonMatching.perm("bebydomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => nonMatching.events.some((event) => event.kind === "securityChecked"));
    expect(nonMatching.state.players[0]!.hand).toHaveLength(nonMatchingHandBefore);
    advance(nonMatching.engine).endMainPhaseIfOpen(0);
    await noTextTurn;
  });

  it("draws once when its Dracomon host attacks and not for an unrelated host", async () => {
    const preferInstanceIds: string[] = [];
    const matching = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-007", as: "dracomon", under: ["BT20-002"] }],
          hand: [{ card: "BT1-036", as: "garurumon" }],
          deck: ["BT1-015", "BT1-010", "BT1-010", "BT1-010", "BT20-007", "BT20-008", "BT20-009", "BT20-010"],
        },
        1: {
          deck: ["BT1-015", "BT1-010", "BT1-010", "BT1-010", "BT20-007"],
          security: ["BT1-090", "BT1-090", "BT1-090", "BT1-090", "BT1-090"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds },
    );
    preferInstanceIds.push(matching.perm("dracomon").topCard.instanceId);
    const matchingHandBefore = matching.state.players[0]!.hand.length;

    expect(
      matching.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: matching.perm("dracomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => matching.state.players[0]!.hand.length === matchingHandBefore + 1);
    expect(matching.state.players[0]!.hand.length).toBe(matchingHandBefore + 1);
    await settle(
      () => matching.state.pendingDecision === undefined && matching.state.players[1]!.security.length === 4,
    );
    expect(matching.state.players[1]!.security.length).toBe(4);

    // A public On Play unsuspend effect makes a second same-turn attack possible; the
    // once-per-turn identity still refuses the inherited draw.
    matching.state.memory = 10;
    expect(
      matching.engine.applyIntent(0, { type: "playCard", instanceId: matching.inst("garurumon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => matching.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT1-036"));
    expect(matching.perm("dracomon").isSuspended).toBe(false);
    const secondAttackHandBefore = matching.state.players[0]!.hand.length;
    expect(
      matching.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: matching.perm("dracomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => matching.perm("dracomon").isSuspended === true);
    expect(matching.state.players[0]!.hand.length).toBe(secondAttackHandBefore);
    await settle(
      () => matching.state.pendingDecision === undefined && matching.state.players[1]!.security.length === 3,
    );
    expect(matching.state.players[1]!.security.length).toBe(3);

    // Pass through the opponent turn and start the next own turn through the production
    // lifecycle; the inherited source may draw again once its turn identity resets.
    // Normalize the gauge before handing over: Garurumon's paid play leaves memory on the
    // current side, which would make the opponent's Main phase immediately auto-end.
    matching.state.memory = 0;
    matching.state.turnSeat = 1;
    const opponentTurn = matching.engine.runOneTurn();
    await advance(matching.engine).waitForMainPhase(1);
    advance(matching.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    matching.state.turnSeat = 0;
    // runOneTurn does not call passTurn: reproduce its change of gauge frame.
    matching.state.memory = -matching.state.memory;
    const nextTurn = matching.engine.runOneTurn();
    await advance(matching.engine).waitForMainPhase(0);
    const nextAttackHandBefore = matching.state.players[0]!.hand.length;
    expect(
      matching.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: matching.perm("dracomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => matching.state.players[0]!.hand.length === nextAttackHandBefore + 1);
    expect(matching.state.players[0]!.hand.length).toBe(nextAttackHandBefore + 1);
    advance(matching.engine).endMainPhaseIfOpen(0);
    await nextTurn;

    const nonMatching = setupEngine({
      0: {
        battleArea: [{ card: "BT11-023", as: "veemon", under: ["BT20-002"] }],
        deck: ["BT1-015"],
      },
      1: { security: ["BT1-090"] },
    });
    const nonMatchingHandBefore = nonMatching.state.players[0]!.hand.length;
    expect(
      nonMatching.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: nonMatching.perm("veemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 20);
    expect(nonMatching.state.players[0]!.hand).toHaveLength(nonMatchingHandBefore);
  });
});
