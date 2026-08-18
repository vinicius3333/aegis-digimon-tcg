import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST10-02.js";
import "./ST10-06.js";

describe("ST10-02 Salamon", () => {
  it("may DNA digivolve its host and another Digimon at end of turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST10-05", as: "yellow", under: ["ST10-02"] }, { card: "ST10-12", as: "purple" }], hand: [{ card: "ST10-06", as: "mastemon" }] } }, { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, s.perm("yellow").stack.find((c) => c.cardId === "ST10-02")!);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("mastemon").instanceId)).toBe(true);
  });

  it("does not use a normal level 6 evolution as the DNA result", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "ST10-05", as: "yellow", under: ["ST10-02"] }, { card: "ST10-12", as: "purple" }],
      hand: [{ card: "ST10-13", as: "normalEvolution" }],
    } }, { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true });
    const materialIds = [s.perm("yellow").permanentId, s.perm("purple").permanentId];

    await advance(s.engine).fireForInstance(
      EffectTiming.OnEndTurn,
      s.perm("yellow").stack.find((card) => card.cardId === "ST10-02")!,
    );

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("normalEvolution").instanceId)).toBe(true);
    expect(materialIds.every((id) => s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === id))).toBe(true);
  });
});
