import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-031.js";
import "../index.js";
import "../BT2/BT2-046.js";

describe("EX7-031 Pteromon", () => {
  it("matches the catalog, complete IR, Q3848 zone gate, and exclusive registration", () => {
    expect(getCardDefinition("EX7-031")).toMatchObject({
      cardId: "EX7-031",
      nameEn: "Pteromon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Green", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Bird Dragon", "LIBERATOR"],
      effectText:
        "[Your Turn] When this Digimon would digivolve into a Digimon card with [Bird]/[Avian] in one of its traits, reduce the digivolution cost by 1.",
      inheritedEffectText:
        "[All Turns] [Once Per Turn] When this Digimon deletes an opponent's Digimon in battle, gain 1 memory.",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              sourceFilter: { isSelfRef: true, zone: "battleArea" },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Bird", "Avian"], match: "traitContains" }],
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
        },
        {
          trigger: "AllTurns",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenDeletesInBattle",
              sourceFilter: { isSelfRef: true },
              actions: [{ kind: "GainMemory", amount: 1 }],
            },
          ],
          isInherited: true,
          frequency: "OncePerTurn",
        },
      ],
      coverage: "full",
      residual: [],
    });
    expect(hasRegisteredCompiledCard("EX7-031")).toBe(true);
  });

  it("Q3848: does not reduce a Bird evolution from the breeding area", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX7-031", as: "pteromon" },
        hand: [{ card: "EX7-032", as: "galemon" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const baseId = s.inst("pteromon").instanceId;
    const evolvedId = s.inst("galemon").instanceId;
    const drawnId = s.inst("drawn").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("pteromon").permanentId,
        instanceId: evolvedId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("pteromon").topCard.instanceId === evolvedId);
    expect(s.state.memory).toBe(1);
    expect(s.perm("pteromon").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawnId);
  });

  it("reduces a Bird evolution by exactly 1 in the battle area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-031", as: "pteromon" }],
        hand: [{ card: "EX7-032", as: "evolver" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const baseId = s.inst("pteromon").instanceId;
    const evolvedId = s.inst("evolver").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("pteromon").permanentId,
        instanceId: evolvedId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("pteromon").topCard.instanceId === evolvedId);
    expect(s.state.memory).toBe(2);
    expect(s.perm("pteromon").stack.map((card) => card.instanceId)).toEqual([baseId]);
  });

  it("does not reduce a non-Bird non-Avian evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-031", as: "pteromon" }],
        hand: [{ card: "BT1-069", as: "evolver" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("pteromon").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("pteromon").topCard.cardId === "BT1-069");
    expect(s.state.memory).toBe(1);
  });

  it("gains memory only when its own stacked host deletes in a real battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-071", as: "host", dp: 7000, under: ["EX7-031"] },
          { card: "BT1-009", as: "other", dp: 7000 },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "first", dp: 3000, suspended: true },
          { card: "BT1-011", as: "second", dp: 3000, suspended: true },
        ],
      },
    });
    s.state.memory = 2;
    await s.ready();
    const firstId = s.perm("first").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: firstId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === firstId));
    expect(s.state.memory).toBe(3);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("other").permanentId,
        target: { kind: "permanent", permanentId: s.perm("second").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.memory).toBe(3);
  });

  it("limits the inherited gain once per turn and resets after a real intervening turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-071", as: "host", dp: 10000, under: ["EX7-031", "BT2-046"] }],
        deck: ["BT1-009", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        security: ["BT1-104"],
      },
      1: {
        battleArea: [
          { card: "BT1-043", as: "first", dp: 3000, suspended: true },
          { card: "BT1-043", as: "second", dp: 3000, suspended: true },
          { card: "BT1-043", as: "third", dp: 3000, suspended: true },
        ],
        deck: ["BT1-009", "BT1-011"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const attack = (target: string) =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm(target).permanentId },
      });
    const initialMemory = s.state.memory;

    expect(attack("first")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && !s.perm("host").isSuspended);
    expect(s.state.memory).toBe(initialMemory + 1);
    expect(attack("second")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && !s.perm("host").isSuspended);
    expect(s.state.memory).toBe(initialMemory + 1);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("third").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("third").isSuspended);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const nextTurnMemory = s.state.memory;
    expect(attack("third")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && !s.perm("host").isSuspended);
    expect(s.state.memory).toBe(nextTurnMemory + 1);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not gain memory when its host loses battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-071", as: "host", dp: 3000, under: ["EX7-031"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "defender", dp: 7000, suspended: true }] },
    });
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.memory).toBe(2);
  });
});
