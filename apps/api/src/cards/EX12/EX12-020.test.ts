import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-020 Gasamon", () => {
  it("reduces a legal TB digivolution by one during its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-020", as: "source" }],
        hand: [{ card: "EX12-026", as: "target" }],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("target").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "EX12-026");

    expect(s.perm("source").topCard?.cardId).toBe("EX12-026");
    expect(s.state.memory).toBe(0);
  });

  it("does not reduce a non-TB digivolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-020", as: "source" }],
        hand: [{ card: "EX12-025", as: "target" }],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("target").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "EX12-025");
    expect(s.state.memory).toBe(-1);
  });

  it("does not reduce a neighboring Digimon's TB digivolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX12-020", as: "source" },
          { card: "EX12-021", as: "other" },
        ],
        hand: [{ card: "EX12-026", as: "target" }],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("other").permanentId,
        instanceId: s.inst("target").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("other").topCard?.cardId === "EX12-026");
    expect(s.state.memory).toBe(0);
  });

  it("does not trigger the Your Turn replacement while the source is in the breeding area", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX12-020", as: "source" },
        hand: [{ card: "EX12-026", as: "target" }],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("target").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX12-026");
    expect(s.state.memory).toBe(-1);
  });

  it("draws once when the inherited attack effect sees seven or fewer cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-026", as: "host", under: ["EX12-020"] }],
          hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.hand.length === 8);
    expect(s.state.players[0]!.hand).toHaveLength(8);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand).toHaveLength(8);
  });

  it("does not draw when the inherited attack effect sees eight cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-026", as: "host", under: ["EX12-020"] }],
        hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: ["BT1-010"],
      },
    });

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.state.players[0]!.hand).toHaveLength(8);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("encodes the TB-only replacement, the inherited hand gate, and the Shambala evolution", () => {
    const compiled = registeredCompiledCards.get("EX12-020")!;
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["Shambala"], cost: 0, isAlternate: true }]);
    const replacement = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(replacement).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true },
          into: { controllerDefault: "mine", kind: ["Digimon"], traits: ["TB"] },
          actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
        },
      ],
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "Draw", controller: "mine", amount: 1, condition: { kind: "handAtMost", value: 7 } }],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("uses the normal blue and alternate Shambala level-2 evolution routes for zero", async () => {
    expect(digivolutionRequirementsFor("EX12-020")).toEqual([
      { level: 2, traits: ["Shambala"], cost: 0, isAlternate: true },
    ]);
    for (const [eggCardId, useAlternateCost] of [
      ["BT1-003", false],
      ["EX12-002", true],
    ] as const) {
      const s = setupEngine({
        0: {
          breeding: { card: eggCardId, as: "egg" },
          hand: [{ card: "EX12-020", as: "gasamon" }],
        },
      });

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("egg").permanentId,
          instanceId: s.inst("gasamon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX12-020");
      expect(s.state.memory).toBe(0);
    }
  });

  it("rejects an off-color level-2 Digi-Egg without Shambala", () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "egg" },
        hand: [{ card: "EX12-020", as: "gasamon" }],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("gasamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
