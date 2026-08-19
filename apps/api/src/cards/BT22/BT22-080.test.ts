import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("BT22-080 Eater (Human Form)", () => {
  it("lets one inherited copy in breeding optionally reduce an Eater play by 1", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-009", under: ["BT22-080"] },
          hand: [{ card: "BT22-079", as: "played" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT22-079"));

    // BT22-079 costs 3; the inherited reduction leaves 1 memory after paying it.
    expect(s.state.memory).toBe(1);
  });

  it("does not reduce a non-Eater Digimon play", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-009", under: ["BT22-080"] },
          hand: [{ card: "BT1-009", as: "played" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-009"));
    expect(s.state.memory).toBe(1);
  });
});
