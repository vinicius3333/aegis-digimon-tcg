import { describe, expect, it } from "vitest";
import type { Seat } from "@aegis/shared";
import { drainMicrotasks, setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";
import "../cards/BT17/BT17-078.js";
import "../cards/AD1/AD1-004.js";
import "../cards/AD1/AD1-014.js";
import "../cards/BT10/BT10-008.js";
import "../cards/BT10/BT10-009.js";

// GH5346: exact physical duplicate routes, with real AD1 effects registered and
// manual responses to Omnimon's two distinct follow-up selections.
describe.each([0, 1] as const)("GH5346 defending seat %s", (seat) => {
  it.each([
    ["AD1-004", "AD1-014", 1, false],
    ["AD1-014", "AD1-004", 1, false],
    ["AD1-004", "AD1-014", 2, false],
    ["AD1-014", "AD1-004", 2, false],
    ["AD1-004", "AD1-014", 2, true],
    ["AD1-014", "AD1-004", 2, true],
  ] as const)("field %s / hand %s / copies %s / decline %s", async (field, hand, copies, decline) => {
    const attackerSeat: Seat = seat === 0 ? 1 : 0;
    const s = setupEngine({
      [seat]: {
        battleArea: Array.from({ length: copies }, (_, i) => ({ card: field, as: `field${i}` })),
        hand: [
          ...Array.from({ length: copies }, (_, i) => ({ card: hand, as: `hand${i}` })),
          { card: "BT17-078", as: "ace" },
          ...(copies === 2 ? [{ card: "BT17-078", as: "otherAce" }] : []),
        ],
        deck: ["BT1-010", "BT1-010"],
        security: ["BT1-010", "BT1-010"],
      },
      [attackerSeat]: {
        battleArea: [
          { card: "BT10-008", as: "attacker" },
          { card: "BT10-008", as: "survivor" },
          { card: "BT10-009", as: "returnA" },
          { card: "BT10-009", as: "returnB" },
        ],
        security: ["BT1-010"],
        deck: ["BT1-010"],
      },
    });
    s.state.turnSeat = attackerSeat;
    s.state.memory = 3;
    await s.ready();
    const own = s.state.players[seat]!;
    const enemy = s.state.players[attackerSeat]!;
    const selected = copies - 1;
    const fieldId = s.perm(`field${selected}`).permanentId;
    const fieldTop = s.inst(`field${selected}`).instanceId;
    const handId = s.inst(`hand${selected}`).instanceId;
    const aceId = s.inst("ace").instanceId;
    const handBefore = own.hand.map((c) => c.instanceId);
    const drawId = own.deck[0]!.instanceId;
    expect(
      s.engine.applyIntent(attackerSeat, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await drainMicrotasks(500);
    if (s.engine.combat.hasOpenBlockWindow) {
      expect(s.engine.applyIntent(seat, { type: "declineBlock" })).toEqual({ ok: true });
    }
    await settle(() => s.events.some((e) => e.kind === "counterWindowOpened"));
    const opened = s.events.find((e) => e.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("Missing Counter window");
    const routes = opened.eligibleCounters.filter((c) => c.instanceId === aceId);
    expect(routes).toHaveLength(copies * copies);
    const choice = routes.find((c) => c.effectKey.includes(fieldId) && c.effectKey.includes(handId))!;
    expect(choice).toBeDefined();
    const intent = { type: "respondCounter" as const, sourceInstanceId: aceId, effectKey: choice.effectKey };
    expect(s.engine.applyIntent(attackerSeat, intent).ok).toBe(false);
    expect(s.engine.applyIntent(seat, { ...intent, effectKey: `${choice.effectKey}:stale` }).ok).toBe(false);
    expect(own.hand.map((c) => c.instanceId)).toEqual(handBefore);
    expect(s.engine.applyIntent(seat, decline ? { type: "respondCounter" } : intent)).toEqual({ ok: true });
    if (!decline) {
      expect(s.engine.applyIntent(seat, intent).ok).toBe(false);
      for (const alias of ["returnA", "attacker"]) {
        await settle(() => s.state.pendingDecision !== undefined);
        const { seat: decidingSeat, req } = s.decisions.at(-1)!;
        expect(decidingSeat).toBe(seat);
        expect(req.kind).toBe("chooseTargets");
        const candidates = req.options?.candidateInstanceIds ?? [];
        const target = [s.inst(alias).instanceId, s.perm(alias).permanentId].find((id) => candidates.includes(id))!;
        expect(target).toBeDefined();
        expect(candidates).not.toContain(handId);
        expect(candidates).not.toContain(fieldTop);
        expect(
          s.engine.applyIntent(seat, {
            type: "respondDecision",
            decisionId: req.decisionId,
            response: { kind: "chooseTargets", instanceIds: [target] },
          }),
        ).toEqual({ ok: true });
        await settle(() => s.state.pendingDecision?.decisionId !== req.decisionId);
        expect(
          s.engine.applyIntent(seat, {
            type: "respondDecision",
            decisionId: req.decisionId,
            response: { kind: "chooseTargets", instanceIds: [target] },
          }).ok,
        ).toBe(false);
      }
    }
    await drainMicrotasks(500);
    if (s.engine.combat.hasOpenBlockWindow) {
      expect(s.engine.applyIntent(seat, { type: "declineBlock" })).toEqual({ ok: true });
    }
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined &&
        !s.engine.counterResolutionInFlight,
    );
    expect(s.events.filter((e) => e.kind === "counterWindowOpened")).toHaveLength(1);
    expect(s.events.filter((e) => e.kind === "counterResolved")).toEqual([
      expect.objectContaining({ activated: !decline }),
    ]);
    expect(s.events.filter((e) => e.kind === "actionRejected")).toHaveLength(0);
    expect(s.engine.applyIntent(seat, intent).ok).toBe(false);
    if (decline) {
      expect(own.hand.map((c) => c.instanceId)).toEqual(handBefore);
      expect(own.battleArea.map((p) => p.topCard.cardId)).toEqual(Array(copies).fill(field));
      expect(own.security).toHaveLength(1);
      expect(s.decisions).toHaveLength(0);
    } else {
      const result = own.battleArea.find((p) => p.topCard.instanceId === aceId)!;
      expect(result.stack.map((c) => c.instanceId)).toEqual(
        field === "AD1-004" ? [handId, fieldTop] : [fieldTop, handId],
      );
      expect(own.hand.map((c) => c.instanceId)).toEqual([
        ...handBefore.filter((id) => id !== handId && id !== aceId),
        drawId,
      ]);
      expect(own.battleArea.some((p) => p.permanentId === fieldId)).toBe(false);
      expect(own.battleArea).toHaveLength(copies);
      expect(enemy.deck.slice(-2).map((c) => c.instanceId)).toEqual([
        s.inst("returnA").instanceId,
        s.inst("returnB").instanceId,
      ]);
      expect(enemy.trash.map((c) => c.instanceId)).toContain(s.inst("attacker").instanceId);
      expect(enemy.battleArea.map((p) => p.topCard.instanceId)).toEqual([s.inst("survivor").instanceId]);
      expect(own.security).toHaveLength(2);
      expect(s.decisions).toHaveLength(2);
      if (copies === 2) {
        // A later attack must offer the unused physical pair and second ACE,
        // without replaying any consumed route from the previous Counter.
        expect(
          s.engine.applyIntent(attackerSeat, {
            type: "attack",
            attackerPermanentId: s.perm("survivor").permanentId,
            target: { kind: "player" },
          }),
        ).toEqual({ ok: true });
        await drainMicrotasks(500);
        if (s.engine.combat.hasOpenBlockWindow) {
          expect(s.engine.applyIntent(seat, { type: "declineBlock" })).toEqual({ ok: true });
        }
        await settle(() => s.events.filter((e) => e.kind === "counterWindowOpened").length === 2);
        const reopened = s.events.findLast((e) => e.kind === "counterWindowOpened");
        if (reopened?.kind !== "counterWindowOpened") throw new Error("Missing next Counter");
        expect(reopened.eligibleCounters).toHaveLength(1);
        expect(reopened.eligibleCounters[0]!.instanceId).toBe(s.inst("otherAce").instanceId);
        expect(reopened.eligibleCounters[0]!.effectKey).toContain(s.perm("field0").permanentId);
        expect(reopened.eligibleCounters[0]!.effectKey).toContain(s.inst("hand0").instanceId);
        expect(reopened.eligibleCounters[0]!.effectKey).not.toBe(choice.effectKey);
        expect(s.engine.applyIntent(seat, { type: "respondCounter" })).toEqual({ ok: true });
        await drainMicrotasks(500);
        if (s.engine.combat.hasOpenBlockWindow) {
          expect(s.engine.applyIntent(seat, { type: "declineBlock" })).toEqual({ ok: true });
        }
        await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
        expect(own.hand.some((c) => c.instanceId === s.inst("otherAce").instanceId)).toBe(true);
      }
    }
  });
});
