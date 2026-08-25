import { describe, expect, it } from "vitest";
import { compiledEffects, digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { compiled } from "./EX12-054.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-054 Guardromon", () => {
  it("keeps Blocker on the card and as an inherited effect", () => {
    const staticEffects = compiled.effects.filter((effect) => effect.trigger === "Static");

    expect(staticEffects).toHaveLength(2);
    expect(staticEffects.every((effect) => effect.keywords?.some((keyword) => keyword.keyword === "Blocker"))).toBe(
      true,
    );
    expect(staticEffects[1]?.isInherited).toBe(true);
  });

  it("offers the Machine/Cyborg/ME hand trash cost before drawing on play", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    const action = effect?.actions[0];

    expect(action).toMatchObject({
      kind: "Draw",
      amount: 2,
      cost: {
        kind: "trash",
        target: {
          filter: {
            zone: "hand",
            controller: "mine",
            nameOrTrait: [{ match: "trait", tokens: ["Machine", "Cyborg", "ME"] }],
          },
          count: 1,
        },
      },
    });
    expect(action).toMatchObject({ optional: true, abortOnDecline: true });
  });

  it("uses the same optional activation cost on digivolving", () => {
    const action = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0];

    expect(action).toMatchObject({
      kind: "Draw",
      amount: 2,
      cost: { kind: "trash" },
      optional: true,
      abortOnDecline: true,
    });
  });

  it("retains the alternate ME level-3 evolution requirement", () => {
    expect(digivolutionRequirementsFor("EX12-054")).toEqual([{ level: 3, traits: ["ME"], cost: 2, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(registeredCompiledCards.get("EX12-054")).toEqual(compiled);
    expect(compiledEffects["EX12-054"]).toEqual(compiled);
  });

  it("trashes a Machine card before drawing two on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX12-054", as: "guardromon" },
            { card: "EX12-053", as: "cost" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("guardromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 0);

    const player = s.state.players[0]!;
    expect(player.trash.map((card) => card.cardId)).toContain("EX12-053");
    expect(player.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-009", "BT1-010"]));
  });

  it("uses the same mandatory trash-and-draw sequence when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-053", as: "host" }],
          hand: [
            { card: "EX12-054", as: "guardromon" },
            { card: "EX12-053", as: "cost" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("guardromon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0);

    const player = s.state.players[0]!;
    expect(s.perm("host").topCard.cardId).toBe("EX12-054");
    expect(player.trash.map((card) => card.cardId)).toContain("EX12-053");
    expect(player.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-009", "BT1-010"]));
  });

  it.each([
    ["On Play", EffectTiming.OnPlay],
    ["When Digivolving", EffectTiming.WhenDigivolving],
  ])("may decline the activation cost at %s without trashing or drawing", async (_label, timing) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-054", as: "source" }],
          hand: [{ card: "EX12-053", as: "cost" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );

    const resolution = advance(s.engine).fire(timing, s.perm("source"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await resolution;

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it.each([
    ["On Play", EffectTiming.OnPlay],
    ["When Digivolving", EffectTiming.WhenDigivolving],
  ])("does nothing at %s when no eligible activation cost exists", async (_label, timing) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-054", as: "source" }],
          hand: [{ card: "BT1-009", as: "nonmatch" }],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(timing, s.perm("source"));
    await settle();

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("nonmatch").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("publishes printed Blocker and grants inherited Blocker only to its own host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-069", as: "host", under: ["EX12-054"] },
          { card: "EX12-054", as: "top" },
          { card: "BT1-069", as: "other" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("top"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Blocker")).toBe(false);
  });

  it("uses the normal black and alternate ME routes and rejects an off-color non-ME base", async () => {
    for (const [baseCardId, useAlternateCost] of [
      ["EX12-053", false],
      ["EX12-008", true],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: "EX12-054", as: "target" }] },
      });
      s.state.memory = 2;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("target").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX12-054");
      expect(s.state.memory).toBe(0);
    }

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "EX12-054", as: "target" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("target").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("matches the complete catalog identity", () => {
    expect(getCardDefinition("EX12-054")).toMatchObject({
      nameEn: "Guardromon",
      colors: ["Black"],
      kinds: ["Digimon"],
      playCost: 5,
      dp: 5000,
      level: 4,
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Machine", "ME"],
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }],
    });
  });
});
