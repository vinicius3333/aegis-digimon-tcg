import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT8-015.js";
import "./BT8-020.js";

describe("BT8-020 Patamon", () => {
  it("may DNA digivolve its host and another Digimon at the end of your turn", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT8-010", as: "red", under: ["BT8-020"] }, { card: "BT8-036", as: "yellow" }],
      hand: [{ card: "BT8-015", as: "silphymon" }],
    } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, s.perm("red").stack.find((card) => card.cardId === "BT8-020")!);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("silphymon").instanceId)).toBe(true);
  });

  it("does not consume the two materials for a normal level 5 evolution", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT8-010", as: "red", under: ["BT8-020"] }, { card: "BT8-036", as: "yellow" }],
      hand: [{ card: "BT8-016", as: "normalEvolution" }],
    } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    const materialIds = [s.perm("red").permanentId, s.perm("yellow").permanentId];

    await advance(s.engine).fireForInstance(
      EffectTiming.OnEndTurn,
      s.perm("red").stack.find((card) => card.cardId === "BT8-020")!,
    );

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("normalEvolution").instanceId)).toBe(true);
    expect(materialIds.every((id) => s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === id))).toBe(true);
  });
});
