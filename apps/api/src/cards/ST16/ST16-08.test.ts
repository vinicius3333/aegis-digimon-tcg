import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST16-08.js";

describe("ST16-08 Garurumon", () => {
  it("draws 1 then trashes 1 card when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST16-03", as: "gabumon" }],
          hand: [
            { card: "ST16-08", as: "garurumon" },
            { card: "BT1-001", as: "discard" },
          ],
          deck: [{ card: "BT1-002", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const discardId = s.inst("discard").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gabumon").permanentId,
        instanceId: s.inst("garurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === discardId));

    expect(s.perm("gabumon").topCard.cardId).toBe("ST16-08");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-002")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === discardId)).toBe(true);
  });
});
