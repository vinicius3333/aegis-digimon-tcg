import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX9-005.js";

describe("EX9-005", () => {
  it("once per breeding turn may play a Negamon-text Digimon from hand with cost reductions and place it underneath itself", () => {
    const actions = compiled.effects?.find((entry) => entry.isBreeding && entry.trigger === "Main")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: true, optional: true });
    expect(actions[1]).toMatchObject({ kind: "Replacement", mode: "reduceCost", amount: 2 });
    expect(actions[3]).toMatchObject({ kind: "PlaceUnder" });
  });
  it("restricts itself from digivolving, being deleted, and being trashed, and redirects opponent attacks", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions).toHaveLength(3);
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenOpponentAttacks" });
  });

  it("plays a Negamon-text Digimon from hand and places Negamon underneath it", async () => {
    const s = setupEngine({ 0: { breeding: { card: "EX9-005", as: "negamon" }, hand: [{ card: "EX9-046", as: "played" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 1;
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("negamon"));
    await settle(() => s.state.players[0]!.battleArea[0]?.stack.some((card) => card.cardId === "EX9-005"), 100);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("EX9-046");
    expect(s.state.players[0]!.battleArea[0]!.stack.map((card) => card.cardId)).toContain("EX9-005");
  });
});
