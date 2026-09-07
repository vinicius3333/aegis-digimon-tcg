import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-065.js";
import "../index.js";
import "../BT23/BT23-065.js";

function phantomonMainEffectKey(s: EngineSetup): string {
  const source = (
    s.engine as unknown as { cardSourceOf(instance: ReturnType<EngineSetup["inst"]>): CardSource }
  ).cardSourceOf(s.inst("phantomon"));
  return effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT23-065/"))!
    .effectKey;
}

describe("BT21-065 Ghostmon", () => {
  it("preserves complete residual-free coverage", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("reduces Ghost digivolution cost on your turn and gains memory on deletion", () => {
    expect(compiled.effects).toContainEqual({
      trigger: "YourTurn",
      actions: [
        expect.objectContaining({
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true },
          into: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] },
          actions: [expect.objectContaining({ kind: "Replacement", mode: "reduceCost", amount: 1 })],
        }),
      ],
    });
    expect(compiled.effects).toContainEqual({
      trigger: "OnDeletion",
      actions: [{ kind: "GainMemory", amount: 1 }],
      isInherited: true,
    });
  });

  it("reduces a Ghost evolution by exactly 1 through the public intent", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-065", as: "ghostmon" }],
        hand: [{ card: "BT20-068", as: "bakemon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ghostmon").permanentId,
        instanceId: s.inst("bakemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ghostmon").topCard.instanceId === s.inst("bakemon").instanceId);

    expect(s.state.memory).toBe(2);
  });

  it("combines Ghostmon's reduction with BT23-065's public Hand/Main evolution for cost 2 (Q5334)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-065", as: "ghostmon" },
            { card: "BT23-087", as: "violetInboots" },
          ],
          hand: [{ card: "BT23-065", as: "phantomon" }],
          trash: [{ card: "BT23-064", as: "bakemon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("phantomon").instanceId,
        effectKey: phantomonMainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ghostmon").topCard.instanceId === s.inst("phantomon").instanceId);

    expect(s.perm("ghostmon").stack.map((card) => card.cardId)).toEqual(["BT23-064", "BT21-065"]);
    expect(s.perm("ghostmon").topCard.cardId).toBe("BT23-065");
    expect(s.state.memory).toBe(3);
  });

  it("does not reduce an evolution into a non-Ghost card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-065", as: "ghostmon" }],
        hand: [{ card: "BT10-074", as: "quetzalmon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ghostmon").permanentId,
        instanceId: s.inst("quetzalmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ghostmon").topCard.instanceId === s.inst("quetzalmon").instanceId);

    expect(s.state.memory).toBe(1);
  });

  it("does not reduce a Ghost evolution from the breeding area (Q4573)", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT21-065", as: "ghostmon" },
        hand: [{ card: "BT20-068", as: "bakemon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ghostmon").permanentId,
        instanceId: s.inst("bakemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ghostmon").topCard.instanceId === s.inst("bakemon").instanceId);
    expect(s.state.memory).toBe(1);
  });

  it("rejects a Ghost evolution during the opponent's turn before card-specific processing", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-065", as: "ghostmon" }],
        hand: [{ card: "BT20-068", as: "bakemon" }],
      },
    });
    s.state.memory = 3;
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ghostmon").permanentId,
        instanceId: s.inst("bakemon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("ghostmon").topCard.cardId).toBe("BT21-065");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("bakemon").instanceId)).toBe(true);
  });

  it("pays the reduced Ghost evolution from zero memory through the shared negative gauge", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-065", as: "ghostmon" }],
        hand: [{ card: "BT20-068", as: "bakemon" }],
      },
    });
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ghostmon").permanentId,
        instanceId: s.inst("bakemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ghostmon").topCard.instanceId === s.inst("bakemon").instanceId);
    expect(s.state.memory).toBe(-1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("bakemon").instanceId)).toBe(false);
  });

  it("gains 1 memory when a realistic host carrying Ghostmon is deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-068", as: "bakemon", under: [{ card: "BT21-065", as: "source" }] }] },
    });
    await s.ready();
    s.state.memory = 0;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("bakemon").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it("gains 1 memory when a public battle deletes a legal Ghost host stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-068", as: "host", suspended: true, under: [{ card: "BT21-065", as: "source" }], dp: 4000 },
          ],
        },
        1: { battleArea: [{ card: "BT2-075", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.length === 0 && s.state.memory === 4 && !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(4);
  });
});
