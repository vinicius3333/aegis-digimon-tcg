import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST9-05.js";
import "./ST9-08.js";

describe("ST9-08 Wormmon", () => {
  it("offers inherited end-of-turn DNA digivolution", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST9-09", as: "green", under: ["ST9-08"] }, { card: "ST9-04", as: "blue" }], hand: [{ card: "ST9-05", as: "dna" }] } }, { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true });
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("green"));
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("dna").instanceId)).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    const result = s.state.players[0]!.battleArea[0]!;
    expect(result.topCard.cardId).toBe("ST9-05");
    expect(result.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["ST9-09", "ST9-08", "ST9-04"]));
    expect(result.isSuspended).toBe(false);
  });

  it("does not use a normal level 5 evolution as the DNA result", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST9-07", as: "green", under: ["ST9-08"] },
          { card: "ST9-04", as: "blue" },
        ],
        hand: [{ card: "ST9-12", as: "normalLevel5" }],
      },
    }, { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true });
    s.state.memory = 5;

    await advance(s.engine).fireForInstance(
      EffectTiming.OnEndTurn,
      s.perm("green").stack.find((card) => card.cardId === "ST9-08")!,
    );

    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) =>
      card.instanceId === s.inst("normalLevel5").instanceId,
    )).toBe(true);
  });
});
