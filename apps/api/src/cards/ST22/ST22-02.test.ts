import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST22-02 Renamon", () => {
  it("trashes a hand card and returns an Onmyōjutsu card from trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "ST22-02", as: "renamon" },
            { card: "BT1-090", as: "cost" },
          ],
          trash: [{ card: "ST22-10", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const renamonInstanceId = s.state.players[0]!.hand.find((card) => card.cardId === "ST22-02")!.instanceId;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: renamonInstanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
  });
});
