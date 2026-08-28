import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-097.js";

describe("BT12-097 handwritten module", () => {
  it("registers its printed OnStartMainPhase effect without declarative effect record", () => {
    const module = getEffectModule("BT12-097");
    expect(module?.cardId).toBe("BT12-097");
    const source = {
      instanceId: "source-097",
      cardId: "BT12-097",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnStartMainPhase, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.None, source).length).toBeGreaterThan(0);
  });

  it("places a Save Digimon from trash under Ryoma when the stack has two or fewer cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-097", as: "ryoma" }],
          trash: [{ card: "BT12-008", as: "save" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("ryoma"));
    await settle(() => s.perm("ryoma").stack.some(({ cardId }) => cardId === "BT12-008"));
    expect(s.perm("ryoma").stack.map(({ cardId }) => cardId)).toContain("BT12-008");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).not.toContain("BT12-008");
  });

  it("does not load a third card when two cards are already under Ryoma", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-097", as: "ryoma", under: ["BT12-008", "BT12-008"] }],
          trash: [{ card: "BT12-008", as: "save" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("ryoma"));
    expect(s.perm("ryoma").stack).toHaveLength(3);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).not.toContain("BT12-008");
  });

  it("plays Ryoma from security without paying its memory cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT12-097", as: "ryoma", faceUp: true }] } });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("ryoma"));

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-097")).toBe(true);
  });
});

// BT12-097 Ryoma Mogami is the only card still running the handwritten Save-Tamer reducer:
//   "[Your Turn] If one of your Digimon digivolves into a Digimon card with <Save> in its text,
//    by suspending this Tamer and placing 1 card from under one of your Tamers under that
//    Digimon as one of its digivolution cards, reduce the digivolution cost by 1."
//
// The engine activates every eligible interactive reduction on its own, so the only place the
// controller can decline this cost is the card pick. Picking nothing must leave the Tamer
// unsuspended and the digivolution at full price.
const RYOMA = "BT12-097";
const SAVE_DIGIMON = "BT10-075"; // Damemon — purple Lv.4 with <Save>, digivolves from purple Lv.3
const PURPLE_LV3 = "BT10-071"; // Gazimon

function board() {
  return {
    0: {
      battleArea: [
        { card: RYOMA, as: "ryoma", under: [{ card: SAVE_DIGIMON, as: "underCard" }] },
        { card: PURPLE_LV3, as: "host" },
      ],
      hand: [{ card: SAVE_DIGIMON, as: "evolver" }],
    },
  };
}

describe("BT12-097 Save digivolve reducer", () => {
  it("suspends the Tamer and reduces the cost when the placement is taken", async () => {
    const s = setupEngine(board(), { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ryoma").isSuspended);

    expect(s.perm("ryoma").isSuspended).toBe(true);
    expect(s.state.memory).toBe(-1); // printed cost 2, reduced to 1
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("underCard").instanceId)).toBe(true);
  });

  it("leaves the Tamer unsuspended and charges full cost when the placement is declined", async () => {
    const s = setupEngine(board());
    await s.ready();
    s.state.memory = 0;

    // No auto responders: answer the reducer's card pick with an empty selection (the decline).
    // `settle` only drains microtasks, so the responder has to run on the same queue.
    const answered = new Set<string>();
    const answerPending = (): void => {
      for (const { seat, req } of s.decisions) {
        if (req.kind !== "selectCards" || answered.has(req.decisionId)) continue;
        answered.add(req.decisionId);
        s.engine.applyIntent(seat, {
          type: "respondDecision",
          decisionId: req.decisionId,
          response: { kind: "selectCards", instanceIds: [] },
        });
      }
    };

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    for (let tick = 0; tick < 2000; tick += 1) {
      await Promise.resolve();
      answerPending();
    }

    expect(answered.size).toBeGreaterThan(0);
    expect(s.perm("ryoma").isSuspended).toBe(false);
    expect(s.state.memory).toBe(-2); // full printed cost 2
    expect(s.perm("ryoma").stack.some((card) => card.instanceId === s.inst("underCard").instanceId)).toBe(true);
  });
});
