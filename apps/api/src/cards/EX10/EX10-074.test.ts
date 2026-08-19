import { describe, expect, it } from "vitest";
import "./EX10-074.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("EX10-074 Beelzemon", () => {
  it("allows the Impmon alternate digivolution only with 20 or more cards in trash", async () => {
    const below = setupEngine({
      0: {
        battleArea: [{ card: "EX2-039", as: "impmon" }],
        hand: [{ card: "EX10-074", as: "beelzemon" }],
        trash: Array(19).fill("BT1-001"),
      },
    });
    below.state.memory = 10;
    expect(
      below.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: below.perm("impmon").permanentId,
        instanceId: below.inst("beelzemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });

    const enough = setupEngine({
      0: {
        battleArea: [{ card: "EX2-039", as: "impmon" }],
        hand: [{ card: "EX10-074", as: "beelzemon" }],
        trash: Array(20).fill("BT1-001"),
        deck: ["BT1-009"],
      },
    });
    enough.state.memory = 10;
    expect(
      enough.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: enough.perm("impmon").permanentId,
        instanceId: enough.inst("beelzemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => enough.perm("impmon").topCard.cardId === "EX10-074");
    expect(enough.perm("impmon").stack.map(({ cardId }) => cardId)).toContain("EX2-039");
  });

  it("counts the two newly milled cards before scaling the deletion ceiling", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-074", as: "beelzemon" }],
          trash: Array(18).fill("BT1-001"),
          deck: ["BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "AD1-004", as: "cost12" }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const targetId = s.perm("cost12").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("beelzemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === targetId));

    expect(s.state.players[0]!.trash).toHaveLength(20);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("Q5190: returns exactly 2 non-Digi-Egg cards to the deck top to De-Digivolve 2", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-074", as: "beelzemon" }],
          trash: ["BT1-009", "BT1-010", ...Array(8).fill("BT1-001")],
          deck: ["BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "AD1-004", as: "target", under: ["BT1-009", "BT1-010", "BT1-011"] }],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("beelzemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").topCard.cardId === "BT1-010");

    expect(s.perm("target").stack).toHaveLength(2);
    expect(s.state.players[0]!.trash.filter(({ cardId }) => cardId !== "BT1-001")).toHaveLength(2);
  });
});
