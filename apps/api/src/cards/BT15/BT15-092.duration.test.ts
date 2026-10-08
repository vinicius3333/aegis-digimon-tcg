import { type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const deck = ["BT1-009", "BT1-009", "BT1-009", "BT1-009"];
const automation = { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true };

describe("GitHub #5344 — Revelation duration follows the effect owner", () => {
  for (const owner of [0, 1] as const) {
    const opponent = (1 - owner) as Seat;

    it(`expires after the seat ${owner} Mistymon digivolution/attack chain crosses memory`, async () => {
      const duringAttack: number[] = [];
      const s = setupEngine(
        {
          [owner]: {
            battleArea: [{ card: "BT18-036", as: "host" }],
            hand: [{ card: "EX13-033", as: "mistymon" }],
            security: ["BT15-092", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
            deck,
          },
          [opponent]: {
            battleArea: [{ card: "BT1-024", as: "present", dp: 20000 }],
            hand: [{ card: "BT1-024", as: "late" }],
            security: ["BT1-024", "BT1-024"],
            deck,
          },
        },
        {
          ...automation,
          onEvent: (event): void => {
            if (event.kind === "securityChecked") duringAttack.push(s.perm("present").currentDP);
          },
        },
      );
      s.state.turnSeat = owner;
      s.state.memory = 0;
      await s.ready();
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(owner);
      expect(
        s.engine.applyIntent(owner, {
          type: "digivolve",
          permanentId: s.perm("host").permanentId,
          instanceId: s.inst("mistymon").instanceId,
          useAlternateCost: true,
          alternateRequirementIndex: 0,
        }),
      ).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(opponent);
      expect(s.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ kind: "effectResolved", sourceCardId: "BT15-092", timing: "OnDiscardSecurity" }),
          expect.objectContaining({
            kind: "securityChecked",
            battle: expect.objectContaining({ securityCardDP: 5000 }),
          }),
        ]),
      );
      expect(duringAttack).toEqual([9000]);
      expect(s.perm("present").currentDP).toBe(20000);
      expect(s.state.players[opponent]!.securityDpDelta).toBe(0);
      expect(s.engine.applyIntent(opponent, { type: "playCard", instanceId: s.inst("late").instanceId })).toEqual({
        ok: true,
      });
      await settle(() =>
        s.state.players[opponent]!.battleArea.some(
          (p) => p.topCard.cardId === "BT1-024" && p.permanentId !== s.perm("present").permanentId,
        ),
      );
      expect(s.perm("late").currentDP).toBe(10000);
      assertNoLoudGap(s);
      expect(s.engine.applyIntent(owner, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    });

    it(`expires even when first activated in seat ${owner}'s actual End of Turn window`, async () => {
      const s = setupEngine(
        {
          [owner]: { battleArea: ["BT8-081"], security: ["BT15-092", "BT1-009"], deck },
          [opponent]: { battleArea: [{ card: "BT1-024", as: "present" }], deck },
        },
        automation,
      );
      s.state.turnSeat = owner;
      await s.ready();
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(owner);
      expect(s.engine.applyIntent(owner, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(opponent);
      expect(s.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ kind: "effectResolved", sourceCardId: "BT8-081" }),
          expect.objectContaining({ kind: "effectResolved", sourceCardId: "BT15-092", timing: "OnDiscardSecurity" }),
        ]),
      );
      expect(s.perm("present").currentDP).toBe(10000);
      expect(s.state.players[opponent]!.securityDpDelta).toBe(0);
      assertNoLoudGap(s);
      expect(s.engine.applyIntent(owner, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    });

    it(`keeps seat ${owner}'s opponent-turn activation through the owner's next turn`, async () => {
      const s = setupEngine(
        {
          [owner]: { security: ["BT15-092", "BT1-009"], deck },
          [opponent]: {
            battleArea: [{ card: "BT1-024", as: "attacker" }],
            hand: [{ card: "BT1-024", as: "late" }],
            deck,
          },
        },
        automation,
      );
      s.state.turnSeat = opponent;
      s.state.memory = 10;
      await s.ready();
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(opponent);
      expect(
        s.engine.applyIntent(opponent, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((e) => e.kind === "attackEnded"));
      expect(s.perm("attacker").currentDP).toBe(5000);
      expect(s.state.players[opponent]!.securityDpDelta).toBe(-5000);
      expect(s.engine.applyIntent(opponent, { type: "playCard", instanceId: s.inst("late").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[opponent]!.battleArea.length === 2 && s.state.pendingDecision === undefined);
      expect(s.perm("late").currentDP).toBe(5000);
      await advance(s.engine).waitForMainPhase(owner);
      expect(s.perm("attacker").currentDP).toBe(5000);
      expect(s.perm("late").currentDP).toBe(5000);
      expect(s.state.players[opponent]!.securityDpDelta).toBe(-5000);
      expect(s.engine.applyIntent(owner, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(opponent);
      expect(s.perm("attacker").currentDP).toBe(10000);
      expect(s.perm("late").currentDP).toBe(10000);
      expect(s.state.players[opponent]!.securityDpDelta).toBe(0);
      assertNoLoudGap(s);
      expect(s.engine.applyIntent(owner, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    });
  }
});
