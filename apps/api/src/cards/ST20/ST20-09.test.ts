import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST20-09.js";

describe("ST20-09 MegaKabuterimon", () => {
  it("unsuspends one of yours and suspends one opponent Digimon per two Adventure Tamer colors", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST20-07", as: "ownTarget", suspended: true },
            { card: "ST20-12", as: "twoColorTamer" },
            { card: "BT21-102", as: "oneColorTamer" },
          ],
          hand: [{ card: "ST20-09", as: "mega" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponentTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mega").instanceId })).toEqual({ ok: true });
    await settle(() => !s.perm("ownTarget").isSuspended && s.perm("opponentTarget").isSuspended);
    expect(s.perm("ownTarget").isSuspended).toBe(false);
    expect(s.perm("opponentTarget").isSuspended).toBe(true);
  });

  it("does not suspend an opponent when no qualifying Tamer colors are present", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "ST20-09", as: "mega" }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponentTarget" }] },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mega").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("mega").instanceId),
    );
    expect(s.perm("opponentTarget").isSuspended).toBe(false);
  });
});
