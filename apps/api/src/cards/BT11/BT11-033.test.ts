import { compiledEffects, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectiveCopyLimit } from "../../engine/banlistRestrictions.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-033.js";

describe("BT11-033 MirageGaogamon", () => {
  it("matches the catalog, current restriction, and both complete executable contracts", () => {
    expect(getCardDefinition("BT11-033")).toMatchObject({
      cardId: "BT11-033",
      nameEn: "MirageGaogamon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Blue", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Beast Knight"],
    });
    expect(effectiveCopyLimit("BT11-033")).toBe(1);
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            { kind: "Return", to: "hand" },
            {
              kind: "SecurityManipulation",
              op: "toHand",
              controller: "opponent",
              source: "securityTop",
              condition: { kind: "lastEffectDidNotAct" },
            },
          ],
        },
        {
          trigger: "AllTurns",
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenEffectAddsToOpponentHand",
              actions: [{ kind: "GainMemory", amount: 1, scaling: { per: 4, unit: "cards" } }],
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
    expect(compiledEffects["BT11-033"]).toEqual(compiled);
  });

  it("evolves for 4, returns the exact level-5 boundary, and gains memory from the resulting fourth card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-028", as: "base" }],
          hand: [{ card: "BT11-033", as: "mirage" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT11-028", as: "level5" }],
          hand: ["BT1-010", "BT1-011", "BT1-012"],
          security: [{ card: "BT1-090", as: "security" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const targetId = s.inst("level5").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mirage").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some(({ instanceId }) => instanceId === targetId));

    expect(s.perm("base").topCard.cardId).toBe("BT11-033");
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toContain(s.inst("security").instanceId);
    expect(s.state.memory).toBe(7);
  });

  it("uses the security fallback above level 5 without activating that card's Security effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-028", as: "base" }],
          hand: [{ card: "BT11-033", as: "mirage" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [{ card: "AD1-025", as: "level7" }],
          security: [{ card: "BT1-090", as: "security" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mirage").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some(({ instanceId }) => instanceId === s.inst("security").instanceId));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(6);
  });

  it("gains floor(hand size / 4) memory using the live post-add hand size", async () => {
    for (const [handSize, expectedGain] of [
      [3, 0],
      [4, 1],
      [7, 1],
      [8, 2],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT11-033", as: "mirage" }] },
        1: { hand: Array.from({ length: handSize }, () => "BT1-010") },
      });
      s.state.memory = 0;
      await s.ready();

      await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });
      expect(s.state.memory).toBe(expectedGain);
    }
  });

  it("ignores additions to its controller's hand and resolves only once per turn", async () => {
    const direction = setupEngine({
      0: { battleArea: [{ card: "BT11-033", as: "mirage" }], hand: Array.from({ length: 8 }, () => "BT1-010") },
    });
    direction.state.memory = 0;
    await direction.ready();
    await advance(direction.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 0 });
    expect(direction.state.memory).toBe(0);

    const frequency = setupEngine({
      0: { battleArea: [{ card: "BT11-033", as: "mirage" }], deck: ["BT1-001", "BT1-002"] },
      1: { hand: Array.from({ length: 8 }, () => "BT1-010"), deck: ["BT1-001", "BT1-002"] },
    });
    frequency.state.memory = 3;
    const firstTurn = frequency.engine.runOneTurn();
    await advance(frequency.engine).waitForMainPhase(0);
    await advance(frequency.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });
    await advance(frequency.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });
    expect(frequency.state.memory).toBe(5);
    advance(frequency.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    frequency.state.turnSeat = 1;
    frequency.state.memory = 3;
    const nextTurn = frequency.engine.runOneTurn();
    await advance(frequency.engine).waitForMainPhase(1);
    await advance(frequency.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });
    expect(frequency.state.memory).toBe(1);
    advance(frequency.engine).endMainPhaseIfOpen(1);
    await nextTurn;
  });
});
