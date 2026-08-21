import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-244.js";

describe("P-244 Unique Emblem: Ragnarok Attainer", () => {
  it("uses from hand, plays a qualifying Vemmon/Zenith, and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-061", as: "host" }],
          hand: [{ card: "P-244", as: "option" }],
          trash: [{ card: "BT11-061", as: "vemmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "P-244"), 500);
    expect(
      s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT11-061").length,
    ).toBeGreaterThanOrEqual(2);
  });
});
