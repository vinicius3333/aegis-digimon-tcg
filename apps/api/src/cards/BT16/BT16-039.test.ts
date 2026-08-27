import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-039.js";
import "../index.js";

describe("BT16-039", () => {
  it("reveals four and adds Pulsemon text cards and Abadin Electronics", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 4,
          rest: "deckBottom",
          add: [
            { count: 1, to: "hand" },
            { count: 1, to: "hand" },
          ],
        },
      ],
    });
  });

  it("grants inherited DP while its top card has Pulsemon in its text", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfTopHasText" } }],
    });
  });

  it("adds both available categories from the revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-039", as: "pulsemon" }],
          deck: ["BT16-034", "BT16-039", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pulsemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT16-034"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT16-034")).toBe(true);
    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "BT16-039")).toHaveLength(1);
    // One unrevealed card plus the two misses returned to the bottom.
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("applies the inherited +1000 DP to a live Pulsemon-text Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-034", as: "host", dp: 6000, under: ["BT16-039"] }] } });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(7000);
  });
});
