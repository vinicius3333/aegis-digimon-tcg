import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { compiled } from "./BT21-062.js";
import "./BT21-098.js";
import "../index.js";

// A3 for BT21-062 (Galacticmon) — [Start of Your Main Phase]:
//   "Delete 1 of your opponent's Digimon."
//
// FAILS-WHEN-REVERTED: with BT21-062 on the field, firing OnStartMainPhase on seat 0's
// turn deletes one of seat 1's Digimon. The IR's StartOfYourMainPhase Delete action and
// the [When Digivolving] Option-use clause both run through the interpreter.
//
// The [When Digivolving] Ragnarok Cannon clause (placing 4 Vemmon-in-text from trash
// to digivolution stack, then using Ragnarok Cannon from hand/trash free) is also
// tested to verify the Option-use path is executable.

const GALACTICMON = "BT21-062";
const PLAIN_DIGIMON = "BT1-009"; // Monodramon — playCost 2, opponent target for delete
const module = getEffectModule(GALACTICMON)!;

function fireTiming(s: EngineSetup, timing: EffectTiming, trigger: Record<string, unknown> = {}): Promise<void> {
  return (
    s.engine as unknown as {
      fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
    }
  ).fireTiming(timing, trigger);
}

describe("BT21-062 [Start of Your Main Phase] delete 1 opponent Digimon", () => {
  it("registers all three printed timings and the Snatchmon evolution route", () => {
    expect(module.effectsForTiming(EffectTiming.WhenDigivolving, {} as never)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.OnStartMainPhase, {} as never)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.OnEnterFieldAnyone, {} as never)).toHaveLength(0);
    expect(module.cardId).toBe(GALACTICMON);
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Snatchmon"], cost: 9, isAlternate: true }]);
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "UseOptionWithoutCost",
      filter: {
        controller: "mine",
        kind: ["Option"],
        playCostLte: 99,
        nameOrTrait: [{ tokens: ["Ragnarok Cannon"], match: "nameExact" }],
      },
      from: ["hand", "trash"],
      payCost: false,
      allowCostWithoutTarget: true,
    });
    expect(compiled.coverage).toBe("full");
  });

  it("deletes one of the opponent's Digimon on start of main phase", async () => {
    const s = setupEngine(
      {
        // Galacticmon on seat 0's battle area.
        0: { battleArea: [{ card: GALACTICMON, dp: 12000 }] },
        // Seat 1 has a Digimon to be deleted.
        1: { battleArea: [{ card: PLAIN_DIGIMON, dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1];
    s.state.turnSeat = 0;

    await fireTiming(s, EffectTiming.OnStartMainPhase, {});
    for (let i = 0; i < 400 && p1?.battleArea.length !== 0; i++) await Promise.resolve();

    // Opponent's Digimon was deleted and moved to trash.
    expect(p1?.battleArea.length).toBe(0);
    expect(p1?.trash.length).toBeGreaterThanOrEqual(1);
  });

  it("does NOT delete when it is the opponent's turn ([Your Turn] gate)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: GALACTICMON, dp: 12000 }] },
        1: { battleArea: [{ card: PLAIN_DIGIMON, dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1; // opponent's turn
    const p1 = s.state.players[1];

    await fireTiming(s, EffectTiming.OnStartMainPhase, {});
    for (let i = 0; i < 50; i++) await Promise.resolve();

    // Opponent's Digimon should NOT be deleted (it's not seat 0's turn).
    expect(p1?.battleArea.length).toBe(1);
  });

  it("places exactly 4 Vemmon-text cards and uses Ragnarok Cannon for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GALACTICMON, as: "galacticmon" }],
          hand: [{ card: "BT21-098", as: "cannon" }],
          trash: [
            { card: "BT21-056", as: "vemmon1" },
            { card: "BT21-056", as: "vemmon2" },
            { card: "BT11-065", as: "vemmonText1" },
            { card: "BT11-065", as: "vemmonText2" },
          ],
        },
        1: { battleArea: [{ card: PLAIN_DIGIMON, as: "cannonTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await fireTiming(s, EffectTiming.WhenDigivolving, {
      subjectPermanentId: s.perm("galacticmon").permanentId,
    });
    for (let i = 0; i < 400 && s.perm("galacticmon").stack.length < 4; i++) await Promise.resolve();

    expect(s.perm("galacticmon").stack).toHaveLength(4);
    expect(s.state.players[0]?.hand.some((card) => card.instanceId === s.inst("cannon").instanceId)).toBe(false);
    expect(s.state.players[1]?.battleArea.length).toBeLessThanOrEqual(1);
  });

  it("pays the four-card Vemmon-text placement cost even with no legal Ragnarok target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GALACTICMON, as: "galacticmon" }],
          hand: [{ card: "BT21-098", as: "cannon" }],
          trash: ["BT21-056", "BT21-056", "BT11-065", "BT11-065"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("galacticmon"));
    await settle(() => s.perm("galacticmon").stack.length === 4);
    expect(s.perm("galacticmon").stack).toHaveLength(4);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cannon").instanceId)).toBe(false);
  });

  it.each([true, false])(
    "publicly evolves without any Ragnarok Cannon and may pay the four-card cost: %s",
    async (accept) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT21-058", as: "host", under: ["BT21-006", "BT21-056"] }],
            hand: [{ card: GALACTICMON, as: "evolution" }],
            deck: ["BT1-001"],
            trash: ["BT21-056", "BT21-056", "BT11-065", "BT11-065"],
          },
        },
        { autoAcceptOptional: accept, autoDeclineOptional: !accept, autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("host").permanentId,
          instanceId: s.inst("evolution").instanceId,
          alternateRequirementIndex: 0,
        }),
      ).toEqual({ ok: true });
      await settle();
      expect(s.perm("host").topCard.cardId).toBe(GALACTICMON);
      expect(s.state.memory).toBe(2);
      expect(s.perm("host").stack).toHaveLength(accept ? 7 : 3);
      expect(s.state.players[0]!.trash).toHaveLength(accept ? 0 : 4);
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-001"]);
    },
  );

  it("returns exactly 4 stacked Vemmon to deck bottom to prevent leaving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: GALACTICMON,
              as: "galacticmon",
              under: [
                { card: "BT21-056", as: "vemmon1" },
                { card: "BT21-056", as: "vemmon2" },
                { card: "BT21-056", as: "vemmon3" },
                { card: "BT21-056", as: "vemmon4" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const permanentId = s.perm("galacticmon").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([permanentId], "byEffect")).toBe(0);
    expect(s.state.players[0]?.battleArea.some((permanent) => permanent.permanentId === permanentId)).toBe(true);
    expect(s.state.players[0]?.deck.slice(-4).every((card) => card.cardId === "BT21-056")).toBe(true);
  });

  it("publicly builds the legal Snatchmon stack, then protects against an opponent Option deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-058", as: "snatchmon" }],
          hand: [{ card: GALACTICMON, as: "galacticmon" }],
          trash: ["BT21-056", "BT21-056", "BT21-056", "BT21-056"],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT2-055", as: "blackSource" }],
          hand: [{ card: "BT21-098", as: "cannon" }],
          deck: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("snatchmon").permanentId,
        instanceId: s.inst("galacticmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("snatchmon").topCard.cardId === GALACTICMON && s.perm("snatchmon").stack.length === 5);
    expect(s.perm("snatchmon").stack).toHaveLength(5);
    expect(s.state.memory).toBe(1);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("cannon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("snatchmon").stack.length === 1 &&
        s.state.players[0]!.deck.slice(-4).every((card) => card.cardId === "BT21-056"),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("snatchmon").permanentId),
    ).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(4);
    expect(s.perm("snatchmon").stack).toHaveLength(1);
    expect(s.state.players[0]!.deck.slice(-4).every((card) => card.cardId === "BT21-056")).toBe(true);
  });

  it("does not treat Snatchmon text as exact Vemmon names for leave prevention", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-058", as: "snatchmon" }],
          hand: [{ card: GALACTICMON, as: "galacticmon" }],
          trash: ["BT11-065", "BT11-065", "BT11-065", "BT11-065"],
        },
        1: { battleArea: [{ card: "BT2-055", as: "blackSource" }], hand: [{ card: "BT21-098", as: "cannon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("snatchmon").permanentId,
        instanceId: s.inst("galacticmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("snatchmon").topCard.cardId === GALACTICMON && s.perm("snatchmon").stack.length === 5);
    expect(s.perm("snatchmon").stack).toHaveLength(5);
    expect(s.state.memory).toBe(1);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("cannon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === GALACTICMON)).toBe(true);
  });

  it("Q4570 cannot partially place only three Vemmon-text cards to use Ragnarok Cannon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GALACTICMON, as: "galacticmon" }],
          hand: [{ card: "BT21-098", as: "cannon" }],
          trash: ["BT21-056", "BT21-056", "BT11-065"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("galacticmon"));

    expect(s.perm("galacticmon").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cannon").instanceId)).toBe(true);
  });

  it("Q4571 cannot prevent leaving with only three stacked Vemmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: GALACTICMON,
              as: "galacticmon",
              under: ["BT21-056", "BT21-056", "BT21-056"],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("galacticmon").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("alternate-digivolves from Snatchmon for 9", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-058", as: "snatchmon" }],
        hand: [{ card: GALACTICMON, as: "galacticmon" }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("snatchmon").permanentId,
        instanceId: s.inst("galacticmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    for (let i = 0; i < 400 && s.perm("snatchmon").topCard.instanceId !== s.inst("galacticmon").instanceId; i++) {
      await Promise.resolve();
    }

    expect(s.state.memory).toBe(1);
  });
});
