import { describe, expect, it } from "vitest";
import { EffectTiming, Phase, digivolutionRequirementsFor } from "@aegis/shared";
import { compiled } from "./BT26-035.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";

describe("BT26-035 Morphomon", () => {
  it("models both printed suspend windows", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["NSp"], cost: 0, isAlternate: true }]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "OnPlay",
          actions: [
            { kind: "Suspend", optional: true, target: { filter: { controller: "any", kind: ["Digimon"] }, count: 1 } },
          ],
        }),
        expect.objectContaining({ trigger: "WhenMoving" }),
        expect.objectContaining({
          trigger: "YourTurn",
          isInherited: true,
          actions: [
            expect.objectContaining({
              kind: "SubTrigger",
              event: "whenBattleWon",
              sourceFilter: { isSelfRef: true },
            }),
          ],
        }),
      ]),
    );
  });

  it("suspends one Digimon through the public On Play window", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-035", as: "morphomon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponent").permanentId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("morphomon"));

    expect(s.perm("opponent").isSuspended).toBe(true);
  });

  it("inherited evolution filters traits, reacts only to its host, and is once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-051", as: "host", dp: 10000, under: [{ card: "BT26-035", as: "source" }] },
            { card: "EX12-049", as: "nspTarget", dp: 10000 },
            { card: "BT1-009", as: "ally", dp: 10000 },
          ],
          hand: [
            { card: "BT1-073", as: "evolution" },
            { card: "BT1-076", as: "secondEvolution" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "allyVictim", suspended: true, dp: 1000 },
            { card: "BT1-009", as: "hostVictim", suspended: true, dp: 1000 },
            { card: "BT1-009", as: "secondHostVictim", suspended: true, dp: 1000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("nspTarget").permanentId);
    s.state.memory = 0;
    await s.ready();
    const allyVictimId = s.perm("allyVictim").permanentId;
    const hostVictimId = s.perm("hostVictim").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "permanent", permanentId: allyVictimId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === allyVictimId),
    );
    expect(s.perm("host").topCard.cardId).toBe("BT11-051");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolution").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: hostVictimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("nspTarget").topCard.cardId === "BT1-073");

    expect(s.perm("nspTarget").topCard.instanceId).toBe(s.inst("evolution").instanceId);
    expect(s.perm("host").topCard.cardId).toBe("BT11-051");
    expect(s.state.memory).toBe(0);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("secondHostVictim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("host").topCard.cardId).toBe("BT11-051");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("secondEvolution").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("may decline both the On Play suspension and inherited evolution", async () => {
    const onPlay = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-035", as: "morphomon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(onPlay.engine).fire(EffectTiming.OnPlay, onPlay.perm("morphomon"));
    expect(onPlay.perm("opponent").isSuspended).toBe(false);

    const moving = setupEngine(
      {
        0: { breeding: { card: "BT26-035", as: "mover" } },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    moving.state.phase = Phase.Breeding;
    expect(
      moving.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: moving.perm("mover").permanentId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => moving.state.pendingDecision === undefined);
    expect(moving.perm("opponent").isSuspended).toBe(false);

    const inherited = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-051", as: "host", under: ["BT26-035"] }],
          hand: [{ card: "BT1-073", as: "evolution" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await inherited.ready();
    await advance(inherited.engine).fireSubTrigger("whenBattleWon", {
      attackerPermanentId: inherited.perm("host").permanentId,
    });

    expect(inherited.perm("host").topCard.cardId).toBe("BT11-051");
    expect(inherited.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      inherited.inst("evolution").instanceId,
    );
  });

  it("When Moving may suspend any Digimon, including an opponent's", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { breeding: { card: "BT26-035", as: "mover" } },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.phase = Phase.Breeding;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("uses the exact level-2 NSp cost-0 evolution and rejects a near-match", async () => {
    expect(digivolutionRequirementsFor("BT26-035")).toContainEqual({
      level: 2,
      traits: ["NSp"],
      cost: 0,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        breeding: { card: "EX8-004", as: "nspEgg" },
        hand: [{ card: "BT26-035", as: "morphomon" }],
      },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("nspEgg").permanentId,
        instanceId: legal.inst("morphomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });

    const invalid = setupEngine({
      0: {
        breeding: { card: "BT26-001", as: "plainEgg" },
        hand: [{ card: "BT26-035", as: "morphomon" }],
      },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("plainEgg").permanentId,
        instanceId: invalid.inst("morphomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
