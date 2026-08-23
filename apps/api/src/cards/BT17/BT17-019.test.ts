import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
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
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("gabumon"));
    expect(s.state.players[0]!.hand).toHaveLength(before + 1);
  });
});
