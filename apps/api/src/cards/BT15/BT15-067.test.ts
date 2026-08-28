import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-067.js";

describe("BT15-067", () => {
  it("has the printed Blocker keyword", () =>
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Blocker" }] }));
  it("returns a suspended opposing Digimon or Tamer when DigiPolice is in the stack", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "Return", to: "deckBottom", condition: { kind: "selfDigivolutionStackHasTrait" } }],
    }));
  it("once per turn may play a Beast Dragon/DigiPolice costing 5000 DP or less when suspended", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }],
        },
      ],
    }));

  it("plays a qualifying Digimon when a natural effect suspends this Ouryumon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-067", as: "ouryumon" }],
          hand: [
            { card: "BT14-043", as: "koDokugumon" },
            { card: "BT15-058", as: "ginryumon" },
          ],
        },
        1: { battleArea: [{ card: "BT14-042", as: "opposingTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("koDokugumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT15-058"));

    expect(s.perm("ouryumon").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT15-058");
  });
});
