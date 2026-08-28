import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-091.js";

describe("BT11-091 Taiga", () => {
  it("maps catalog facts and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-091")).toMatchObject({ cardId: "BT11-091", colors: ["Green"], kinds: ["Tamer"], playCost: 3 });
    expect(compiled.effects).toMatchObject([
      { trigger: "YourTurn", actions: [{ kind: "ModifyDP", amount: 1000 }] },
      { trigger: "YourTurn", actions: [{ kind: "Replacement", event: "wouldDigivolve" }] },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost" }] },
    ]);
  });

  it("gives all own Digimon +1000 DP and suspends to reduce a green level-5+ evolution by 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-091", as: "taiga" },
            { card: "BT1-075", as: "base", dp: 5000 },
          ],
          hand: [{ card: "BT1-083", as: "target" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.perm("base").currentDP).toBe(6000);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("target").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-083");
    expect(s.state.memory).toBe(7); // printed 4 reduced to 3
    expect(s.perm("taiga").isSuspended).toBe(true);
  });

  it("does not grant DP or an evolution discount outside its printed scope", async () => {
    const opponentTurn = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-091", as: "taiga" },
          { card: "BT1-075", as: "green", dp: 5000 },
        ],
      },
    });
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.ready();
    expect(opponentTurn.perm("green").currentDP).toBe(5000);

    const nonGreen = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-091", as: "taiga" },
            { card: "BT1-015", as: "red-base" },
          ],
          hand: [{ card: "BT1-020", as: "red-level-five" }],
        },
      },
      { autoAcceptOptional: true },
    );
    nonGreen.state.memory = 10;

    expect(
      nonGreen.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: nonGreen.perm("red-base").permanentId,
        instanceId: nonGreen.inst("red-level-five").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => nonGreen.perm("red-base").topCard.cardId === "BT1-020");

    expect(nonGreen.state.memory).toBe(8);
    expect(nonGreen.perm("taiga").isSuspended).toBe(false);
  });
});
