import { describe, expect, it } from "vitest";
import { EffectTiming, Phase, digivolutionRequirementsFor } from "@aegis/shared";
import { compiled } from "./BT26-035.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

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
          actions: [expect.objectContaining({
            kind: "SubTrigger",
            event: "whenBattleWon",
            sourceFilter: { isSelfRef: true },
          })],
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
    preferred.push(s.perm("opponent").topCard.instanceId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("morphomon"));

    expect(s.perm("opponent").isSuspended).toBe(true);
  });

  it("inherited evolution ignores an ally's battle win and reacts only when its own host wins", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-035", as: "host", dp: 10000, under: [{ card: "BT26-035", as: "source" }] },
            { card: "BT1-009", as: "ally", dp: 10000 },
          ],
          hand: [{ card: "BT1-073", as: "evolution" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "allyVictim", dp: 1000, suspended: true },
            { card: "BT1-011", as: "hostVictim", dp: 1000, suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("ally").permanentId,
      target: { kind: "permanent", permanentId: s.perm("allyVictim").permanentId },
    })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("allyVictim").instanceId));
    expect(s.perm("host").topCard.cardId).toBe("BT26-035");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolution").instanceId);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "permanent", permanentId: s.perm("hostVictim").permanentId },
    })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT1-073");

    expect(s.perm("host").topCard.instanceId).toBe(s.inst("evolution").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("When Moving may suspend any Digimon, including an opponent's", async () => {
    const s = setupEngine(
      {
        0: { breeding: { card: "BT26-035", as: "mover" } },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
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
    expect(legal.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: legal.perm("nspEgg").permanentId,
      instanceId: legal.inst("morphomon").instanceId,
      useAlternateCost: true,
    })).toEqual({ ok: true });

    const invalid = setupEngine({
      0: {
        breeding: { card: "BT26-001", as: "plainEgg" },
        hand: [{ card: "BT26-035", as: "morphomon" }],
      },
    });
    expect(invalid.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: invalid.perm("plainEgg").permanentId,
      instanceId: invalid.inst("morphomon").instanceId,
      useAlternateCost: true,
    })).toEqual(expect.objectContaining({ ok: false }));
  });
});
