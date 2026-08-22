import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-016.js";
import "./BT11-016.js";

const RED_AVIAN_5000 = "BT1-013";
const RED_AVIAN_7000 = "BT1-022";

describe("BT11-016 Phoenixmon", () => {
  it("registers complete IR for deletion play and once-per-turn security reactivation", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "YourTurn", frequency: "OncePerTurn" }),
      expect.objectContaining({ trigger: "OnDeletion" }),
    ]));
  });

  it("plays the 5000-DP red Avian boundary with one red Tamer and pays no cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-020", as: "tamer" }, { card: "BT11-016", dp: 0, as: "phoenixmon" }],
        hand: [{ card: RED_AVIAN_5000, as: "candidate" }, { card: "BT6-036", as: "filler" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("filler").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === RED_AVIAN_5000));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === RED_AVIAN_5000)).toBe(true);
    expect(s.state.players[0]!.hand.some((c) => c.cardId === RED_AVIAN_5000)).toBe(false);
    expect(s.events.some((e) => e.kind === "actionRejected" && "reason" in e && /Unsupported effect/.test(e.reason))).toBe(false);
  });

  it("does not offer a 7000-DP candidate when one red Tamer gives a 5000-DP cap", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-020", as: "tamer" }, { card: "BT11-016", dp: 0, as: "phoenixmon" }],
        hand: [{ card: RED_AVIAN_7000, as: "candidate" }, { card: "BT6-036", as: "filler" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("filler").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT11-016"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === RED_AVIAN_7000)).toBe(false);
  });
});
