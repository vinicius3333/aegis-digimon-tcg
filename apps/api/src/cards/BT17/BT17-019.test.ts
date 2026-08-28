import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-019.js";

describe("BT17-019", () => {
  it("draws if you have a Matt Ishida Tamer", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "Draw", amount: 1, condition: { kind: "youHave" } }],
    });
  });

  it("can DNA digivolve using itself and another Digimon at end of turn as inherited", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "EndOfYourTurn",
      isInherited: true,
      actions: [
        {
          kind: "DnaDigivolve",
          payCost: true,
          optional: true,
          materials: [{ count: 1 }, { count: 1, zone: "battleArea" }],
        },
      ],
    });
  });

  it("draws at the start of the main phase when Matt is present", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-019", as: "gabumon" },
          { card: "BT1-086", as: "matt" },
        ],
        deck: ["BT1-009"],
      },
    });
    const before = s.state.players[0]!.hand.length;
    await advance(s.engine).runTurn(0);
    expect(s.state.players[0]!.hand).toHaveLength(before + 1);
  });

  it("naturally DNA digivolves at end of turn using itself and another Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-022", as: "host", under: ["BT17-019"] },
            { card: "BT1-069", as: "partner" },
          ],
          hand: [{ card: "BT12-028", as: "paildramon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-028"));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT17-019", "BT1-069"]),
    );
  });
});
