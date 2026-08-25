import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST23-07.js";

describe("ST23-07 Armalizamon", () => {
  it("plays a Glowing Dawn Tamer when digivolving with no own Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST23-06", as: "base" }],
          hand: [
            { card: "ST23-07", as: "armalizamon" },
            { card: "ST23-13", as: "tamer" },
          ],
          deck: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("armalizamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard?.cardId === "ST23-07" &&
        s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("tamer").instanceId),
    );
    expect(s.perm("base").topCard?.cardId).toBe("ST23-07");
    const playedTamer = s.state.players[0]!.battleArea.find(
      (perm) => perm.topCard?.instanceId === s.inst("tamer").instanceId,
    );
    expect(playedTamer?.topCard?.cardId).toBe("ST23-13");
    expect(playedTamer?.controllerSeat).toBe(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(false);
  });

  it("does not play a Tamer when its controller already has two Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST23-13", as: "firstTamer" },
            { card: "ST23-14", as: "secondTamer" },
          ],
          hand: [
            { card: "ST23-07", as: "armalizamon" },
            { card: "ST23-13", as: "candidate" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const candidateId = s.inst("candidate").instanceId;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("armalizamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 5);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === candidateId)).toBe(true);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "ST23-13")).toHaveLength(
      1,
    );
  });
});
