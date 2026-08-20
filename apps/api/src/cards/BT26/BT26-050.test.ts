import { EffectDuration, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const CARD_ID = "BT26-050";

describe("BT26-050 Rosemon: Burst Mode // Aguichant Lèvres", () => {
  it("explicitly selects the DATA SQUAD level-6 route for exactly 5 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-049", as: "base" },
          { card: "BT26-091", as: "yoshino" },
        ],
        hand: [{ card: CARD_ID, as: "roseBurst" }],
        deck: ["AD1-001"],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("roseBurst").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("roseBurst").instanceId);

    expect(s.state.memory).toBe(0);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("yoshino").permanentId),
    ).toBe(true);
    expect(s.perm("base").burstDigivolvePendingTrash).toBe(false);
  });

  it("Burst Digivolves for 0, returns Yoshino, and trashes the previous top at end of turn (Q7054)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // This Rosemon is also Lv.6 DATA SQUAD, so BOTH alternate requirements match.
            // The explicit path must select Burst rather than the first matching trait route.
            { card: "BT26-049", as: "base" },
            { card: "BT26-091", as: "yoshino" },
          ],
          hand: [{ card: CARD_ID, as: "roseBurst" }],
          deck: ["AD1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const priorTop = s.perm("base").topCard.instanceId;
    const yoshinoId = s.perm("yoshino").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("roseBurst").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("roseBurst").instanceId);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === yoshinoId)).toBe(true);
    expect(s.perm("base").burstDigivolvePendingTrash).toBe(true);

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("base"));

    expect(s.perm("base").stack.some((card) => card.instanceId === priorTop)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === priorTop)).toBe(true);
  });

  it("rejects a stale or forged alternate requirement index without falling back", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-049", as: "base" }],
        hand: [{ card: CARD_ID, as: "roseBurst" }],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("roseBurst").instanceId,
        alternateRequirementIndex: 99,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("base").topCard.cardId).toBe("BT26-049");
    expect(s.state.memory).toBe(5);
  });

  it("keeps useAlternateCost boolean compatibility by selecting the first matching route", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-049", as: "base" },
          { card: "BT26-091", as: "yoshino" },
        ],
        hand: [{ card: CARD_ID, as: "roseBurst" }],
        deck: ["AD1-001"],
      },
    });
    s.state.memory = 5;
    const yoshinoId = s.perm("yoshino").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("roseBurst").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("roseBurst").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === yoshinoId)).toBe(true);
    expect(s.perm("base").burstDigivolvePendingTrash).toBe(false);
  });

  it("suspends either player's cards, then independently locks two opponent cards (Q7052-Q7053)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "roseBurst" },
            { card: "BT26-091", as: "mineOne" },
            { card: "BT25-087", as: "mineTwo" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT25-087", as: "theirOne" },
            { card: "BT26-094", as: "theirTwo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("roseBurst"));

    expect(s.perm("roseBurst").isSuspended).toBe(true);
    expect(s.perm("mineOne").isSuspended).toBe(true);
    expect(s.perm("theirOne").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("theirOne"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("theirTwo"), "unsuspend")).toBe(true);
  });

  it("offers the controller both simultaneous When Digivolving effects for ordering (Q7055)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "roseBurst" },
            { card: "BT26-036", as: "cost", suspended: true },
          ],
        },
        1: { battleArea: [{ card: "BT25-087", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );

    const resolving = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("roseBurst"));
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const pending = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;

    expect(request.options?.triggerKeys).toHaveLength(2);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "orderTriggers", order: request.options!.triggerKeys!.slice(0, 1) },
      }),
    ).toEqual({ ok: true });
    await resolving;
  });

  it("pays the shared When Digivolving/When Attacking cost from either field and trashes one security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "roseBurst" }] },
        1: {
          battleArea: [{ card: "BT25-021", as: "cost", suspended: true }],
          security: [{ card: "AD1-001", as: "security" }],
          deck: ["AD1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const securityId = s.inst("security").instanceId;
    const costId = s.perm("cost").topCard.instanceId;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("roseBurst"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(costId);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === securityId)).toBe(true);
  });

  it("does not fire Rosemon's When Attacking effect when another ally attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "roseBurst" },
            { card: "BT26-036", as: "ally" },
            { card: "BT26-039", as: "cost", suspended: true },
          ],
        },
        1: { security: ["AD1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    const costPermanentId = s.perm("cost").permanentId;
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("ally"), {
      attackerPermanentId: s.perm("ally").permanentId,
    });

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === costPermanentId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("uses the Option through a non-green DATA SQUAD card and locks every suspended opponent card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "option" }],
          battleArea: [{ card: "BT1-051", as: "yellowRuntimeDataSquad" }],
        },
        1: {
          battleArea: [
            { card: "BT25-021", as: "first" },
            { card: "BT25-087", as: "second" },
            { card: "BT25-023", as: "alreadySuspended", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    advance(s.engine).ledgers.continuous.addNameTraitGrant(
      s.perm("yellowRuntimeDataSquad").permanentId,
      "trait",
      ["DATA SQUAD"],
      EffectDuration.UntilEachTurnEnd,
    );
    await advance(s.engine).recompute();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    for (const alias of ["first", "second", "alreadySuspended"] as const) {
      expect(s.perm(alias).isSuspended).toBe(true);
      expect(observe(s.engine).isRestricted(s.perm(alias), "digivolve")).toBe(true);
      expect(observe(s.engine).isRestricted(s.perm(alias), "unsuspend")).toBe(true);
    }
  });

  it("rejects the Option without green/red color or a DATA SQUAD card", async () => {
    const s = setupEngine({ 0: { hand: [{ card: CARD_ID, as: "option" }] } });
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });
});
