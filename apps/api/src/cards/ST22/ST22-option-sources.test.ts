import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("ST22 Taomon and Maid Mode Option sources", () => {
  for (const sourceCard of ["ST22-04", "ST22-06"]) {
    for (const optionCard of ["ST22-09", "ST22-10"]) {
      it.each([true, false])(`${sourceCard} uses ${optionCard} only from a Tamer (Tamer=%s)`, async (underTamer) => {
        const s = setupEngine(
          {
            0: {
              battleArea: [
                { card: "ST3-12", as: "tamer", under: underTamer ? [{ card: optionCard, as: "option" }] : [] },
                { card: "ST22-02", as: "other", under: underTamer ? [] : [{ card: optionCard, as: "option" }] },
                ...(sourceCard === "ST22-04" ? [{ card: sourceCard, as: "source" }] : []),
              ],
              hand: sourceCard === "ST22-06" ? [{ card: sourceCard, as: "source" }] : [],
              deck: ["BT1-002", "BT1-002"],
            },
            1: { security: ["ST1-02", "ST1-02"] },
          },
          { autoAcceptOptional: true, autoSelectCards: true },
        );
        s.state.memory = 10;
        await s.ready();
        const optionId = s.inst("option").instanceId;
        const result =
          sourceCard === "ST22-04"
            ? s.engine.applyIntent(0, {
                type: "attack",
                attackerPermanentId: s.perm("source").permanentId,
                target: { kind: "player" },
              })
            : s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId });
        expect(result).toEqual({ ok: true });
        if (sourceCard === "ST22-04") {
          await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 1);
        } else {
          await (s.engine as unknown as { mainVerbChain: Promise<void> }).mainVerbChain;
        }
        expect(s.state.players[1]!.security).toHaveLength(sourceCard === "ST22-04" ? 1 : 2);
        const host = s.perm(underTamer ? "tamer" : "other");
        expect(host.stack.some((card) => card.instanceId === optionId)).toBe(!underTamer);
        const used =
          optionCard === "ST22-09"
            ? s.state.players[0]!.battleArea.some((p) => p.linked.some((card) => card.instanceId === optionId))
            : s.state.players[0]!.security.some((card) => card.instanceId === optionId);
        expect(used).toBe(underTamer);
      });
    }
  }
});
