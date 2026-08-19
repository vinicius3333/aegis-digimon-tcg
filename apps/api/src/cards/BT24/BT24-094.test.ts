import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT24-094 Central Town: Throne Room", () => {
  it("uses no-face-up waiver and recycles bottom security face-up", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT24-094", as: "option" }],
        security: ["AD1-001", "AD1-002"],
        battleArea: [{ card: "BT24-009", as: "ts" }],
      },
    });
    await s.ready();
    const id = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: id })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === id));
    const placed = s.state.players[0]!.security.find((card) => card.instanceId === id);
    expect(placed?.faceUp).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "AD1-002")).toBe(true);
  });
});
