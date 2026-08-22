import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./BT26-035.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";

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
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(s.perm("host").topCard.cardId).toBe("BT26-035");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolution").instanceId);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "permanent", permanentId: s.perm("hostVictim").permanentId },
    })).toEqual({ ok: true });
    for (let i = 0; i < 20 && s.perm("host").topCard.cardId !== "BT1-073"; i += 1) await Promise.resolve();

    expect(s.perm("host").topCard.instanceId).toBe(s.inst("evolution").instanceId);
    expect(s.state.memory).toBe(0);
  });
});
