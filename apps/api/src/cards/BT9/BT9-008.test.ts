import { getCardDefinition, type PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-008.js";

describe("BT9-008 Agumon (X Antibody)", () => {
  it("matches the catalog, both timings, buckets, and alternate evolution IR", () => {
    expect(getCardDefinition("BT9-008")).toMatchObject({
      cardId: "BT9-008",
      nameEn: "Agumon (X Antibody)",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Red", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Dinosaur", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      effects: [
        { trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" }] },
        { trigger: "WhenDigivolving", actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" }] },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ names: ["Agumon"], cost: 0, isAlternate: true }],
    });
    for (const effect of compiled.effects ?? []) {
      expect(effect.actions[0]).toMatchObject({
        add: [
          { filter: { nameOrTrait: [{ tokens: ["Greymon", "Omnimon"], match: "name" }] }, count: 1, to: "hand" },
          { filter: { nameOrTrait: [{ tokens: ["X Antibody"], match: "name" }] }, count: 1, to: "hand" },
        ],
      });
    }
  });

  it("implements Q1798 by mandatorily adding both available buckets on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT9-008", as: "source" }],
          deck: [{ card: "BT9-012", as: "greymon" }, { card: "BT9-109", as: "xAntibody" }, "BT9-009"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const ids = [s.inst("greymon").instanceId, s.inst("xAntibody").instanceId];
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => ids.every((id) => player.hand.some((c) => c.instanceId === id)));
    expect(player.hand.map((card) => card.instanceId)).toEqual(expect.arrayContaining(ids));
    expect(player.deck[0]?.cardId).toBe("BT9-009");
    expect(player.deck).toHaveLength(1);
    expect(s.state.memory).toBe(0);
  });

  it("implements Q1797 by adding the single available bucket and bottoming the rest", async () => {
    for (const matchingCard of ["BT9-012", "BT5-086", "BT9-109"] as const) {
      const s = setupEngine(
        {
          0: {
            hand: [{ card: "BT9-008", as: "source" }],
            deck: [
              { card: matchingCard, as: "match" },
              { card: "BT1-011", as: "miss1" },
              { card: "BT1-010", as: "miss2" },
            ],
          },
        },
        { autoSelectCards: true, autoOrderCards: true },
      );
      s.state.memory = 3;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("match").instanceId));
      expect(s.state.players[0]!.hand).toContainEqual(s.inst("match"));
      expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(
        expect.arrayContaining([s.inst("miss1").instanceId, s.inst("miss2").instanceId]),
      );
    }
  });

  it("runs the same reveal contract after the printed Agumon alternate evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-010", as: "agumon" }],
          hand: [{ card: "BT9-008", as: "evolving" }],
          deck: [{ card: "BT9-012", as: "greymon" }, "BT9-009", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("greymon").instanceId));
    expect(s.state.memory).toBe(0);
    expect(s.perm("agumon").topCard.instanceId).toBe(s.inst("evolving").instanceId);
  });

  it("accepts the standard red egg recipe and rejects a blue egg", async () => {
    for (const [base, ok] of [
      ["BT1-001", true],
      ["BT1-003", false],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: base, as: "base" }], hand: [{ card: "BT9-008", as: "evolving" }] },
      });
      const result = s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      });
      expect(result.ok).toBe(ok);
      if (!ok) expect(s.state.players[0]!.hand).toContainEqual(s.inst("evolving"));
    }
  });
});
