import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-024.js";

describe("P-024 Tai's Growing Up!", () => {
  it("bottoms exact Agumon, trashes that stack, and draws 3 with exact Tai Kamiya", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-009", as: "agumon", under: ["BT1-001", "P-002"] }, "BT1-085"],
          hand: [{ card: "P-024", as: "option" }],
          deck: [
            { card: "BT1-003", as: "draw1" },
            { card: "BT1-004", as: "draw2" },
            { card: "BT1-005", as: "draw3" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const agumonId = s.perm("agumon").topCard.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 3);

    expect(s.state.players[0]!.deck.some((card) => card.instanceId === agumonId)).toBe(true);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId !== "P-024")).toHaveLength(2);
  });

  it("rejects Tai (V-Tamer) and Agumon Expert as exact-name substitutes", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-011", as: "expert", under: ["BT1-001"] }, "P-012"],
          hand: [{ card: "P-024", as: "option" }],
          deck: ["BT1-003", "BT1-004", "BT1-005"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const expertId = s.perm("expert").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === expertId)).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not draw when exact Tai is present but no exact Agumon can be bottom-decked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT1-085"],
          hand: [{ card: "P-024", as: "option" }],
          deck: ["BT1-003", "BT1-004", "BT1-005"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("allows declining the single optional effect without moving Agumon or drawing", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "P-009", as: "agumon", under: ["BT1-001"] }, "BT1-085"],
        hand: [{ card: "P-024", as: "option" }],
        deck: ["BT1-003", "BT1-004", "BT1-005"],
      },
    });
    const agumonPermanentId = s.perm("agumon").permanentId;
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const request = s.decisions.at(-1)!.req;
    expect(request.sourceCardId).toBe("P-024");
    expect(request.options?.timing).toBe("OnUseOption");
    expect(request.options?.effectText).toContain("[Main] If you have [Tai Kamiya]");

    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: request.decisionId,
      response: { kind: "optional", accept: false },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === agumonPermanentId)).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    assertNoLoudGap(s);
  });
});

describe("P-024 [Security]", () => {
  it("adds itself to its owner's hand after a real security check", async () => {
    const s = setupEngine({
      0: { security: [{ card: "P-024", as: "option" }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }] },
    });
    const optionId = s.inst("option").instanceId;
    s.state.turnSeat = 1;

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === optionId), 5000);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
    assertNoLoudGap(s);
  });
});
