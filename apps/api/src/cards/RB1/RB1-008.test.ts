import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-008 BetelGammamon", () => {
  it("plays Hiro Amanokawa from hand when none is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-005", as: "base" }],
          hand: [
            { card: "RB1-008", as: "betel" },
            { card: "RB1-032", as: "hiro" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("betel").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "RB1-032"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "RB1-032")).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not play a second Hiro when one is already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "RB1-005", as: "base" },
            { card: "RB1-032", as: "existing" },
          ],
          hand: [{ card: "RB1-008", as: "betel" }, { card: "RB1-032" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("betel").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length >= 2);

    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "RB1-032")).toHaveLength(
      1,
    );
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });
});
