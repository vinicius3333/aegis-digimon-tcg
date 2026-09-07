import { observe } from "../../engine/testkit/observe.js";
import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-048.js";
import "../index.js";

describe("BT21-048 compiled implementation", () => {
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

  it("preserves the WG alternate Digivolution requirement and inherited Piercing", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["WG"], cost: 0, isAlternate: true }]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }],
      }),
    );
  });

  it("optionally suspends one Digimon of either side on play", () => {
    const onPlay = compiled.effects.find((effect) => effect.trigger === "OnPlay");
    expect(onPlay?.actions).toEqual([
      {
        kind: "Suspend",
        target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
        optional: true,
      },
    ]);
  });

  it("enters through the public play intent with its On Play optional effect registered", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT21-048", as: "mushroomon" }] } });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mushroomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("mushroomon").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("mushroomon").instanceId)).toBe(
      true,
    );
  });

  it("suspends an opponent Digimon on play while leaving another target unsuspended", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT21-048", as: "mushroomon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "chosen" },
            { card: "BT1-010", as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").topCard.instanceId);
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mushroomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("chosen").isSuspended);

    expect(s.perm("other").isSuspended).toBe(false);
  });

  it("may suspend an own Digimon and may decline without suspending anything", async () => {
    const preferred: string[] = [];
    const publicOwn = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-048", as: "mushroomon" }],
          battleArea: [{ card: "BT1-009", as: "ownTarget" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(publicOwn.perm("ownTarget").topCard.instanceId);
    publicOwn.state.memory = 4;
    await publicOwn.ready();
    expect(
      publicOwn.engine.applyIntent(0, {
        type: "playCard",
        instanceId: publicOwn.inst("mushroomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => publicOwn.perm("ownTarget").isSuspended);
    expect(publicOwn.perm("ownTarget").isSuspended).toBe(true);

    const accepted = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-048", as: "source" },
            { card: "BT1-009", as: "ownTarget" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await accepted.ready();
    await advance(accepted.engine).fire(EffectTiming.OnPlay, accepted.perm("source"));
    expect(accepted.perm("ownTarget").isSuspended || accepted.perm("source").isSuspended).toBe(true);

    const declined = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-048", as: "source" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await declined.ready();
    await advance(declined.engine).fire(EffectTiming.OnPlay, declined.perm("source"));
    expect(declined.perm("source").isSuspended).toBe(false);
    expect(declined.perm("target").isSuspended).toBe(false);
  });

  it("zero-cost digivolves from a level-2 WG egg in the breeding area", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT21-003", as: "wgEgg" },
        hand: [{ card: "BT21-048", as: "mushroomon" }],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wgEgg").permanentId,
        instanceId: s.inst("mushroomon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("wgEgg").topCard.instanceId === s.inst("mushroomon").instanceId);
    expect(s.state.memory).toBe(1);
  });

  it("rejects the zero-cost alternate evolution from a non-WG level-2 base", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-003", as: "base" }], hand: [{ card: "BT21-048", as: "mushroomon" }] },
    });
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mushroomon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").topCard.cardId).toBe("BT1-003");
  });

  it("publicly declines On Play suspension and leaves both players' Digimon ready", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT21-048", as: "mushroomon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mushroomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("mushroomon").instanceId),
    );
    expect(s.perm("mushroomon").isSuspended).toBe(false);
    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("grants observable Piercing to a realistic WG evolution stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-048", as: "source" }], hand: [{ card: "BT21-034", as: "host" }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", suspended: true }],
          security: [{ card: "BT1-010", as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.instanceId === s.inst("host").instanceId);
    expect(observe(s.engine).hasPierce(s.perm("source"))).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
