import { EffectDuration, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX11 playing link cards and rule checks (Q5850/Q5878)", () => {
  it.each(["EX11-033", "EX11-042"])(
    "%s cannot restore a zero-DP host through the played Maquinamon's On Play",
    async (cardId) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: cardId, as: "host", linked: [{ card: "EX11-027", as: "material" }] }],
            deck: ["EX11-073", "BT1-009", "BT1-010"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      const host = s.perm("host");
      const materialId = s.inst("material").instanceId;
      // Isolate the pre-existing DP reduction in the ruling; drive the actual card's
      // evolution window after laying out the resulting level-5 stack.
      await advance(s.engine).verb.modifyDP(host.permanentId, -7000, EffectDuration.UntilEachTurnEnd);
      await advance(s.engine).recompute();
      expect(host.currentDP).toBe(2000);
      await advance(s.engine).fire(EffectTiming.WhenDigivolving, host);
      expect(s.state.players[0]!.trash.some((card) => card.cardId === cardId)).toBe(true);
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === host.permanentId)).toBe(
        false,
      );
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === materialId)).toBe(
        true,
      );
      expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX11-073")).toBe(true);
      assertNoLoudGap(s);
    },
  );
  it.each(["EX11-033", "EX11-042"])(
    "%s keeps a positive-DP host available for the played card's later link",
    async (cardId) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: cardId, as: "host", linked: [{ card: "EX11-027", as: "material" }] }],
            deck: ["EX11-073", "BT1-009", "BT1-010"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      const host = s.perm("host");
      const materialId = s.inst("material").instanceId;
      await advance(s.engine).verb.modifyDP(host.permanentId, -6000, EffectDuration.UntilEachTurnEnd);
      await advance(s.engine).recompute();
      expect(host.currentDP).toBe(3000);
      await advance(s.engine).fire(EffectTiming.WhenDigivolving, host);
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === host.permanentId)).toBe(true);
      expect(host.linked.map((card) => card.instanceId)).toContain(materialId);
      expect(host.currentDP).toBe(3000);
      expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX11-073")).toBe(true);
      assertNoLoudGap(s);
    },
  );
});
