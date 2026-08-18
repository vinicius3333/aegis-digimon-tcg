import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-083.js";

describe("BT11-083 LadyDevimon", () => {
  it("trashes 1 hand card before returning Mirei from trash", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-079", as: "base" }],
          hand: [
            { card: "BT11-083", as: "lady" },
            { card: "BT1-009", as: "discard" },
          ],
          trash: [{ card: "BT11-094", as: "mirei" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("discard").instanceId, s.inst("mirei").instanceId);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lady").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("mirei").instanceId));
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("discard").instanceId);
  });
});
