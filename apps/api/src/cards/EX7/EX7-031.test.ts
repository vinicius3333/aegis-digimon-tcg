import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-031.js";
import "../index.js";

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
