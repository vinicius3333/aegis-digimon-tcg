import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-052.js";
import "../index.js";

describe("BT26-052 Pristimon", () => {
  it("contains both independent reveal slots and inherited Reboot", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ count: 1 }, { count: 1 }] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "None", isInherited: true, actions: [{ kind: "GainKeyword", keyword: { keyword: "Reboot" } }] });
  });

  it("adds one Glowing Dawn card and one black BEATBREAK card, bottoming the rest", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT26-052", as: "pristimon" }], deck: [{ card: "BT25-035", as: "dawn" }, { card: "BT26-093", as: "beatbreak" }, { card: "BT1-009", as: "rest" }] } }, { autoSelectCards: true, autoOrderCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pristimon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 1);
    expect(s.state.players[0]!.hand.map((c) => c.cardId).sort()).toEqual(["BT25-035", "BT26-093"]);
    expect(s.state.players[0]!.deck.map((c) => c.cardId)).toEqual(["BT1-009"]);
  });
});
