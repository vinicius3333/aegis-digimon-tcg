import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { type BoardSpec, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-085.js";
import "./BT9-085.js";

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

describe("BT9-085 Matt Ishida & Sora Takenouchi", () => {
  it("matches catalog values and the independent hand, unsuspend, and security IR", () => {
    expect(getCardDefinition("BT9-085")).toMatchObject({
      colors: ["Blue", "Red"],
      kinds: ["Tamer"],
      playCost: 4,
      securityEffectText: "[Security] Play this card without paying its memory cost.",
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "StartOfYourMainPhase",
          actions: [
            { kind: "GainMemory", condition: { kind: "zoneCount", seat: "mine", zone: "hand", value: 8 } },
            { kind: "GainMemory", condition: { kind: "zoneCount", seat: "opponent", zone: "hand", value: 8 } },
          ],
        },
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenUnsuspended",
              sourceFilter: { colors: ["Red", "Blue"] },
              actions: [
                {
                  kind: "Return",
                  to: "hand",
                  optional: true,
                  cost: { kind: "suspend" },
                  target: { filter: { levels: [3] } },
                },
              ],
            },
          ],
        },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] },
      ],
    });
  });

  it("independently gains memory for each player with 8 or more cards in hand", async () => {
    const eight = Array.from({ length: 8 }, () => "BT1-001");
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-085", as: "tamer" }], hand: eight }, 1: { hand: eight } });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tamer"));
    expect(s.state.memory).toBe(2);
  });

  it("may suspend when a blue or red Digimon unsuspends to return an opposing level 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT9-085", as: "tamer" },
            { card: "BT9-008", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "BT1-028", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetInstanceId = s.perm("target").topCard!.instanceId;
    await advance(s.engine).fireSubTrigger("whenUnsuspended", { unsuspendedPermanentId: s.perm("ally").permanentId });
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetInstanceId)).toBe(true);
  });
});

describe("BT9-085 Matt Ishida & Sora Takenouchi — KB Q&A rulings", () => {
  it("gains 2 memory at the start of the main phase when both players have 8 or more cards in hand (Q1888)", async () => {
    const tamer = { card: "BT9-085" };
    const eight = Array.from({ length: 8 }, () => "BT1-009");
    const seven = eight.slice(1);
    const bothFull = await memoryGainedAtStartOfTurn({
      0: { battleArea: [tamer], hand: eight, deck: FILLER, security: 3 },
      1: { hand: eight, deck: FILLER, security: 3 },
    });
    const onlyMineFull = await memoryGainedAtStartOfTurn({
      0: { battleArea: [tamer], hand: eight, deck: FILLER, security: 3 },
      1: { hand: seven, deck: FILLER, security: 3 },
    });
    expect(bothFull).toBe(2);
    expect(onlyMineFull).toBe(1);
  });

  it("activates [Your Turn] when a blue or red Digimon unsuspends in the unsuspend phase (Q1889)", async () => {
    async function runTurnWithSuspended(allyCardId: string) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT9-085", as: "tamer" },
              { card: allyCardId, as: "ally", suspended: true },
            ],
            deck: FILLER,
            security: 3,
          },
          1: { battleArea: [{ card: "BT1-028", as: "target" }], deck: FILLER, security: 3 },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 0;
      await s.ready();
      const targetInstanceId = s.perm("target").topCard!.instanceId;
      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      const outcome = {
        allySuspended: s.perm("ally").isSuspended,
        tamerSuspended: s.perm("tamer").isSuspended,
        targetReturned: s.state.players[1]!.hand.some((card) => card.instanceId === targetInstanceId),
      };
      advance(s.engine).endMainPhaseIfOpen(0);
      await turn;
      return outcome;
    }

    expect(await runTurnWithSuspended("BT1-009")).toEqual({
      allySuspended: false,
      tamerSuspended: true,
      targetReturned: true,
    });
    expect(await runTurnWithSuspended("BT1-048")).toEqual({
      allySuspended: false,
      tamerSuspended: false,
      targetReturned: false,
    });
  });
});
