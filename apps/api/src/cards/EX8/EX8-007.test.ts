import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-007.js";

describe("EX8-007", () => {
  it("reveals 3 for a Tyrannomon, Reptile, Dinosaur, or Ryutaro Williams card", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "hand" },
      ],
      rest: "deckBottom",
    }));
  it("inherits +2000 DP during your turn", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    }));
  it("selects Tyrannomon and Ryutaro Williams from the live reveal", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX8-007", as: "agumon" }],
          deck: [
            { card: "EX8-011", as: "tyrannomon" },
            { card: "EX11-056", as: "ryutaro" },
            { card: "AD1-001", as: "decoy" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.cardId === "EX8-011") &&
        s.state.players[0]!.hand.some((card) => card.cardId === "EX11-056"),
    );
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["EX8-011", "EX11-056"]),
    );
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("AD1-001");
  });

  it("applies its inherited +2000 DP during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX8-007", as: "agumon" }] }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
  });
});
