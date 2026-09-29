import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { type BoardSpec, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT9-084.js";
import "./BT9-084.js";
import "../BT12/BT12-059.js";

const FILLER = ["BT1-009", "BT1-009", "BT1-009", "BT1-009"];

async function memoryGainedAtStartOfTurn(board: BoardSpec): Promise<number> {
  const s = setupEngine(board);
  s.state.memory = 0;
  await s.ready();
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  const gained = s.state.memory;
  advance(s.engine).endMainPhaseIfOpen(0);
  await turn;
  return gained;
}

describe("BT9-084 Tai Kamiya & Kari Kamiya", () => {
  it("matches catalog values and the independent memory, DP, and security IR", () => {
    expect(getCardDefinition("BT9-084")).toMatchObject({
      colors: ["Red", "Yellow"],
      kinds: ["Tamer"],
      playCost: 4,
      securityEffectText: "[Security] Play this card without paying its memory cost.",
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "StartOfYourTurn",
          actions: [
            { kind: "GainMemory", condition: { kind: "zoneCount", seat: "mine", value: 3 } },
            { kind: "GainMemory", condition: { kind: "zoneCount", seat: "opponent", value: 3 } },
          ],
        },
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenAttacking",
              sourceFilter: { colors: ["Red", "Yellow"] },
              actions: [{ kind: "ModifySecurityDP", amount: -2000, duration: "forTheTurn", cost: { kind: "suspend" } }],
            },
          ],
        },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] },
      ],
    });
  });

  it("independently gains memory for each player at 3 or fewer security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT9-084", as: "tamer" }], security: ["BT1-001"] },
      1: { security: ["BT1-002"] },
    });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tamer"));
    expect(s.state.memory).toBe(2);
  });

  it("may suspend to give all opposing Security Digimon -2000 DP for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT9-084", as: "tamer" },
            { card: "BT9-008", as: "attacker" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("attacker").permanentId });
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(observe(s.engine).securityDp(1)).toBe(-2000);
  });
});

describe("BT9-084 Tai Kamiya & Kari Kamiya — KB Q&A rulings", () => {
  it("gains 2 memory at the start of the turn when both players have 3 or fewer security cards (Q1887)", async () => {
    const tamer = { card: "BT9-084" };
    const bothLow = await memoryGainedAtStartOfTurn({
      0: { battleArea: [tamer], deck: FILLER, security: 3 },
      1: { deck: FILLER, security: 3 },
    });
    const onlyMineLow = await memoryGainedAtStartOfTurn({
      0: { battleArea: [tamer], deck: FILLER, security: 3 },
      1: { deck: FILLER, security: 4 },
    });
    expect(bothLow).toBe(2);
    expect(onlyMineLow).toBe(1);
  });

  it("lets a revealed [Tai Kamiya] Tamer, including this card, be added to hand (Q2189)", async () => {
    for (const taiKamiya of ["BT9-084", "BT5-093", "P-012"]) {
      const s = setupEngine(
        {
          0: {
            hand: [{ card: "BT12-059", as: "agumon" }],
            deck: ["BT9-085", taiKamiya, "BT1-009", "BT1-011"],
          },
        },
        { autoSelectCards: true, autoOrderTriggers: true },
      );
      s.state.memory = 5;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === taiKamiya));
      const hand = s.state.players[0]!.hand.map(({ cardId }) => cardId);
      expect(hand).toEqual([taiKamiya]);
      expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toContain("BT9-085");
    }
  });
});
