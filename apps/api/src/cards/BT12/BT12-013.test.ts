import { digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-013.js";

describe("BT12-013 BurningGreymon", () => {
  it("digivolves from Agunimon for 1 and gains 2000 DP for the turn", async () => {
    expect(digivolutionRequirementsFor("BT12-013")).toContainEqual({ names: ["Agunimon"], cost: 1, isAlternate: true });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-012", as: "aguni" }],
        hand: [{ card: "BT12-013", as: "burning" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("aguni").permanentId,
        instanceId: s.inst("burning").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("aguni").topCard.cardId === "BT12-013");
    expect(s.state.memory).toBe(9);
    expect(s.perm("aguni").currentDP).toBe(8000);
    expect(s.perm("aguni").stack.map(({ cardId }) => cardId)).toContain("BT12-012");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
  });

  it("digivolves from Takuya for 2 and preserves the Tamer as a source", async () => {
    expect(digivolutionRequirementsFor("BT12-013")).toContainEqual({
      names: ["Takuya Kanbara"],
      cost: 2,
      isAlternate: true,
      baseIsTamer: true,
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-088", as: "takuya" }],
        hand: [{ card: "BT12-013", as: "burning" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("burning").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.cardId === "BT12-013");
    expect(s.state.memory).toBe(8);
    expect(s.perm("takuya").stack.map(({ cardId }) => cardId)).toContain("BT12-088");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
  });

  it("rejects the Tamer evolution route from a non-Takuya Tamer", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-089", as: "takato" }], hand: [{ card: "BT12-013", as: "burning" }] },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takato").permanentId,
        instanceId: s.inst("burning").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it.each([
    ["Hybrid", "BT12-012", 7000],
    ["Ten Warriors", "BT12-015", 10000],
  ])("grants the inherited 2000 DP bonus to a %s host", async (_trait, hostCard, expectedDP) => {
    const s = setupEngine({ 0: { battleArea: [{ card: hostCard, as: "host", under: ["BT12-013"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(expectedDP);
  });

  it("does not grant the inherited bonus to a plain host or during the opponent's turn", async () => {
    const plain = setupEngine({ 0: { battleArea: [{ card: "BT1-010", as: "host", under: ["BT12-013"] }] } });
    await plain.engine.recomputeContinuousEffects();
    expect(plain.perm("host").currentDP).toBe(2000);

    const offTurn = setupEngine({ 0: { battleArea: [{ card: "BT12-014", as: "host", under: ["BT12-013"] }] } });
    offTurn.state.turnSeat = 1;
    await offTurn.engine.recomputeContinuousEffects();
    expect(offTurn.perm("host").currentDP).toBe(7000);
  });
});
