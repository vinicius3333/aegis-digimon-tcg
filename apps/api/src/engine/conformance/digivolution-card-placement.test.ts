import { describe, expect, it } from "vitest";
import { cite } from "./_kb.js";
import { observe } from "../testkit/observe.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

describe("public deck-top placement cost identity and position", () => {
  const providers = [
    { card: "EX9-009", base: "BT1-009", targetDP: 3000, hostDP: 6000, deleted: false },
    { card: "EX9-025", base: "BT1-045", targetDP: 1000, hostDP: 5000, deleted: false },
    { card: "EX9-061", base: "BT11-075", targetDP: 3000, hostDP: 5000, deleted: true },
  ];
  it.each(providers.flatMap((provider) => ["paid", "refused", "empty"].map((mode) => ({ ...provider, mode }))))(
    "$card public attack $mode reports only actual bottom deck payment",
    async ({ card, base, targetDP, hostDP, deleted, mode }) => {
      cite(
        "comprehensive-0292",
        "4-7: source order and physical bottom placement",
        "703276fe13872e365e719f8577a6ccf56e5e00dac5dc84cd15a5434784dee855",
      );
      cite(
        "comprehensive-0170",
        "15-7-4: optional processing may be chosen even when payment is impossible",
        "6cf99208432c9ac35794ee0edd04b5e68067edccb3fc5de44d96cfe768ce2c97",
      );
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card, as: "host", under: [{ card: base, as: "base" }] }],
            deck:
              mode === "empty"
                ? []
                : [
                    { card: "BT1-028", as: "paidCard" },
                    { card: "BT1-028", as: "remainingDeck" },
                  ],
            security: ["BT1-009"],
          },
          1: {
            battleArea: [{ card: "BT1-009", as: "target" }],
            deck: ["BT1-009"],
            security: [
              { card: "BT1-028", as: "checked" },
              { card: "BT1-028", as: "remainingSecurity1" },
              { card: "BT1-028", as: "remainingSecurity2" },
            ],
          },
        },
        {
          autoAcceptOptional: mode !== "refused",
          autoDeclineOptional: mode === "refused",
          autoSelectCards: true,
          autoOrderTriggers: true,
        },
      );
      s.state.memory = 4;
      await s.ready();
      const host = s.perm("host");
      const hostId = host.topCard.instanceId;
      const baseId = s.inst("base").instanceId;
      const paidId = mode === "empty" ? undefined : s.inst("paidCard").instanceId;
      const targetId = s.inst("target").instanceId;
      const checkedId = s.inst("checked").instanceId;
      const events = await observe(s.engine).captureSubTriggers(async () => {
        expect(
          s.engine.applyIntent(0, {
            type: "attack",
            attackerPermanentId: host.permanentId,
            target: { kind: "player" },
          }),
        ).toEqual({ ok: true });
        await settle(() => !observe(s.engine).isAttacking());
        await settle();
      });
      expect(s.decisions.filter((entry) => entry.req.kind === "optional")).toHaveLength(1);
      const additions = events.filter((entry) => entry.event === "onAddDigivolutionCards");
      const paidAddition = {
        event: "onAddDigivolutionCards",
        payload: expect.objectContaining({
          subjectPermanentId: host.permanentId,
          addedDigivolutionCardInstanceIds: [paidId],
          addedDigivolutionCardsPosition: "bottom",
          byEffectSeat: 0,
        }),
      };
      expect(additions).toEqual(mode === "paid" ? [paidAddition] : []);
      expect(host.stack.map((source) => source.instanceId)).toEqual(mode === "paid" ? [paidId, baseId] : [baseId]);
      expect(host.stack.map((source) => source.faceUp)).toEqual(mode === "paid" ? [false, true] : [true]);
      expect(host.topCard.instanceId).toBe(hostId);
      expect(host.controllerSeat).toBe(0);
      expect(host.isSuspended).toBe(true);
      expect(host.currentDP).toBe(mode === "paid" ? hostDP : 5000);
      expect(s.state.memory).toBe(4);
      expect(s.state.players[0]!.deck.map((source) => source.instanceId)).toEqual(
        mode === "empty"
          ? []
          : mode === "paid"
            ? [s.inst("remainingDeck").instanceId]
            : [paidId, s.inst("remainingDeck").instanceId],
      );
      expect(s.state.players[0]!.hand).toHaveLength(0);
      expect(s.state.players[0]!.trash).toHaveLength(0);
      expect(s.state.players[0]!.security).toHaveLength(1);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual(
        mode === "paid" && deleted ? [] : [targetId],
      );
      const survivor = s.state.players[1]!.battleArea[0];
      expect(survivor?.currentDP).toBe(mode === "paid" && deleted ? undefined : mode === "paid" ? targetDP : 3000);
      expect(s.state.players[1]!.trash.map((source) => source.instanceId).sort()).toEqual(
        (mode === "paid" && deleted ? [targetId, checkedId] : [checkedId]).sort(),
      );
      expect(s.state.players[1]!.security.map((source) => source.instanceId)).toEqual([
        s.inst("remainingSecurity1").instanceId,
        s.inst("remainingSecurity2").instanceId,
      ]);
      expect(s.state.pendingDecision).toBeUndefined();
      assertNoLoudGap(s);
    },
  );
});

describe("optional deck payment with no opposing payload target", () => {
  it.each([
    { card: "EX9-025", base: "BT1-045" },
    { card: "EX9-061", base: "BT11-075" },
  ])("$card still offers and pays the processing condition without a target (15-7-5)", async ({ card, base }) => {
    cite(
      "comprehensive-0170",
      "15-7-5: processing may be paid without an executable payload",
      "6cf99208432c9ac35794ee0edd04b5e68067edccb3fc5de44d96cfe768ce2c97",
    );
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card, as: "host", under: [{ card: base, as: "base" }] }],
          deck: [
            { card: "BT1-028", as: "paid" },
            { card: "BT1-028", as: "remaining" },
          ],
          security: ["BT1-009"],
        },
        1: {
          security: [
            { card: "BT1-028", as: "checked" },
            { card: "BT1-028", as: "remainingSecurity1" },
            { card: "BT1-028", as: "remainingSecurity2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const host = s.perm("host");
    const events = await observe(s.engine).captureSubTriggers(async () => {
      expect(
        s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      await settle();
    });
    expect(s.decisions.filter((entry) => entry.req.kind === "optional")).toHaveLength(1);
    expect(events.filter((entry) => entry.event === "onAddDigivolutionCards")).toEqual([
      {
        event: "onAddDigivolutionCards",
        payload: expect.objectContaining({
          subjectPermanentId: host.permanentId,
          addedDigivolutionCardInstanceIds: [s.inst("paid").instanceId],
          addedDigivolutionCardsPosition: "bottom",
          byEffectSeat: 0,
        }),
      },
    ]);
    expect(host.stack.map((source) => source.instanceId)).toEqual([
      s.inst("paid").instanceId,
      s.inst("base").instanceId,
    ]);
    expect(host.stack.map((source) => source.faceUp)).toEqual([false, true]);
    expect(host.topCard.cardId).toBe(card);
    expect(host.controllerSeat).toBe(0);
    expect(host.currentDP).toBe(5000);
    expect(host.isSuspended).toBe(true);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.deck.map((source) => source.instanceId)).toEqual([s.inst("remaining").instanceId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security.map((source) => source.instanceId)).toEqual([
      s.inst("remainingSecurity1").instanceId,
      s.inst("remainingSecurity2").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map((source) => source.instanceId)).toEqual([s.inst("checked").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });
});
