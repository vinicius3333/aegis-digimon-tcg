import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-058.js";

describe("BT11-058 HerculesKabuterimon (X Antibody)", () => {
  it("bottom-decks a suspended Digimon when HerculesKabuterimon is in its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-081", as: "base" }],
          hand: [{ card: "BT11-058", as: "x-antibody" }],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "target", suspended: true }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("x-antibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.deck.some(({ cardId }) => cardId === "BT1-010") &&
        !s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-010"),
    );

    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-010")).toBe(false);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-010");
  });

  it("does not bottom-deck without a matching card in its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-075", as: "base" }],
          hand: [{ card: "BT11-058", as: "x-antibody" }],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "target", suspended: true }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("x-antibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(0);
  });
});
