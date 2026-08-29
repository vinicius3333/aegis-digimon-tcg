import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled as BT25_021 } from "./BT25-021.js";
import "../index.js";

describe("BT25-021 Gaomon", () => {
  it("reveals three and adds the two printed search pools", () => {
    const effect = BT25_021.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(effect?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    const revealAdd = effect?.actions?.[0] as { add?: unknown } | undefined;
    expect(revealAdd?.add).toEqual([
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: {
          controllerDefault: "mine",
          nameOrTrait: [
            { tokens: ["Thomas H. Norstein"], match: "trait" },
            { tokens: ["DATA SQUAD"], match: "trait" },
          ],
        },
      }),
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Gaogamon"], match: "name" }] },
      }),
    ]);
  });

  it("resolves both search pools through a natural On Play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-021", as: "gaomon" }],
          deck: [
            { card: "BT25-087", as: "thomas" },
            { card: "BT11-025", as: "gaogamon" },
            { card: "BT1-001", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("thomas").instanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("gaogamon").instanceId),
    );

    expect(s.state.players[0]!.hand).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ instanceId: s.inst("thomas").instanceId }),
        expect.objectContaining({ instanceId: s.inst("gaogamon").instanceId }),
      ]),
    );
    expect(s.state.players[0]!.deck).toEqual([
      expect.objectContaining({ instanceId: s.inst("rest").instanceId }),
    ]);
  });

  it("draws one for both players once per turn when attacking", () => {
    const effect = BT25_021.effects?.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
    expect(effect?.actions).toEqual([
      { kind: "Draw", amount: 1, controller: "mine" },
      { kind: "Draw", amount: 1, controller: "opponent" },
    ]);
  });
});
