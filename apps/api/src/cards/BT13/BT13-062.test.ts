import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-062.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-062 Chuumon", () => {
  it("charges the hand trash cost and plays inherited Chuumon suspended", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [expect.objectContaining({ kind: "Return", cost: expect.objectContaining({ kind: "trash" }), abortOnDecline: true })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "OnDeletion", isInherited: true, actions: [expect.objectContaining({ kind: "PlayWithoutCost", from: ["trash"], suspended: true, optional: true })] });
  });

  it("trashes a Sukamon from hand and returns one from trash when played", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT13-062", as: "chuu" }, "BT11-040"], trash: ["BT11-040"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chuu").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-062"), 3000);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-062")).toBe(true);
  });
});
