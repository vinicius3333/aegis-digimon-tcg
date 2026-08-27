import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-029.js";
import "../index.js";

describe("BT16-029", () => {
  it("reveals three and adds Light Fang, Night Claw, or multicolor cards", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" }],
    });
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "hand", orFilters: [{ multicolor: true }] },
      ],
    });
  });

  it("reduces opposing Digimon DP by 3000 as inherited", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifySecurityDP", controller: "opponent", amount: -3000, duration: "forTheTurn" }],
    });
  });

  it("adds one Light Fang and one Night Claw or multicolor card from the top three", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-029", as: "agumon" }],
          deck: ["BT16-029", "BT16-020", "BT16-017", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.cardId === "BT16-020") &&
        s.state.players[0]!.hand.some((card) => card.cardId === "BT16-029"),
    );

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT16-029")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT16-020")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("reduces opponent Security Digimon DP without changing battle-area DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-030", as: "host", under: ["BT16-029"] }] } });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).securityDp(1)).toBe(-3000);
    expect(s.perm("host").currentDP).toBe(1000);
  });
});
