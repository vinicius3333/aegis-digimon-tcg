import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { syncPublicCounts } from "../../engine/state/visibility.js";
import "../index.js";

describe("GitHub #5299 Ravemon bottom security public intents", () => {
  for (const { handCount, decline, placed } of [
    { handCount: 8, decline: false, placed: true },
    { handCount: 9, decline: false, placed: false },
    { handCount: 8, decline: true, placed: false },
    { handCount: 0, decline: false, placed: true },
  ]) {
    it(`keeps top order and hidden identities after public self-deletion: hand ${handCount}, decline ${decline}`, async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT26-076", as: "crowmon" }],
            hand: [{ card: "BT26-082", as: "ravemon" }],
            deck: ["BT1-011"],
            security: [
              { card: "BT26-089", as: "publicTop", faceUp: true },
              { card: "BT1-010", as: "hidden" },
            ],
          },
          1: { hand: Array.from({ length: handCount }, () => "BT1-010") },
        },
        {
          autoAcceptOptional: true,
          autoSelectCards: true,
          autoChooseOption: true,
          declinePrompts: decline ? ["Place 1 card(s) as your security"] : [],
        },
      );
      await s.ready();
      s.state.memory = 10;
      const ravemonId = s.inst("ravemon").instanceId;
      const topId = s.inst("publicTop").instanceId;
      const hiddenId = s.inst("hidden").instanceId;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("crowmon").permanentId,
          instanceId: ravemonId,
          alternateRequirementIndex: 0,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.pendingDecision === undefined);

      const player = s.state.players[0]!;
      expect(s.state.players[1]!.hand).toHaveLength(Math.max(0, handCount - 1));
      expect(player.security.map(({ instanceId }) => instanceId)).toEqual(
        placed ? [topId, hiddenId, ravemonId] : [topId, hiddenId],
      );
      expect(player.trash.some(({ instanceId }) => instanceId === ravemonId)).toBe(!placed);
      syncPublicCounts(s.state);
      expect(player.securityView.map(({ cardId, instanceId, faceUp }) => ({ cardId, instanceId, faceUp }))).toEqual([
        { cardId: "BT26-089", instanceId: topId, faceUp: true },
        { cardId: "", instanceId: "", faceUp: false },
        ...(placed ? [{ cardId: "BT26-082", instanceId: ravemonId, faceUp: true }] : []),
      ]);
      expect(s.state.pendingDecision).toBeUndefined();
    });
  }

  it("checks the existing hidden top before the face-up bottom Ravemon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", as: "attacker" }] },
      1: {
        security: [
          { card: "BT1-010", as: "hiddenTop" },
          { card: "BT26-082", as: "ravemon", faceUp: true },
        ],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("hiddenTop").instanceId);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("ravemon").instanceId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
