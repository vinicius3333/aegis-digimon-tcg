import { CardColor, EffectDuration, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../engine/testkit/advance.js";
import { settle, setupEngine } from "../engine/testkit/harness.js";
import { enumerateMainPhaseCandidates } from "./candidates.js";
import { buildBotView } from "./view.js";
import "../cards/index.js";

for (const seat of [0, 1] as const) {
  describe(`authoritative play affordances seat ${seat}`, () => {
    const opponent = seat === 0 ? 1 : 0;

    async function rewrittenBoard(extraBlue: boolean) {
      const s = setupEngine(
        {
          [seat]: {
            battleArea: [{ card: "BT16-025", as: "victim" }, ...(extraBlue ? [{ card: "BT1-028", as: "blue" }] : [])],
            breeding: "BT12-047",
            hand: [{ card: "BT17-097", as: "option" }],
            deck: Array(6).fill("BT1-009"),
            security: ["BT1-009"],
          },
          [opponent]: {
            hand: [{ card: "EX13-031", as: "king" }, "BT3-061"],
            deck: Array(6).fill("BT1-009"),
            security: ["BT1-009"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.turnSeat = opponent;
      s.state.memory = 10;
      await s.ready();
      expect(s.engine.applyIntent(opponent, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.perm("victim").currentDP === 3000 && s.state.pendingDecision === undefined);
      expect(s.engine.effectiveColorsOf(s.perm("victim"))).toEqual([CardColor.White]);
      s.state.turnSeat = seat;
      s.state.phase = Phase.Main;
      s.state.memory = 10;
      await s.ready();
      return s;
    }

    it.each([false, true])(
      "counts an independent Blue source after KingSukamon's rewrite (present=%s)",
      async (blue) => {
        const s = await rewrittenBoard(blue);
        const instanceId = s.inst("option").instanceId;
        const candidates = enumerateMainPhaseCandidates(buildBotView(s.state, seat)!);
        expect(s.inst("option").playableFromHand).toBe(blue);
        expect(candidates.some(({ intent }) => intent.type === "playCard" && intent.instanceId === instanceId)).toBe(
          blue,
        );
        const result = s.engine.applyIntent(seat, { type: "playCard", instanceId });
        expect(result).toEqual(blue ? { ok: true } : { ok: false, reason: "color-requirement-unmet" });
      },
    );

    it("offers the Option again after the rewrite expires", async () => {
      const s = await rewrittenBoard(false);
      expect(s.inst("option").playableFromHand).toBe(false);
      const turn = s.engine.runOneTurn();
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(seat);
      advance(s.engine).endMainPhaseIfOpen(seat);
      await turn;
      await settle(() => s.perm("victim").originalColorsOverride.length === 0);
      s.state.turnSeat = seat;
      s.state.memory = 10;
      const nextTurn = s.engine.runOneTurn();
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(seat);
      const instanceId = s.inst("option").instanceId;
      expect(s.inst("option").playableFromHand).toBe(true);
      expect(enumerateMainPhaseCandidates(buildBotView(s.state, seat)!)).toContainEqual(
        expect.objectContaining({ intent: { type: "playCard", instanceId } }),
      );
      expect(s.engine.applyIntent(seat, { type: "playCard", instanceId })).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined);
      advance(s.engine).endMainPhaseIfOpen(seat);
      await nextTurn;
    });

    it("uses an authoritative color waiver even with no printed Blue source", async () => {
      const s = setupEngine({ [seat]: { hand: [{ card: "BT17-097", as: "option" }] } }, { autoDeclineOptional: true });
      s.state.turnSeat = seat;
      s.state.memory = 10;
      await s.ready();
      const instanceId = s.inst("option").instanceId;
      expect(s.inst("option").playableFromHand).toBe(false);
      // Arm the production waiver ledger: this fixture has no card that produces the grant.
      advance(s.engine).ledgers.continuous.addColorWaiver(instanceId, EffectDuration.UntilEachTurnEnd);
      await s.ready();
      expect(s.inst("option").playableFromHand).toBe(true);
      expect(enumerateMainPhaseCandidates(buildBotView(s.state, seat)!)).toContainEqual(
        expect.objectContaining({ intent: { type: "playCard", instanceId } }),
      );
      expect(s.engine.applyIntent(seat, { type: "playCard", instanceId })).toEqual({ ok: true });
    });
  });
}
