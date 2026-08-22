import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-092.js";
import "../index.js";
describe("BT26-092 Shota Kuroi", () => {
  it("compiles the start-main TS cost and draw/memory benefit", () => {
    expect(compiled.coverage).toBe("full"); expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "StartOfYourMainPhase", actions: [{ kind: "Draw", cost: { kind: "trash" } }, { kind: "GainMemory", amount: 1 }] });
    expect(compiled.effects[0]?.actions[0]).toMatchObject({ optional: false });
  });
  it("compiles the opponent-attack TS Tamer cost and TS Digimon redirect", () => {
    expect(compiled.effects[1]).toMatchObject({ trigger: "OpponentsTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "RedirectAttack", optional: true, cost: { kind: "return", to: "deckBottom" } }] }] });
  });
});
