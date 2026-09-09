import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-019.js";
import "../index.js";

describe("EX4-019 MachGaogamon — catalog and IR", () => {
  it("matches the catalog identity and both printed clauses", () => {
    expect(getCardDefinition("EX4-019")).toMatchObject({
      cardId: "EX4-019",
      nameEn: "MachGaogamon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Blue", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Cyborg"],
      effectText: "[When Digivolving] Return 1 of your opponent's level 4 or lower Digimon to its owner's hand.",
      inheritedEffectText:
        "[When Attacking][Once Per Turn] If your opponent has 8 or more cards in their hand, unsuspend this Digimon.",
    });
  });

  it("registers residual-free IR with the exact target boundary and once-per-turn identity", () => {
    expect(runtimeCompiledCard("EX4-019")).toMatchObject({ coverage: "full", residual: [] });
    expect(digivolutionRequirementsFor("EX4-019") ?? []).toEqual([]);
    expect(compiled.effects).toEqual([
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "Return",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
              count: 1,
            },
            to: "hand",
          },
        ],
      },
      {
        trigger: "WhenAttacking",
        actions: [
          {
            kind: "Unsuspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            condition: {
              kind: "zoneCount",
              seat: "opponent",
              zone: "hand",
              op: "gte",
              value: 8,
              raw: "your opponent has 8 or more cards in their hand",
            },
          },
        ],
        isInherited: true,
        frequency: "OncePerTurn",
      },
    ]);
    expect(compiled.effects?.[0]?.actions?.[0]).not.toHaveProperty("optional");
  });
});

describe("EX4-019 MachGaogamon — public evolution stack", () => {
  it("digivolves from a blue level 4 for 3, draws, returns exactly a level 4, and preserves source identity", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-032", as: "base" }],
          hand: [{ card: "EX4-019", as: "mach" }],
          deck: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT1-033", as: "level4" },
            { card: "BT1-038", as: "level5" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const targetInstanceId = s.perm("level4").topCard!.instanceId;
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mach").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard?.cardId === "EX4-019" &&
        s.state.players[1]!.battleArea.length === 1 &&
        s.state.players[1]!.hand.some(({ instanceId }) => instanceId === targetInstanceId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-013");
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-014"]);
    expect(s.perm("base").topCard?.instanceId).toBe(s.inst("mach").instanceId);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-032"]);
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(targetInstanceId);
    expect(s.perm("level5").topCard?.cardId).toBe("BT1-038");
  });

  it("rejects a red level 4 route without paying, drawing, or moving the source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-010", as: "wrongColor" }],
        hand: [{ card: "EX4-019", as: "mach" }],
        deck: ["BT1-013", "BT1-014"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongColor").permanentId,
        instanceId: s.inst("mach").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
    expect(s.perm("wrongColor").topCard?.cardId).toBe("BT4-010");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("mach").instanceId);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-013", "BT1-014"]);
  });
});

describe("EX4-019 MachGaogamon — inherited attack threshold and OPT reset", () => {
  it("unsuspends after a public attack at exactly eight opposing hand cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-038", as: "host", under: ["EX4-019"] }] },
      1: { hand: Array(8).fill("BT1-013"), security: ["BT1-014"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && !s.perm("host").isSuspended);

    expect(s.state.players[1]!.hand).toHaveLength(8);
    expect(s.perm("host").isSuspended).toBe(false);
  });

  it("does not unsuspend at seven opposing hand cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-038", as: "host", under: ["EX4-019"] }] },
      1: { hand: Array(7).fill("BT1-013"), security: ["BT1-014"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("resolves only once in a turn and becomes available again on the owner's next turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-038", as: "host", under: ["EX4-019"] }],
        deck: ["BT1-013", "BT1-014", "BT1-013"],
      },
      1: {
        hand: Array(8).fill("BT1-013"),
        deck: ["BT1-013", "BT1-014", "BT1-013"],
        security: ["BT1-014", "BT1-014", "BT1-014"],
      },
    });
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && !s.perm("host").isSuspended);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("host").isSuspended);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && !s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
