import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-070.js";

describe("BT1-070 Kuwagamon", () => {
  it("suspends one opponent Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT1-070", as: "kuwagamon" }] },
        1: { battleArea: [{ card: "BT1-029", as: "target", dp: 2000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kuwagamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("does not suspend an opposing Tamer", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT1-070", as: "kuwagamon" }] },
        1: { battleArea: [{ card: "BT1-085", as: "tamer" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kuwagamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-070"));

    expect(s.perm("tamer").isSuspended).toBe(false);
  });
});
