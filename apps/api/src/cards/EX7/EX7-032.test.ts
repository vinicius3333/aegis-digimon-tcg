import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-032.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok)
    throw new Error("failed to stop loop");
  await loop;
}

describe("EX7-032 Galemon", () => {
  it("matches the catalog, complete IR, and exclusive compiled registration", () => {
    expect(getCardDefinition("EX7-032")).toMatchObject({
      cardId: "EX7-032",
      nameEn: "Galemon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Green", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Bird Dragon", "LIBERATOR"],
      effectText:
        "[When Digivolving] If you have 1 or fewer Tamers, you may play 1 [Shoto Kazama] from your hand without paying the cost.",
      inheritedEffectText:
        "[All Turns] [Once Per Turn] When this Digimon deletes your opponent's Digimon in battle, gain 1 memory.",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [{ tokens: ["Shoto Kazama"], match: "nameExact" }],
                },
                count: 1,
              },
              from: ["hand"],
              payCost: false,
              condition: {
                kind: "zoneCount",
                seat: "mine",
                zone: "battleArea",
                filter: { kind: ["Tamer"] },
                op: "lte",
                value: 1,
                raw: "you have 1 or fewer Tamers",
              },
              optional: true,
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
    expect(hasRegisteredCompiledCard("EX7-032")).toBe(true);
  });

  it("publicly evolves, pays 2, draws exactly, preserves the stack, and plays Shoto with one Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-064", as: "base" },
            { card: "BT1-085", as: "existingTamer" },
          ],
          hand: [
            { card: "EX7-032", as: "galemon" },
            { card: "EX7-064", as: "shoto" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const galemonId = s.inst("galemon").instanceId;
    const shotoId = s.inst("shoto").instanceId;
    const drawnId = s.inst("drawn").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: galemonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === shotoId));
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").topCard.instanceId).toBe(galemonId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawnId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === shotoId)).toBe(false);
  });

  it("allows declining Shoto and blocks the play at the two-Tamer boundary", async () => {
    for (const [tamers, accepts] of [
      [0, false],
      [2, true],
    ] as const) {
      const extraTamers =
        tamers === 2
          ? [
              { card: "EX7-064", as: "first" },
              { card: "BT1-085", as: "second" },
            ]
          : [];
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "EX7-031", as: "base" }, ...extraTamers],
            hand: [
              { card: "EX7-032", as: "galemon" },
              { card: "EX7-064", as: "shoto" },
            ],
            deck: ["BT1-009"],
          },
        },
        accepts ? { autoAcceptOptional: true, autoSelectCards: true } : { autoDeclineOptional: true },
      );
      s.state.memory = 3;
      await s.ready();
      const shotoId = s.inst("shoto").instanceId;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("galemon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX7-032");
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === shotoId)).toBe(true);
    }
  });

  it("rejects evolution from a non-green level 3 without payment, draw, or stack mutation", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "base" }],
        hand: [{ card: "EX7-032", as: "galemon" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("galemon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
    expect(s.perm("base").topCard.cardId).toBe("BT1-014");
    expect(s.perm("base").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("gains memory only when its own stacked host deletes in a real battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-053", as: "host", dp: 7000, under: ["EX7-032"] },
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

  it("does not gain memory when the host loses the battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-053", as: "host", dp: 3000, under: ["EX7-032"] }] },
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

  it("uses the inherited gain once per turn and rearms after a real intervening turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-053", as: "host", dp: 9000, under: ["EX7-032"] }],
          hand: [{ card: "BT1-112", as: "scissor" }, "BT1-009", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"],
          deck: ["BT1-009", "BT1-011", "BT1-012"],
          security: ["BT1-009", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first", dp: 3000, suspended: true },
            { card: "BT1-011", as: "second", dp: 3000, suspended: true },
            { card: "EX7-028", as: "third", dp: 7000, suspended: true },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("scissor").instanceId })).toEqual({
      ok: true,
    });
    expect(s.state.memory).toBe(0);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("scissor").instanceId));
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
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(nextTurnMemory + 1);
    await stopLoop(s, loop, 0);
  });
});
