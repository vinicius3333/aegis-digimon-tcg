import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-111.js";

describe("BT3-111 Imperialdramon: Dragon Mode", () => {
  it("publishes the named-source reducer, Piercing, and once-per-turn trigger in IR", () => {
    const compiled = runtimeCompiledCard("BT3-111");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }],
          actions: expect.arrayContaining([
            expect.objectContaining({
              kind: "Replacement",
              event: "wouldDigivolve",
              sourceFilter: {
                controller: "mine",
                nameOrTrait: [{ tokens: ["Paildramon", "Dinobeemon"], match: "nameExact" }],
              },
              into: { zone: "hand", controller: "mine" },
              actions: [
                expect.objectContaining({
                  kind: "Replacement",
                  event: "wouldDigivolve",
                  mode: "reduceCost",
                  amount: 2,
                }),
              ],
            }),
          ]),
        }),
        expect.objectContaining({
          trigger: "YourTurn",
          frequency: "OncePerTurn",
          actions: [
            expect.objectContaining({
              kind: "SubTrigger",
              event: "whenDeletesInBattle",
              sourceFilter: { isSelfRef: true },
            }),
          ],
        }),
      ]),
    );
  });

  it("reduces its cost over Paildramon and unsuspends after deleting in battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT3-027", as: "paildramon" }],
        hand: [{ card: "BT3-111", as: "imperialdramon" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
      1: {
        battleArea: [{ card: "BT1-010", dp: 1000, suspended: true, as: "defender" }],
        security: ["BT1-011"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("paildramon").permanentId,
        instanceId: s.inst("imperialdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("paildramon").topCard.cardId === "BT3-111" &&
        s.state.memory === 2 &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId),
      5000,
    );
    expect(s.state.memory).toBe(2);
    expect(observe(s.engine).hasPierce(s.perm("paildramon"))).toBe(true);

    const defenderId = s.perm("defender").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("paildramon").permanentId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === defenderId) &&
        !s.perm("paildramon").isSuspended &&
        s.state.players[1]!.security.length === 0,
      5000,
    );

    expect(s.perm("paildramon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("reduces its cost over Dinobeemon in a legal green level-4 stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT3-050", as: "stingmon" }],
        hand: [
          { card: "BT3-055", as: "dinobeemon" },
          { card: "BT3-111", as: "imperialdramon" },
        ],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("stingmon").permanentId,
        instanceId: s.inst("dinobeemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("stingmon").topCard.cardId === "BT3-055", 5000);

    const memoryBeforeDragonMode = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("stingmon").permanentId,
        instanceId: s.inst("imperialdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("stingmon").topCard.cardId === "BT3-111", 5000);

    expect(memoryBeforeDragonMode - s.state.memory).toBe(3);
    expect(s.perm("stingmon").stack.map((card) => card.cardId)).toEqual(["BT3-050", "BT3-055"]);
    expect(observe(s.engine).hasPierce(s.perm("stingmon"))).toBe(true);
  });

  it("does not apply the hand reduction to a breeding-area source", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT3-055", as: "dinobeemon" },
        hand: [{ card: "BT3-111", as: "imperialdramon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dinobeemon").permanentId,
        instanceId: s.inst("imperialdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dinobeemon").topCard.cardId === "BT3-111", 5000);

    expect(s.state.memory).toBe(5);
    expect(s.perm("dinobeemon").inBreeding).toBe(true);
  });

  it("unsuspends once per turn after battle deletion and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT3-111", as: "dragon" }], deck: Array(10).fill("BT1-010") },
        1: {
          battleArea: [
            { card: "BT1-010", dp: 1000, suspended: true, as: "first" },
            { card: "BT1-010", dp: 1000, suspended: true, as: "second" },
            { card: "BT1-010", dp: 1000, suspended: true, as: "third" },
          ],
          security: ["BT1-011", "BT1-011", "BT1-011"],
          deck: Array(10).fill("BT1-010"),
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const attack = (target: string) =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dragon").permanentId,
        target: { kind: "permanent", permanentId: s.perm(target).permanentId },
      });
    expect(attack("first")).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.length === 2 &&
        !s.perm("dragon").isSuspended &&
        !observe(s.engine).isAttacking(),
    );
    await advance(s.engine).verb.unsuspend([s.perm("dragon").permanentId]);
    expect(attack("second")).toEqual({ ok: true });
    await settle(() => s.perm("dragon").isSuspended && !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([s.perm("third").permanentId]);
    expect(attack("third")).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.length === 0 &&
        !observe(s.engine).isAttacking() &&
        !s.perm("dragon").isSuspended,
    );
    expect(s.perm("dragon").isSuspended).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
