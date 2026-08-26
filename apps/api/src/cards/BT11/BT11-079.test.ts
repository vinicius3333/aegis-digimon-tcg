import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-079.js";

describe("BT11-079 DarkLizardmon", () => {
  it("maps catalog facts, Retaliation, and deletion draw-discard to IR", () => {
    expect(getCardDefinition("BT11-079")).toMatchObject({
      cardId: "BT11-079", colors: ["Purple"], level: 4, playCost: 5, dp: 4000, types: ["Evil Dragon"],
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Retaliation" }] },
      { trigger: "OnDeletion", actions: [{ kind: "Draw", amount: 1 }, { kind: "Trash" }] },
    ]);
  });

  it("has executable Retaliation that deletes the Digimon it loses a battle against", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-079", as: "darklizardmon" }] },
      1: { battleArea: [{ card: "BT1-084", as: "opponent", suspended: true }] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("darklizardmon"), "Retaliation")).toBe(true);
    const darkLizardmonId = s.perm("darklizardmon").permanentId;
    const opponentId = s.perm("opponent").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: darkLizardmonId,
        target: { kind: "permanent", permanentId: opponentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.every(({ permanentId }) => permanentId !== darkLizardmonId) &&
        s.state.players[1]!.battleArea.every(({ permanentId }) => permanentId !== opponentId),
    );

    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT11-079")).toBe(true);
    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT1-084")).toBe(true);
  });

  it("draws 1 and then trashes exactly 1 card on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-079", as: "darklizardmon" }],
          hand: [{ card: "BT1-009", as: "old-hand" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("darklizardmon").permanentId]);
    await settle(() => s.state.players[0]!.trash.length === 2);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT11-079");
  });
});
