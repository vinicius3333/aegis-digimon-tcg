import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-012.js";

describe("BT11-012 Shoutmon X3", () => {
  it("reveals three and adds as many eligible cards as possible up to two (Q2056)", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT11-012", as: "source" }],
        deck: ["BT1-009", "BT10-008", "BT1-010"],
      },
    }, { autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 9;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand[0]?.cardId).toBe("BT10-008");
    const x3 = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "BT11-012")!;
    expect(observe(s.engine).keywordAmount(x3, "MaterialSave")).toBe(2);
  });

  it("may delete itself at start of turn to gain 1 memory (Q2057)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-012", as: "x3" }] } }, { autoAcceptOptional: true });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("x3"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT11-012")).toBe(true);
  });
});
