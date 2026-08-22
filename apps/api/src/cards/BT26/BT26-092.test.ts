import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-092.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
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
  it("trashes a TS card to draw and then gains memory at main-phase start", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-092", as: "shota" }],
        hand: [{ card: "BT26-008", as: "tsCost" }],
        deck: ["BT1-001", "BT1-002"],
      },
    }, { autoSelectCards: true });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("shota"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT26-008")).toBe(true);
  });
});
