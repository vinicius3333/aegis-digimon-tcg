import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT5-004.js";
import "./BT5-050.js";
import "./BT5-056.js";
import "./BT5-057.js";

describe("BT5 Rafflesimon/Rosemon Digi-Burst deck gauntlet", () => {
  it("resolves inherited discard payoffs, restricts only once, buffs both attackers, and checks four security", async () => {
    const preferredIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT5-057",
              as: "rosemon",
              under: [
                { card: "BT5-004", as: "koromonSource" },
                { card: "BT5-050", as: "weedmonSource" },
                { card: "BT1-009", as: "roseFiller" },
              ],
            },
            {
              card: "BT5-056",
              as: "rafflesimon",
              under: [
                { card: "BT1-010", as: "raffleSourceA" },
                { card: "BT1-011", as: "raffleSourceB" },
              ],
            },
          ],
        },
        1: {
          battleArea: [
            { card: "BT4-073", as: "restrictedOpponent" },
            { card: "BT2-047", as: "freeOpponent" },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        },
      },
      {
        autoSelectCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferredIds,
      },
    );
    preferredIds.push(
      s.perm("restrictedOpponent").permanentId,
      s.perm("rosemon").permanentId,
    );
    s.state.memory = 0;
    await s.ready();

    const roseSource = (s.engine as any).cardSourceOf(s.perm("rosemon").topCard!);
    const roseEffectKey = effectsOf(EffectTiming.OnDeclaration, roseSource)
      .find(({ effectKey }) => effectKey.startsWith("BT5-057/"))!.effectKey;
    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("rosemon").topCard!.instanceId,
      effectKey: roseEffectKey,
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("rosemon").stack.length === 0 &&
      s.state.memory === 1 &&
      observe(s.engine).keywordAmount(s.perm("rosemon"), "SecurityAttack") === 1 &&
      observe(s.engine).keywordAmount(s.perm("rafflesimon"), "SecurityAttack") === 1 &&
      observe(s.engine).isRestricted(s.perm("restrictedOpponent"), "attack") &&
      s.state.pendingDecision === undefined
    );

    const restrictionChoice = s.decisions.find(({ req }) =>
      req.kind === "chooseTargets" &&
      req.options?.candidateInstanceIds?.includes(s.perm("restrictedOpponent").permanentId)
    )?.req;
    expect(new Set(restrictionChoice?.options?.candidateInstanceIds ?? [])).toEqual(
      new Set([
        s.perm("restrictedOpponent").permanentId,
        s.perm("freeOpponent").permanentId,
      ]),
    );
    expect(s.state.memory).toBe(1);
    expect(s.perm("rosemon").currentDP).toBe(13_000);
    expect(observe(s.engine).isRestricted(s.perm("restrictedOpponent"), "block")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("freeOpponent"), "attack")).toBe(false);

    const raffleSource = (s.engine as any).cardSourceOf(s.perm("rafflesimon").topCard!);
    const raffleEffectKey = effectsOf(EffectTiming.OnDeclaration, raffleSource)
      .find(({ effectKey }) => effectKey.startsWith("BT5-056/"))!.effectKey;
    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("rafflesimon").topCard!.instanceId,
      effectKey: raffleEffectKey,
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("rafflesimon").stack.length === 0 &&
      s.perm("rosemon").currentDP === 15_000 &&
      s.perm("rafflesimon").currentDP === 13_000 &&
      s.state.pendingDecision === undefined
    );

    expect(observe(s.engine).isRestricted(s.perm("freeOpponent"), "attack")).toBe(false);
    expect(s.decisions.filter(({ req }) =>
      req.kind === "chooseTargets" &&
      req.options?.candidateInstanceIds?.includes(s.perm("freeOpponent").permanentId)
    )).toHaveLength(1);

    for (const alias of ["rosemon", "rafflesimon"]) {
      expect(s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm(alias).permanentId,
        target: { kind: "player" },
      })).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
    }

    expect(s.state.players[1]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
