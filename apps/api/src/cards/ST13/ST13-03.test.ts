import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST13-03.js";

describe("ST13-03 ZubaEagermon", () => {
  it("places itself under a valid host to delete a 5000-DP Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST13-05", as: "host" }], hand: [{ card: "ST13-03", as: "source" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("host").stack.some((card) => card.cardId === "ST13-03")).toBe(true);
  });
});
