import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-022 SymbareAngoramon", () => {
  it("may play Ruli Tsukiyono from hand when none is already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-020", as: "base" }],
          hand: [
            { card: "RB1-022", as: "symbare" },
            { card: "RB1-034", as: "ruli" },
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
        instanceId: s.inst("symbare").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "RB1-034"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "RB1-034")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "RB1-034")).toBe(false);
  });

  it("does not play a second Ruli when one is already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "RB1-020", as: "base" },
            { card: "RB1-034", as: "existing" },
          ],
          hand: [
            { card: "RB1-022", as: "symbare" },
            { card: "RB1-034", as: "ruli" },
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
        instanceId: s.inst("symbare").instanceId,
      }),
    ).toEqual({ ok: true });

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "RB1-034")).toBe(true);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "RB1-034")).toHaveLength(
      1,
    );
  });
});
