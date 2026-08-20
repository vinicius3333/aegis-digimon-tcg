import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import module from "./BT26-031.js";
import "../index.js";

const CARD_ID = "BT26-031";

function source(): CardSource {
  return {
    instanceId: "murasamemon",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: {} as CardDefinition,
    permanent: () => ({ permanentId: "murasamemon-permanent" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-031 Murasamemon // Gonozan: Murashigure", () => {
  it("uses the exact off-color Lv.4 Glowing Dawn alternate evolution for cost 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-049", as: "greenGlowingDawn" }],
        hand: [{ card: CARD_ID, as: "murasamemon" }],
        deck: ["BT5-022"],
      },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greenGlowingDawn").permanentId,
        instanceId: s.inst("murasamemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("greenGlowingDawn").topCard.cardId === CARD_ID);
    expect(s.state.memory).toBe(0);
  });

  it("Q6997: after the activating player resolves a tied-security choice, locks an independent Digimon or Tamer", async () => {
    const cardSource = source();
    const target = { permanentId: "target", topCard: { cardId: "TAMER" }, inBreeding: false };
    const restrict = vi.fn();
    const trashTopSecurityOfPlayerWithMostSecurity = vi.fn(async () => ({
      seat: 1 as Seat,
      trashed: [{ instanceId: "s" }],
    }));
    const ctx = {
      source: cardSource,
      game: {
        opponentOf: () => 1 as Seat,
        player: (seat: Seat) => ({
          security: [{ instanceId: `security-${seat}` }],
          battleArea: seat === 1 ? [target] : [],
        }),
        definitionOf: () => ({ kinds: [CardKind.Tamer] }),
      } as unknown as GameAccess,
      ask: { chooseTargets: vi.fn(async () => ["target"]) },
      fx: { trashTopSecurityOfPlayerWithMostSecurity, restrict },
    } as unknown as EffectContext;
    const effect = module.effectsForTiming(EffectTiming.WhenDigivolving, cardSource)[0]!;
    expect(effect.optional).toBe(true);
    await effect.resolve(ctx);
    expect(trashTopSecurityOfPlayerWithMostSecurity).toHaveBeenCalledWith(0);
    expect(restrict).toHaveBeenCalledWith("target", "suspend", expect.anything());
  });

  it("Q6999: exposes both simultaneous When Digivolving effects for controller ordering", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "murasamemon" },
            { card: "BT26-091", as: "tamer", under: [{ card: "AD1-001", as: "cost", faceUp: false }] },
          ],
          security: ["AD1-002"],
          deck: ["AD1-003"],
        },
        1: { battleArea: [{ card: "BT5-022", as: "target" }], security: ["AD1-004"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    const resolving = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("murasamemon"));
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const pending = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;
    expect(request.options?.triggerKeys?.map((key) => key.split("::").at(-1))).toEqual(
      expect.arrayContaining([`${CARD_ID}/when-digivolving-suspend-lock`, `${CARD_ID}/wd-wa-recovery`]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "orderTriggers", order: request.options!.triggerKeys!.slice(0, 1) },
      }),
    ).toEqual({ ok: true });
    await resolving;
  });

  it("pays the literal bottom face-down Tamer card, recovers, and shares one WD/WA budget", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "murasamemon" },
            {
              card: "BT26-091",
              as: "tamer",
              under: [
                { card: "AD1-001", as: "bottom", faceUp: false },
                { card: "AD1-002", as: "upper", faceUp: true },
              ],
            },
          ],
          deck: [{ card: "AD1-003", as: "recovery" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("murasamemon"));
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("bottom").instanceId);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("upper").instanceId]);

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("murasamemon"), {
      attackerPermanentId: s.perm("murasamemon").permanentId,
    });
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("does not recover when the Tamer-under-card cost fails to move", async () => {
    const cardSource = source();
    const tamer = {
      permanentId: "tamer",
      topCard: { cardId: "TAMER" },
      inBreeding: false,
      stack: [{ instanceId: "bottom", faceUp: false }],
    };
    const recoverToSecurity = vi.fn();
    const ctx = {
      source: cardSource,
      game: {
        player: () => ({ battleArea: [tamer] }),
        definitionOf: () => ({ kinds: [CardKind.Tamer] }),
      } as unknown as GameAccess,
      fx: {
        trashDigivolutionCards: vi.fn(async () => []),
        recoverToSecurity,
      } as unknown as Primitives,
    } as unknown as EffectContext;
    const effect = module.effectsForTiming(EffectTiming.OnUseAttack, cardSource)[0]!;
    await effect.resolve(ctx);
    expect(recoverToSecurity).not.toHaveBeenCalled();
    expect(ctx.fx.trashDigivolutionCards).toHaveBeenCalledWith("tamer", ["bottom"], { byEffectSeat: 0 });
  });

  it("uses the Option through a non-yellow Glowing Dawn card and Q6998 deletes only after full -13000 resolution", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "option" }],
          battleArea: [{ card: "BT25-049", as: "greenGlowingDawn" }],
          security: [{ card: "AD1-001", as: "cost" }],
        },
        1: { battleArea: [{ card: "AD1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const targetId = s.perm("target").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "AD1-009")).toBe(true);
  });

  it("applies only -8000 when the controller has no security to pay the additional cost", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: CARD_ID, as: "option" }], battleArea: [{ card: "BT25-049", as: "greenGlowingDawn" }] },
        1: { battleArea: [{ card: "AD1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000);
    expect(s.perm("target").currentDP).toBe(4000);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(true);
  });
});
