import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-005.js";

describe("BT18-005 Kozenimon", () => {
  it("draws once when its host wins a battle and does not repeat in the turn", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenDeletesInBattle", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] }] });

    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-030", as: "host", under: ["BT18-005"] }], deck: [{ card: "BT1-001", as: "drawn" }, { card: "BT1-002" }] } });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: s.perm("host").permanentId });
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
    const handSize = s.state.players[0]!.hand.length;
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: s.perm("host").permanentId });
    expect(s.state.players[0]!.hand.length).toBe(handSize);
  });
});
