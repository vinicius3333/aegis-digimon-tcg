import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const CARD_ID = "BT26-075";

function definition(overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: overrides.cardId ?? "AD1-001",
    set: overrides.set ?? "TEST",
    nameEn: overrides.nameEn ?? "Fixture",
    colors: overrides.colors ?? (["Purple"] as CardDefinition["colors"]),
    kinds: overrides.kinds ?? [CardKind.Digimon],
    playCost: overrides.playCost ?? 5,
    dp: overrides.dp ?? 5000,
    evoCosts: overrides.evoCosts ?? [],
    maxCountInDeck: overrides.maxCountInDeck ?? 4,
    types: overrides.types ?? [],
    ...overrides,
  };
}

function source(): CardSource {
  return {
    instanceId: "scourge-card",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: definition({ cardId: CARD_ID, types: ["Machine", "Glowing Dawn", "BEATBREAK"] }),
    permanent: () => ({ permanentId: "scourge" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-075 ScourgeChiropmon // Despair Blast", () => {
  it("lets Ascension resolve before On Deletion and thereby makes the pending effect fail (Q7100)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "scourge" },
            { card: "BT26-093", as: "reina", under: [{ card: "AD1-002", faceUp: false, as: "cost" }] },
          ],
          trash: [{ card: "ST23-02", as: "playTarget" }],
        },
      },
      { autoOrderTriggers: false, autoSelectCards: false },
    );
    await s.ready();
    const scourgeInstanceId = s.perm("scourge").topCard.instanceId;
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("scourge").permanentId], "byEffect");

    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const order = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === order.decisionId)!.req;
    const ascensionKey = request.options!.triggerKeys!.find((key) => key.startsWith("ascension/"))!;
    expect(request.options!.triggerKeys).toEqual(
      expect.arrayContaining([ascensionKey, expect.stringMatching(/^on-deletion\//)]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: { kind: "orderTriggers", order: [ascensionKey] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const ascend = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ascend.decisionId,
        response: { kind: "selectCards", instanceIds: [scourgeInstanceId] },
      }),
    ).toEqual({ ok: true });
    await deletion;

    expect(s.state.players[0]!.security.at(-1)?.instanceId).toBe(scourgeInstanceId);
    expect(s.perm("reina").stack.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("playTarget").instanceId);
  });

  it("uses its Option side through the Glowing Dawn use requirement without a Purple source", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "despairBlast" }],
          battleArea: [{ card: "ST23-03", as: "glowingDawn" }],
        },
        1: { battleArea: [{ card: "AD1-001", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("despairBlast").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not waive the Option color requirement for a near-matching trait", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "despairBlast" }],
        battleArea: [{ card: "AD1-001", as: "nonMatching" }],
      },
    });
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("despairBlast").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("uses the printed level 4 Glowing Dawn evolution requirement for cost 3", async () => {
    // ST23-03 is yellow, so the ordinary purple/yellow Lv.4 cost is 4. The explicit
    // alternate path is what proves the trait-sensitive cost reduction to 3.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST23-03", as: "cougarmon" }],
          hand: [{ card: CARD_ID, as: "scourge" }],
          deck: ["AD1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("cougarmon").permanentId,
        instanceId: s.inst("scourge").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("cougarmon").topCard.instanceId === s.inst("scourge").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("cougarmon").stack.map((card) => card.cardId)).toEqual(["ST23-03"]);
  });

  it("exposes both printed keywords through the continuous keyword ledger", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "scourge" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("scourge"), "Execute")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("scourge"), "Ascension")).toBe(true);
  });

  it("resolves its Security cost and free play, then still battles as a Security Digimon (Q7101)", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [{ card: "ST23-02", as: "glowingDawnTarget" }],
          security: [{ card: CARD_ID, as: "securityScourge" }],
          battleArea: [
            {
              card: "BT26-093",
              as: "reina",
              under: [{ card: "AD1-002", faceUp: false, as: "bottomCost" }],
            },
          ],
        },
        1: { battleArea: [{ card: "AD1-001", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const targetId = s.inst("glowingDawnTarget").instanceId;
    const costId = s.inst("bottomCost").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === targetId) &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "AD1-001") &&
        s.state.players[0]!.trash.some((card) => card.cardId === CARD_ID),
    );

    expect(s.perm("reina").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(costId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === targetId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain(CARD_ID);
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "securityChecked", revealedCardId: CARD_ID, resolution: "battle" }),
    );
  });

  it("does not play after a prevented bottom-card trash fails to pay the By cost", async () => {
    const cardSource = source();
    const tamer = {
      permanentId: "tamer",
      inBreeding: false,
      topCard: { instanceId: "tamer-top", cardId: "TAMER" },
      stack: [{ instanceId: "protected-bottom", cardId: "MATERIAL", faceUp: false }],
    };
    const target = { instanceId: "target", cardId: "TARGET" };
    const game = {
      player: () => ({ battleArea: [tamer], trash: [target] }),
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
      definitionOf: (card: { cardId: string }) => {
        if (card.cardId === "TAMER") return definition({ cardId: "TAMER", kinds: [CardKind.Tamer] });
        if (card.cardId === "TARGET") {
          return definition({ cardId: "TARGET", playCost: 5, types: ["Glowing Dawn"] });
        }
        return definition({ cardId: card.cardId });
      },
      permanentById: () => tamer,
    } as unknown as GameAccess;
    const playInstances = vi.fn<(...args: any[]) => any>(async () => []);
    const fx = {
      trashDigivolutionCards: vi.fn<(...args: any[]) => any>(async () => []),
      playInstances,
    } as unknown as Primitives;
    const ctx = {
      source: cardSource,
      trigger: {},
      game,
      fx,
      ask: {
        optional: vi.fn(async () => true),
        selectCards: vi.fn(async () => [target.instanceId]),
      },
    } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnDestroyedAnyone, cardSource)[0]!;

    await effect.resolve(ctx);

    expect(fx.trashDigivolutionCards).toHaveBeenCalledWith("tamer", ["protected-bottom"], {
      byEffectSeat: 0,
      byEffectCardId: CARD_ID,
    });
    expect(playInstances).not.toHaveBeenCalled();
  });

  it("the Option side offers only lowest-level opponents and deletes exactly one tied target", async () => {
    const cardSource = source();
    const opponents = [
      { permanentId: "low-a", topCard: { cardId: "LOW-A" }, inBreeding: false },
      { permanentId: "low-b", topCard: { cardId: "LOW-B" }, inBreeding: false },
      { permanentId: "high", topCard: { cardId: "HIGH" }, inBreeding: false },
    ];
    const game = {
      opponentOf: () => 1 as Seat,
      player: (seat: Seat) => ({ battleArea: seat === 1 ? opponents : [] }),
      definitionOf: (card: { cardId: string }) =>
        definition({ cardId: card.cardId, level: card.cardId === "HIGH" ? 6 : 4 }),
    } as unknown as GameAccess;
    const deletePermanent = vi.fn<(...args: any[]) => any>(async () => 1);
    const chooseTargets = vi.fn(async () => ["low-b"]);
    const ctx = {
      source: cardSource,
      trigger: {},
      game,
      fx: { deletePermanent },
      ask: { chooseTargets },
    } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnUseOption, cardSource)[0]!;

    expect(effect.canActivate(ctx)).toBe(true);
    await effect.resolve(ctx);

    expect(chooseTargets).toHaveBeenCalledWith(ctx, { candidates: ["low-a", "low-b"], min: 1, max: 1 });
    expect(deletePermanent).toHaveBeenCalledWith(["low-b"]);
  });
});
