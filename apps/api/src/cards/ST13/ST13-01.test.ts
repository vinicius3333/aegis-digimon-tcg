import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST13-01.js";
import "./ST13-16.js";

describe("ST13-01 Sakuttomon", () => {
  it("gains 1 memory when an effect plays another Legend-Arms Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST13-12", under: ["ST13-01"] }],
          hand: [{ card: "ST13-16", as: "option" }, "ST13-04"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.memory === 1 && s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST13-04"),
    );
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST13-04")).toBe(true);
  });

  it("does not gain memory when a Legend-Arms Digimon is played normally", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST13-12", under: ["ST13-01"] }],
          hand: [{ card: "ST13-04", as: "legend-arm" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("legend-arm").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "ST13-04"));

    expect(s.state.memory).toBe(3);
  });
});
