import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX4-009.js";
import "../index.js";

const DRAW_DECK = ["BT1-012", "BT1-013"];
type Setup = ReturnType<typeof setupEngine>;

async function openMain(s: Setup, seat: 0 | 1): Promise<void> {
  await advance(s.engine).waitForMainPhase(seat);
}

function closeMain(s: Setup, seat: 0 | 1): void {
  advance(s.engine).endMainPhaseIfOpen(seat);
}

async function stopLoop(s: Setup, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  expect(s.engine.applyIntent(seat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("EX4-009 RizeGreymon", () => {
  it("has the official identity and reduces one Digimon plus all Security Digimon", () => {
    expect(getCardDefinition("EX4-009")).toMatchObject({
      cardId: "EX4-009",
      nameEn: "RizeGreymon",
      colors: ["Red", "Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Red", level: 4, memoryCost: 4 },
        { color: "Yellow", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Cyborg"],
      effectText:
        "[Digivolve][GeoGreymon]: Cost 3[When Digivolving] 1 of your opponent's Digimon and all of your opponent's Security Digimon get -4000 DP for the turn.",
      inheritedEffectText:
        "[Your Turn][Once Per Turn] When one of your red or yellow Tamers becomes suspended, 1 of your opponent's Digimon and all of your opponent's Security Digimon get -4000 DP for the turn.",
    });
    expect(runtimeCompiledCard("EX4-009")).toMatchObject({ coverage: "full", residual: [] });
    expect(digivolutionRequirementsFor("EX4-009")).toEqual([
      { namesExact: ["GeoGreymon"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toEqual([
      expect.objectContaining({
        kind: "ModifyDP",
        amount: -4000,
        duration: "forTheTurn",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      }),
      expect.objectContaining({
        kind: "ModifySecurityDP",
        controller: "opponent",
        amount: -4000,
        duration: "forTheTurn",
      }),
    ]);
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["GeoGreymon"], cost: 3, isAlternate: true }]);
  });

  it.each([
    ["red level 4", "EX4-008", false, 0],
    ["yellow level 4", "BT1-051", false, 0],
    ["GeoGreymon", "EX4-007", true, 1],
  ])(
    "digivolves through the printed %s route, draws, and preserves the evolution stack",
    async (_route, baseCard, useAlternateCost, expectedMemory) => {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [{ card: "EX4-009", as: "rizeGreymon" }],
          deck: DRAW_DECK,
        },
      });
      const sourceInstanceId = s.inst("base").instanceId;
      const evolutionInstanceId = s.inst("rizeGreymon").instanceId;
      s.state.memory = 4;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("rizeGreymon").instanceId,
          ...(useAlternateCost ? { useAlternateCost: true } : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "EX4-009");

      expect(s.state.memory).toBe(expectedMemory);
      expect(s.perm("base").topCard?.instanceId).toBe(evolutionInstanceId);
      expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([sourceInstanceId]);
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-012");
      expect(s.state.players[0]!.deck).toHaveLength(DRAW_DECK.length - 1);
    },
  );

  it("rejects the exact-GeoGreymon route from a non-GeoGreymon level 4 without paying or moving cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-010", as: "base" }],
        hand: [{ card: "EX4-009", as: "rizeGreymon" }],
        deck: DRAW_DECK,
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rizeGreymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").topCard?.cardId).toBe("AD1-010");
    expect(s.perm("base").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("rizeGreymon").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(DRAW_DECK.length);
  });
  it("inherits the same pair after a red or yellow Tamer is suspended", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", kind: ["Tamer"], colors: ["Red", "Yellow"] },
        },
      ],
    });
  });

  it("publicly digivolves and reduces exactly one opposing Digimon plus all opposing Security Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-007", as: "geo" }],
          hand: [{ card: "EX4-009", as: "rize" }],
          deck: DRAW_DECK,
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target", dp: 9000 },
            { card: "BT1-010", as: "other", dp: 9000 },
          ],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("geo").permanentId,
        instanceId: s.inst("rize").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("geo").topCard?.cardId === "EX4-009" && s.perm("target").currentDP === 5000);

    expect(s.state.memory).toBe(0);
    expect(s.perm("target").currentDP).toBe(5000);
    expect(s.perm("other").currentDP).toBe(9000);
    expect(observe(s.engine).securityDp(1)).toBe(-4000);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-012");
    expect(s.state.players[0]!.deck).toHaveLength(DRAW_DECK.length - 1);
    expect(s.perm("geo").stack.map(({ cardId }) => cardId)).toEqual(["EX4-007"]);

    await advance(s.engine).runTurn(0);
    expect(s.perm("target").currentDP).toBe(9000);
    expect(observe(s.engine).securityDp(1)).toBe(0);
  });

  it("Q3445 still reduces opposing Security Digimon when no field Digimon exists", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX4-007", as: "geo" }],
        hand: [{ card: "EX4-009", as: "rize" }],
        deck: ["BT1-012"],
      },
      1: { security: ["BT1-009"] },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("geo").permanentId,
        instanceId: s.inst("rize").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("geo").topCard?.cardId === "EX4-009");

    expect(observe(s.engine).securityDp(1)).toBe(-4000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("inherits the same reduction once per turn when an allied yellow Tamer suspends", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-007", as: "host", under: ["EX4-009"] },
            { card: "AD1-019", as: "yellowTamer" },
            { card: "BT1-085", as: "redTamer" },
            { card: "BT1-086", as: "blueTamer" },
          ],
          deck: DRAW_DECK,
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target", dp: 12000 },
            { card: "BT1-009", as: "other", dp: 12000 },
            { card: "BT1-085", as: "opponentRedTamer" },
          ],
          deck: DRAW_DECK,
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.turnSeat = 0;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);

    await advance(s.engine).verb.suspend([s.perm("yellowTamer").permanentId]);
    await settle(() => s.perm("target").currentDP === 8000);
    expect(s.perm("other").currentDP).toBe(12000);
    expect(observe(s.engine).securityDp(1)).toBe(-4000);

    await advance(s.engine).verb.suspend([s.perm("redTamer").permanentId]);
    await settle();
    expect(s.perm("target").currentDP).toBe(8000);
    expect(observe(s.engine).securityDp(1)).toBe(-4000);

    await advance(s.engine).verb.unsuspend([
      s.perm("redTamer").permanentId,
      s.perm("blueTamer").permanentId,
      s.perm("opponentRedTamer").permanentId,
    ]);
    await advance(s.engine).verb.suspend([s.perm("blueTamer").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("opponentRedTamer").permanentId]);
    await settle();
    expect(s.perm("target").currentDP).toBe(8000);

    closeMain(s, 0);
    await openMain(s, 1);
    closeMain(s, 1);
    await openMain(s, 0);
    expect(s.perm("target").currentDP).toBe(12000);
    expect(observe(s.engine).securityDp(1)).toBe(0);
    await advance(s.engine).verb.suspend([s.perm("redTamer").permanentId]);
    await settle(() => s.perm("target").currentDP === 8000);
    expect(observe(s.engine).securityDp(1)).toBe(-4000);
    await stopLoop(s, loop, 0);
  });
});
