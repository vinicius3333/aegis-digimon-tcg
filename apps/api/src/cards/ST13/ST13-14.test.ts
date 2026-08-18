import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST13-14.js";

describe("ST13-14 BryweLudramon", () => {
  it("plays an eligible Legend-Arms Digimon from its top-3 digivolution reveal", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "ST13-13", as: "base" }],
      hand: [{ card: "ST13-14", as: "brywe" }],
      deck: ["ST13-07", "BT1-001", "BT1-002", "BT1-003"],
    } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("brywe").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST13-07"));
    expect(s.perm("base").topCard.cardId).toBe("ST13-14");
  });
});
