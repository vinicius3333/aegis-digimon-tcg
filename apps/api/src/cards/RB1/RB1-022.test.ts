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

  it("gets +1000 DP while the opponent has no unsuspended Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-025", as: "host", under: [{ card: "RB1-022" }] }] },
      1: { battleArea: [{ card: "RB1-024", as: "opponent", suspended: true }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(13000);
  });
});

describe("RB1-022 SymbareAngoramon — KB Q&A rulings", () => {
  it("counts an opponent with no Digimon at all as having no unsuspended Digimon (Q6049)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-021", as: "host", under: [{ card: "RB1-022" }] }] },
      1: { battleArea: [{ card: "RB1-032", as: "opponentTamer" }] },
    });
    await s.ready();

    expect(s.state.players[1]!.battleArea.every((permanent) => permanent.topCard?.cardId === "RB1-032")).toBe(true);
    expect(s.perm("host").currentDP).toBe(6000 + 1000);
  });
});
