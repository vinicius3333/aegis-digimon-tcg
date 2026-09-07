import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { createCardSource } from "../../engine/cards/CardSource.js";
import { createCardStateLookup } from "../../engine/effects/context.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-031.js";
import "../index.js";
import "../BT22/BT22-024.js";

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
        battleArea: [{ card: "BT21-031", as: "sangomon", under: ["BT21-003"] }],
        hand: [{ card: target, as: "evolution" }],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sangomon").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sangomon").topCard.cardId === target);

    expect(s.state.memory).toBe(2 - (printedCost - 1));
    expect(s.perm("sangomon").stack.map((card) => card.cardId)).toEqual(["BT21-003", "BT21-031"]);
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

  it("gains 1 memory once per turn across two public attacks after a public unsuspend", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-031", as: "host", under: ["BT1-003"] }],
        hand: [
          { card: "BT1-033", as: "dolphmon" },
          { card: "ST8-11", as: "unsuspendOption" },
        ],
      },
      1: { security: ["BT1-001", "BT1-002", "BT1-004"] },
    });
    s.state.memory = 8;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("dolphmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("dolphmon").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.pendingDecision === undefined);
    const memoryAfterFirstAttack = s.state.memory;
    expect(memoryAfterFirstAttack).toBe(7);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("unsuspendOption").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended);
    expect(s.state.memory).toBe(memoryAfterFirstAttack - 3);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length >= 2);
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.memory).toBe(memoryAfterFirstAttack - 3);
  });

  it("reduces the related BT22-024 hand effect from 3 to 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-031", as: "sangomon", under: ["BT1-003"] },
            { card: "BT22-086", as: "yao" },
          ],
          hand: [{ card: "BT22-024", as: "marineBullmon" }],
          trash: ["BT22-021", "BT22-020"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const source = createCardSource(s.inst("marineBullmon"), createCardStateLookup(s.state));
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source)[0]!.effectKey;
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("marineBullmon").instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sangomon").topCard.cardId === "BT22-024");
    expect(s.state.memory).toBe(3);
    expect(s.perm("sangomon").stack.map((card) => card.cardId)).toEqual(["BT22-021", "BT1-003", "BT21-031"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT22-020"]);
  });
});
