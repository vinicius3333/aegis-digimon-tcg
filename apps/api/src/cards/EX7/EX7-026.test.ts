import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-026.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1) {
  expect(s.engine.applyIntent(seat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("EX7-026 Starmon", () => {
  it("matches the catalog and compiles both printed triggers plus inherited Barrier", () => {
    const definition = getCardDefinition("EX7-026");
    if (definition === undefined) throw new Error("EX7-026 is missing from the card catalog");
    expect(definition).toMatchObject({
      cardId: "EX7-026",
      nameEn: "Starmon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Yellow", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Mutant", "NSp"],
      effectText:
        "[Digivolve]Lv.3 w/[NSp]\u00a0trait: Cost 2 \n\n[On Play] [When Digivolving] 1 of your opponent's Digimon gets -3000 DP for the turn.",
      inheritedEffectText: "＜Barrier＞.",
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ level: 3, traits: ["NSp"], cost: 2, isAlternate: true }],
    });
    expect(compiled.effects?.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger))).toEqual([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "ModifyDP",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            amount: -3000,
            duration: "forTheTurn",
          },
        ],
      },
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "ModifyDP",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            amount: -3000,
            duration: "forTheTurn",
          },
        ],
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
    });
  });

  it("publicly plays Starmon, reduces one opposing Digimon by 3000, and expires the reduction at turn end", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX7-026", as: "star" }, "BT1-009"], deck: ["BT1-028"] },
      1: { battleArea: [{ card: "BT1-014", as: "target" }], deck: ["BT1-028"], security: ["BT1-028"] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("star").instanceId })).toEqual({ ok: true });
    expect(s.state.memory).toBe(6);
    await settle(() => s.perm("target").currentDP === 1000);
    expect(s.perm("target").currentDP).toBe(1000);
    expect(s.perm("star").topCard.cardId).toBe("EX7-026");
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("target").currentDP).toBe(4000);
    await stopLoop(s, loop, 1);
  });

  it("publicly digivolves through both the standard Yellow Lv3 route and the alternate NSp Lv3 route", async () => {
    for (const [sourceCard, useAlternateCost] of [
      ["BT1-049", false],
      ["EX7-015", true],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: sourceCard, as: "source" }],
          hand: [{ card: "EX7-026", as: "star" }],
          deck: [{ card: "BT1-028", as: "drawn" }, "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-014", as: "target" }], deck: ["BT1-028"], security: ["BT1-028"] },
      });
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      s.state.memory = 2;
      const sourceInstanceId = s.perm("source").topCard.instanceId;
      const drawInstanceId = s.state.players[0]!.deck[0]!.instanceId;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("source").permanentId,
          instanceId: s.inst("star").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("source").topCard.cardId === "EX7-026");
      expect(s.state.memory).toBe(0);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawInstanceId);
      expect(s.state.players[0]!.deck).toHaveLength(1);
      expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([sourceInstanceId]);
      expect(s.perm("target").currentDP).toBe(1000);
      await stopLoop(s, loop, 0);
    }
  });

  it("rejects a non-NSp Red Lv3 source without paying, drawing, or changing the stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "wrongSource" }],
        hand: [{ card: "EX7-026", as: "star" }],
        deck: ["BT1-028"],
      },
    });
    await s.ready();
    s.state.memory = 2;
    const beforeDeck = s.state.players[0]!.deck.map((card) => card.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongSource").permanentId,
        instanceId: s.inst("star").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(beforeDeck);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX7-026");
    expect(s.perm("wrongSource").topCard.cardId).toBe("BT1-009");
    expect(s.perm("wrongSource").stack).toHaveLength(0);
  });

  it("uses inherited Barrier in real combat and can pay its security cost to preserve the host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-057", as: "host", dp: 1000, suspended: true, under: ["EX7-026"] }],
        security: ["BT1-028"],
        deck: ["BT1-028"],
      },
      1: { battleArea: [{ card: "BT1-014", as: "attacker" }], deck: ["BT1-028"], security: ["BT1-028"] },
    });
    s.state.turnSeat = 1;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.pendingDecision?.kind === "barrier" || s.events.some((event) => event.kind === "barrierPrompt"),
    );
    expect(
      s.engine.applyIntent(0, { type: "respondBarrier", permanentId: s.perm("host").permanentId, accept: true }),
    ).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-057")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-028")).toBe(true);
    await stopLoop(s, loop, 1);
  });
});
