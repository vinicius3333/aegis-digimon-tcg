/* oxlint-disable vitest/no-conditional-expect -- Table rows state printed route contracts before observing game state. */
import { EffectDuration } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

// Official EX10-073 has separate Black Lv.5 and rainbow Ult. badges, both cost 5.
// https://world.digimoncard.com/cards/?card_no=EX10-073&search=true
// Japanese priority source: Black Lv.5, and 全 極 (all colors, Ult.) respectively.
const cases = [
  { base: "BT6-085", waiver: false, indexed: false, legal: false }, // White Ultimate ≠ Appmon Ult.
  { base: "BT6-061", waiver: false, indexed: false, legal: true }, // Black Lv.5, no Ult. form
  { base: "BT6-061", waiver: false, indexed: true, legal: false }, // Explicit Ult. route keeps its form gate
  { base: "EX10-029", waiver: false, indexed: false, legal: false }, // Black Sup., Lv.4
  { base: "BT6-085", waiver: true, indexed: false, legal: true }, // Genuine waiver drops only Black
  { base: "BT6-085", waiver: true, indexed: true, legal: false }, // Waiver doesn't grant Ult.
  { base: "EX10-029", waiver: true, indexed: false, legal: false }, // Waiver doesn't grant Lv.5
] as const;

describe("Deusmon ordinary level and form badges remain independent", () => {
  it.each(cases)("$base waiver=$waiver indexed=$indexed legal=$legal", async ({ base, waiver, indexed, legal }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [{ card: "EX10-073", as: "result" }],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 6;
    if (waiver) {
      advance(s.engine).ledgers.continuous.addColorWaiver(s.inst("result").instanceId, EffectDuration.UntilEachTurnEnd);
      await s.engine.recomputeContinuousEffects();
    }
    const player = s.state.players[0]!;
    const host = s.perm("base");
    const result = s.inst("result");
    const before = {
      top: host.topCard.instanceId,
      stack: host.stack.map(({ instanceId }) => instanceId),
      hand: player.hand.map(({ instanceId }) => instanceId),
      deck: player.deck.map(({ instanceId }) => instanceId),
      trash: player.trash.map(({ instanceId }) => instanceId),
      memory: s.state.memory,
    };
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: host.permanentId,
        instanceId: result.instanceId,
        ...(indexed ? { alternateRequirementIndex: 0 } : {}),
      }),
    ).toEqual(legal ? { ok: true } : { ok: false, reason: "invalid-evolution" });
    await settle(() => s.state.pendingDecision === undefined && (!legal || host.topCard.cardId === "EX10-073"));
    if (legal) {
      expect(host.topCard.cardId).toBe("EX10-073");
      expect(s.state.memory).toBe(1);
      expect(host.stack.map(({ instanceId }) => instanceId)).toEqual([before.top]);
      expect(player.deck).toHaveLength(before.deck.length - 1);
      expect(s.events).toContainEqual(
        expect.objectContaining({ kind: "digivolved", cardId: "EX10-073", mechanic: "normal" }),
      );
    } else {
      expect({
        top: host.topCard.instanceId,
        stack: host.stack.map(({ instanceId }) => instanceId),
        hand: player.hand.map(({ instanceId }) => instanceId),
        deck: player.deck.map(({ instanceId }) => instanceId),
        trash: player.trash.map(({ instanceId }) => instanceId),
        memory: s.state.memory,
      }).toEqual(before);
      expect(s.events.some((event) => event.kind === "digivolved")).toBe(false);
    }
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
