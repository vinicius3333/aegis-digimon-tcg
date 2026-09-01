import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-058.js";

describe("BT11-058 HerculesKabuterimon (X Antibody)", () => {
  it("maps its green mega, Security Attack, and conditional bottom-deck clauses", () => {
    expect(getCardDefinition("BT11-058")).toMatchObject({ cardId: "BT11-058", colors: ["Green"], level: 6, playCost: 12, dp: 12000 });
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "SecurityAttack", amount: 1 }] });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "Return", to: "deckBottom", condition: { kind: "selfHasInDigivolutionCards", nameOrTrait: [
        { tokens: ["HerculesKabuterimon"], match: "nameExact" },
        { tokens: ["X Antibody"], match: "nameExact" },
      ] } }],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["HerculesKabuterimon"], cost: 1, isAlternate: true }]);
  });

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
    const memoryBefore = s.state.memory;

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
    expect(memoryBefore - s.state.memory).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(1);
  });

  it("also recognizes the X Antibody Option name in its digivolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-075", as: "base", under: ["BT9-109"] }],
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
    await settle(
      () =>
        s.state.players[1]!.deck.some(({ cardId }) => cardId === "BT1-010") &&
        !s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-010"),
    );

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
