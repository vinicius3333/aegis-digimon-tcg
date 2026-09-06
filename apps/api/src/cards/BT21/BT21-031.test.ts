import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-031.js";
import "../index.js";

describe("BT21-031 compiled implementation", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("reduces Mollusk or Aquatic digivolution costs and gains memory once per turn at End of Attack", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "YourTurn",
        actions: [
          {
            kind: "Replacement",
            event: "wouldDigivolve",
            sourceFilter: { isSelfRef: true },
            into: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Mollusk", "Aquatic"], match: "trait" }],
            },
            actions: [
              {
                kind: "Replacement",
                event: "wouldDigivolve",
                mode: "reduceCost",
                amount: 1,
                raw: "reduce the digivolution cost by 1",
              },
            ],
          },
        ],
      }),
      expect.objectContaining({
        trigger: "EndOfAttack",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [{ kind: "GainMemory", amount: 1 }],
      }),
    ]);
  });

  it.each([
    { trait: "Mollusk", target: "BT13-026", printedCost: 2 },
    { trait: "Aquatic", target: "BT12-025", printedCost: 3 },
  ])("reduces a $trait evolution by exactly 1 and keeps its inherited effect", async ({ target, printedCost }) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-031", as: "sangomon", under: ["BT21-001"] }],
        hand: [{ card: target, as: "evolution" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sangomon").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sangomon").topCard.cardId === target);

    expect(s.state.memory).toBe(5 - (printedCost - 1));
    expect(s.perm("sangomon").stack.map((card) => card.cardId)).toEqual(["BT21-001", "BT21-031"]);
  });

  it("does not reduce a near-matching blue evolution without Mollusk or Aquatic", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-031", as: "sangomon" }],
        hand: [{ card: "BT21-034", as: "kiwimon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sangomon").permanentId,
        instanceId: s.inst("kiwimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sangomon").topCard.cardId === "BT21-034");

    expect(s.state.memory).toBe(1);
  });

  it("does not apply its evolution reduction from the breeding area", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT21-031", as: "sangomon" },
        hand: [{ card: "BT13-026", as: "teslajellymon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sangomon").permanentId,
        instanceId: s.inst("teslajellymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sangomon").topCard.cardId === "BT13-026");

    expect(s.state.memory).toBe(1);
  });

  it("gains 1 memory at end of attack only once per turn from a realistic evolution stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-033", as: "host", under: ["BT1-003", "BT21-031"] }] },
      1: { security: ["BT1-001"] },
    });
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.pendingDecision === undefined);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
  });
});
