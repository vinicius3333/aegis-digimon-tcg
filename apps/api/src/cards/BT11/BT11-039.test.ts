import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-039.js";

describe("BT11-039 Centarumon", () => {
  it("places another yellow Digimon face down on top of security when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-037", as: "base" },
            { card: "BT11-038", as: "securityTarget" },
          ],
          hand: [{ card: "BT11-039", as: "centarumon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const targetInstanceId = s.perm("securityTarget").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("centarumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some(({ instanceId }) => instanceId === targetInstanceId));

    expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: targetInstanceId, faceUp: false });
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === targetInstanceId)).toBe(false);
  });
});
