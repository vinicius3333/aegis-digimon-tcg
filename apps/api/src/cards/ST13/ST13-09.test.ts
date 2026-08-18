import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST13-09.js";

describe("ST13-09 Ludomon", () => {
  it("places itself under a red host and plays the revealed eligible card", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "ST13-05", as: "host" }],
      hand: [{ card: "ST13-09", as: "ludomon" }],
      deck: ["ST13-02"],
    } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ludomon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST13-02"));
    expect(s.perm("host").stack.some((card) => card.cardId === "ST13-09")).toBe(true);
  });
});
