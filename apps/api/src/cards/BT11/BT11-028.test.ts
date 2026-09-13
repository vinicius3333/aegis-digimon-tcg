import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-028.js";
import "../BT15/BT15-090.js";

describe("BT11-028 MachGaogamon", () => {
  it("matches the catalog and carries both complete printed contracts", () => {
    expect(getCardDefinition("BT11-028")).toMatchObject({
      cardId: "BT11-028",
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
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            { kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "untilOpponentTurnEnd" },
            { kind: "ModifyDP", amount: 2000, duration: "untilOpponentTurnEnd", scaling: { per: 4 } },
          ],
        },
        {
          trigger: "AllTurns",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [{ kind: "SubTrigger", event: "whenEffectAddsToOpponentHand" }],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("gains Blocker and +2000 DP for every 4 cards in the opponent's hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-025", as: "base" }],
        hand: [{ card: "BT11-028", as: "mach" }],
        deck: ["BT1-009"],
      },
      1: { hand: Array.from({ length: 8 }, () => "BT1-009") },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mach").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").currentDP === 11000);

    expect(s.perm("base").currentDP).toBe(11000);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
  });

  it("gains Blocker even below four opposing hand cards while DP scaling floors by groups of four", async () => {
    for (const [handCount, expectedDP] of [
      [0, 7000],
      [3, 7000],
      [4, 9000],
      [7, 9000],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT11-025", as: "base" }], hand: [{ card: "BT11-028", as: "mach" }] },
        1: { hand: Array.from({ length: handCount }, () => "BT1-009") },
      });
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("mach").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT11-028");
      expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker"), `${handCount} cards`).toBe(true);
      expect(s.perm("base").currentDP, `${handCount} cards`).toBe(expectedDP);
    }
  });

  it("inherited effect unsuspends after a public Fox Fire bounce, only once that turn and again next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST2-10", as: "host", under: ["BT11-028"], suspended: true }],
          hand: [
            { card: "BT15-090", as: "firstFox" },
            { card: "BT15-090", as: "secondFox" },
            { card: "BT15-090", as: "thirdFox" },
          ],
          deck: Array.from({ length: 10 }, () => "BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstTarget" },
            { card: "BT1-009", as: "secondTarget" },
            { card: "BT1-009", as: "thirdTarget" },
          ],
          hand: Array.from({ length: 7 }, () => "BT1-009"),
          deck: Array.from({ length: 10 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    const firstTargetId = s.perm("firstTarget").permanentId;
    const secondTargetId = s.perm("secondTarget").permanentId;
    const thirdTargetId = s.perm("thirdTarget").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstFox").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[1]!.hand.some(({ instanceId }) => instanceId === s.inst("firstTarget").instanceId),
    );
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === firstTargetId)).toBe(false);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[1]!.hand).toHaveLength(8);

    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondFox").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[1]!.hand.some(({ instanceId }) => instanceId === s.inst("secondTarget").instanceId),
    );
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === secondTargetId)).toBe(false);
    expect(s.perm("host").isSuspended).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thirdFox").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[1]!.hand.some(({ instanceId }) => instanceId === s.inst("thirdTarget").instanceId),
    );
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === thirdTargetId)).toBe(false);
    expect(s.perm("host").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("does not unsuspend when an effect adds to its controller's hand", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-033", as: "host", under: ["BT11-028"], suspended: true }] },
    });
    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 0 });
    expect(s.perm("host").isSuspended).toBe(true);
  });
});
