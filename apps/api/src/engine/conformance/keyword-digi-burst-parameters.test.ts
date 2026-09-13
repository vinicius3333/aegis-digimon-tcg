import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { beforeEach, describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { cite } from "./_kb.js";
import "../../cards/BT4/BT4-049.js";
import "../../cards/BT4/BT4-062.js";
import "../../cards/BT4/BT4-072.js";
import "../../cards/ST4/ST4-13.js";

function effectKey(s: ReturnType<typeof setupEngine>, alias: string, cardId: string) {
  const source = (s.engine as unknown as { cardSourceOf: (instance: unknown) => CardSource }).cardSourceOf(
    s.perm(alias).topCard!,
  );
  return effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith(`${cardId}/`))!
    .effectKey;
}

describe("§16-14 Digi-Burst parameter processing", () => {
  beforeEach(() => {
    cite(
      "comprehensive-0232",
      "§16-14: Digi-Burst trashes the specified number of digivolution cards and processing is optional",
      "6aef42a5c090e8124386365a9cb8b7035b25ac52979537f770eadd5d54e807f2",
    );
  });

  it("trashes exactly one source for BT4-072's public Main activation", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT4-072", as: "gog", under: [{ card: "BT1-009", as: "source" }] }] } },
      { autoSelectCards: true },
    );
    const before = s.perm("gog").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("gog").topCard!.instanceId,
        effectKey: effectKey(s, "gog", "BT4-072"),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gog").currentDP === before + 2000);
    expect(s.perm("gog").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
  });

  it("trashes exactly two sources for ST4-13 and resolves its public target effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "ST4-13",
              as: "hercules",
              under: [
                { card: "ST4-03", as: "one" },
                { card: "ST4-08", as: "two" },
              ],
            },
          ],
        },
        1: { battleArea: [{ card: "ST4-08", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("hercules").topCard!.instanceId,
        effectKey: effectKey(s, "hercules", "ST4-13"),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("hercules").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("one").instanceId, s.inst("two").instanceId]),
    );
  });

  it("trashes exactly three sources for BT4-049", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT4-049",
              as: "varo",
              under: [
                { card: "BT1-001", as: "one" },
                { card: "BT4-039", as: "two" },
                { card: "BT4-046", as: "three" },
              ],
            },
          ],
        },
        1: { battleArea: [{ card: "BT4-060", as: "target", dp: 12000 }] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("varo").topCard!.instanceId,
        effectKey: effectKey(s, "varo", "BT4-049"),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 8000);
    expect(s.perm("varo").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("one").instanceId, s.inst("two").instanceId, s.inst("three").instanceId]),
    );
  });

  it("trashes exactly four sources for BT4-062 after public digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "AD1-011",
              as: "base",
              under: [
                { card: "BT1-010", as: "one" },
                { card: "BT1-011", as: "two" },
                { card: "BT1-012", as: "three" },
              ],
            },
          ],
          hand: [{ card: "BT4-062", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 5;
    const priorTopId = s.perm("base").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT4-062" && s.perm("base").stack.length === 0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        priorTopId,
        s.inst("one").instanceId,
        s.inst("two").instanceId,
        s.inst("three").instanceId,
      ]),
    );
  });

  it("does not declare BT4-062's Digi-Burst when only three sources exist", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "AD1-011",
              as: "base",
              under: [
                { card: "BT1-010", as: "one" },
                { card: "BT1-011", as: "two" },
              ],
            },
          ],
          hand: [{ card: "BT4-062", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT4-062");
    expect(s.perm("base").stack).toHaveLength(3);
    expect(s.perm("target").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
