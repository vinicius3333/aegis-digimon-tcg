import { EffectTiming } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import module from "./BT26-004.js";
import "../index.js";

const CARD_ID = "BT26-004";

describe("BT26-004 Pagumon", () => {
  it("pays the hand-card cost, puts it face down at the bottom under a Glowing Dawn Tamer, then draws", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "attacker", under: [CARD_ID] },
            {
              card: "BT25-088",
              as: "tamer",
              under: [{ card: "BT1-001", as: "existing", faceUp: false }],
            },
          ],
          hand: [{ card: "BT1-009", as: "cost" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const cost = s.inst("cost").instanceId;
    const existing = s.inst("existing").instanceId;

    await advance(s.engine).fireForPermanent(EffectTiming.OnAllyAttack, s.perm("attacker"), {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([cost, existing]);
    expect(s.perm("tamer").stack[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.decisions.find(({ req }) => req.kind === "selectCards")?.req.options).toMatchObject({ min: 1, max: 1 });
  });

  it("lets the controller choose among only their Glowing Dawn Tamers", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "attacker", under: [CARD_ID] },
          { card: "BT25-088", as: "first" },
          { card: "BT26-089", as: "second" },
          { card: "BT1-089", as: "plainTamer" },
        ],
        hand: [{ card: "BT1-009", as: "cost" }],
        deck: ["BT1-010"],
      },
      1: { battleArea: [{ card: "BT25-088", as: "opponentTamer" }] },
    });
    await s.ready();
    const resolving = advance(s.engine).fireForPermanent(EffectTiming.OnAllyAttack, s.perm("attacker"), {
      attackerPermanentId: s.perm("attacker").permanentId,
    });

    await settle(() => s.state.pendingDecision?.kind === "optional");
    let pending = s.state.pendingDecision!;
    expect(pending.seat).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("cost").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    pending = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;
    expect(new Set(request.options?.candidateInstanceIds)).toEqual(
      new Set([s.perm("first").permanentId, s.perm("second").permanentId]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("second").permanentId] },
      }),
    ).toEqual({ ok: true });
    await resolving;

    expect(s.perm("first").stack).toHaveLength(0);
    expect(s.perm("second").stack.map((card) => card.instanceId)).toEqual([s.inst("cost").instanceId]);
  });

  it("declining the optional activation pays nothing, draws nothing, and does not consume Once Per Turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "attacker", under: [CARD_ID] },
          { card: "BT25-088", as: "tamer" },
        ],
        hand: [{ card: "BT1-009", as: "cost" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    await s.ready();
    const trigger = { attackerPermanentId: s.perm("attacker").permanentId };
    const first = advance(s.engine).fireForPermanent(EffectTiming.OnAllyAttack, s.perm("attacker"), trigger);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decline = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decline.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await first;
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.perm("tamer").stack).toHaveLength(0);

    const second = advance(s.engine).fireForPermanent(EffectTiming.OnAllyAttack, s.perm("attacker"), trigger);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.state.pendingDecision?.kind).toBe("optional");
    const accept = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: accept.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const cardChoice = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: cardChoice.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("cost").instanceId] },
      }),
    ).toEqual({ ok: true });
    await second;
    expect(s.perm("tamer").stack).toHaveLength(1);
  });

  it("resolves only once per turn after a successful cost payment", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "attacker", under: [CARD_ID] },
            { card: "BT25-088", as: "tamer" },
          ],
          hand: [
            { card: "BT1-009", as: "firstCost" },
            { card: "BT1-010", as: "secondCost" },
          ],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const trigger = { attackerPermanentId: s.perm("attacker").permanentId };
    await advance(s.engine).fireForPermanent(EffectTiming.OnAllyAttack, s.perm("attacker"), trigger);
    await advance(s.engine).fireForPermanent(EffectTiming.OnAllyAttack, s.perm("attacker"), trigger);

    expect(s.perm("tamer").stack).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
  });

  it("does not offer activation without both a hand card and a qualifying Tamer", () => {
    const source = {
      ownerSeat: 0,
      instanceId: "pagumon",
      cardId: CARD_ID,
      permanent: () => ({ permanentId: "host" }),
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
    } as CardSource;
    const effect = module.effectsForTiming(EffectTiming.OnAllyAttack, source)[0]!;
    const context = (hand: unknown[], battleArea: unknown[]) =>
      ({
        source,
        trigger: { attackerPermanentId: "host" },
        game: {
          player: () => ({ hand, battleArea }),
          permanentById: () => undefined,
          definitionOf: () => ({}),
        } as unknown as GameAccess,
      }) as EffectContext;

    expect(effect.canActivate(context([], []))).toBe(false);
    expect(effect.canActivate(context([{ instanceId: "card" }], []))).toBe(false);
  });

  it("does not draw if the mandatory placement cost fails", async () => {
    const source = {
      ownerSeat: 0,
      instanceId: "pagumon",
      cardId: CARD_ID,
      permanent: () => ({ permanentId: "host" }),
      isOnBattleArea: () => true,
    } as CardSource;
    const tamer = { permanentId: "tamer", topCard: { cardId: "BT25-088" } };
    const draw = vi.fn();
    const effect = module.effectsForTiming(EffectTiming.OnAllyAttack, source)[0]!;
    await effect.resolve({
      source,
      trigger: { attackerPermanentId: "host" },
      game: {
        player: () => ({ hand: [{ instanceId: "cost" }], battleArea: [tamer] }),
        permanentById: () => tamer,
        definitionOf: () => ({ kinds: ["Tamer"], types: ["Glowing Dawn"] }),
      } as unknown as GameAccess,
      ask: { selectCards: vi.fn(async () => ["cost"]) },
      fx: { placeUnder: vi.fn(async () => []), draw } as unknown as Primitives,
    } as unknown as EffectContext);

    expect(draw).not.toHaveBeenCalled();
  });
});
