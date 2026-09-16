import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-112.js";

const BT12_112 = "BT12-112";
const SHOUTMON = "BT12-008";

describe("BT12-112 ＜when played＞ cost reduction (place 1 [Shoutmon] → -1)", () => {
  it("registers the complete DigiXros and declarative replacement IR", async () => {
    const { runtimeCompiledCard } = await import("../../engine/effects/interpreter/compiledCards.js");
    const card = runtimeCompiledCard(BT12_112)!;
    expect(card.coverage).toBe("full");
    expect(card.residual).toEqual([]);
    expect(card.digiXrosRequirement).toEqual([
      {
        materials: [{ traits: ["Xros Heart", "Blue Flare"], differentCardNumbers: true }],
        count: "∞",
        costReduction: 1,
      },
    ]);
    const onPlay = card.effects.find((effect) => effect.trigger === "OnPlay");
    expect(onPlay?.actions).toEqual([
      expect.objectContaining({ kind: "Return", order: "any", returnDigivolutionCardsFirst: true }),
    ]);
    expect(card.effects.some((effect) => effect.trigger === "Static")).toBe(true);
    expect(card.effects.find((effect) => effect.trigger === "Static")?.actions).toEqual([
      expect.objectContaining({
        kind: "Replacement",
        actions: [
          expect.objectContaining({
            kind: "SelectBind",
            target: expect.objectContaining({
              filter: expect.objectContaining({
                controller: "mine",
                nameOrTrait: [{ tokens: ["Shoutmon"], match: "name" }],
              }),
            }),
          }),
          expect.anything(),
          expect.anything(),
        ],
      }),
    ]);
    const yourTurn = card.effects.find((effect) => effect.trigger === "YourTurn");
    expect(yourTurn?.actions).toEqual([
      expect.objectContaining({
        kind: "DisableSecurityEffect",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        sourceKind: "option",
        scope: "seat",
        duration: "forTheTurn",
      }),
    ]);
  });

  it("registers the printed On Play, opponent-action, and turn security-lock effects", () => {
    const module = getEffectModule(BT12_112);
    const source = { instanceId: "source-112", cardId: BT12_112, ownerSeat: 0, isOnBattleArea: () => true } as never;
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.BeforePayCost, source)).toHaveLength(0);
    expect(module!.effectsForTiming(EffectTiming.None, source)).toHaveLength(2);
  });

  it("accepts the minimum one-card DigiXros and charges one memory less", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: BT12_112, as: "x7" },
            { card: "BT12-008", as: "single-xros" },
          ],
        },
        1: { battleArea: [{ card: "BT12-008", as: "opponent-shoutmon" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 14;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("x7").instanceId,
        digiXros: { materialInstanceIds: [s.inst("single-xros").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === BT12_112) && s.state.memory === 0,
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("x7").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("single-xros").instanceId]);
  });

  it("rejects two copies of the same card number as DigiXros materials", () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: BT12_112, as: "x7" },
          { card: "BT12-008", as: "first-copy" },
          { card: "BT12-008", as: "second-copy" },
        ],
      },
    });
    s.state.memory = 14;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("x7").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("first-copy").instanceId, s.inst("second-copy").instanceId],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("x7").instanceId,
      s.inst("first-copy").instanceId,
      s.inst("second-copy").instanceId,
    ]);
  });

  it("plays at cost 14 (15 - 1), placing the [Shoutmon] as a digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: SHOUTMON, dp: 3000, as: "shoutmon", under: [{ card: "BT1-009", as: "source-stack" }] }],
          hand: [{ card: BT12_112, as: "card" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0];
    s.state.memory = 14;

    const res = s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId });
    expect(res).toEqual({ ok: true });

    const shoutmonPermanentId = s.perm("shoutmon").permanentId;
    const sourceStackId = s.inst("source-stack").instanceId;
    await settle(
      () => (p0?.battleArea.some((p) => p.topCard?.cardId === BT12_112) ?? false) && s.state.memory === 0,
      400,
    );

    const played = p0?.battleArea.find((p) => p.topCard?.cardId === BT12_112);
    expect(played).toBeDefined();
    expect(s.state.memory).toBe(0);
    expect(p0?.battleArea.some((p) => p.permanentId === shoutmonPermanentId)).toBe(false);
    expect(played?.stack.map((c) => c.cardId)).toEqual([SHOUTMON]);
    expect(s.state.players[0]?.trash.map(({ instanceId }) => instanceId)).toContain(sourceStackId);
  });

  it("declining the optional cost plays at the full cost (15), with the [Shoutmon] untouched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: SHOUTMON, dp: 3000, as: "shoutmon", under: [{ card: "BT1-009", as: "source-stack" }] }],
          hand: [{ card: BT12_112, as: "card" }],
        },
      },
      { autoSelectCards: true },
    );
    const p0 = s.state.players[0];
    s.state.memory = 15;

    const res = s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId });
    expect(res).toEqual({ ok: true });

    const shoutmonPermanentId = s.perm("shoutmon").permanentId;
    const sourceStackId = s.inst("source-stack").instanceId;
    await settle(() => s.decisions.some((d) => d.req.kind === "optional"), 400);
    const prompt = s.decisions.find((d) => d.req.kind === "optional");
    if (prompt !== undefined) {
      s.engine.applyIntent(prompt.seat, {
        type: "respondDecision",
        decisionId: prompt.req.decisionId,
        response: { kind: "optional", accept: false },
      });
    }
    await settle(
      () => (p0?.battleArea.some((p) => p.topCard?.cardId === BT12_112) ?? false) && s.state.memory === 0,
      400,
    );

    const played = p0?.battleArea.find((p) => p.topCard?.cardId === BT12_112);
    expect(played).toBeDefined();
    expect(s.state.memory).toBe(0);
    expect(p0?.battleArea.some((p) => p.permanentId === shoutmonPermanentId)).toBe(true);
    expect(played?.stack.length ?? 0).toBe(0);
    expect(s.perm("shoutmon").stack.map(({ instanceId }) => instanceId)).toEqual([sourceStackId]);
  });

  it("returns an opponent's complete stack to the owner's deck bottom before its top card", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: BT12_112, as: "x7" }] },
        1: {
          deck: [{ card: "BT1-015", as: "sentinel" }],
          battleArea: [
            {
              card: "BT12-008",
              as: "opponent-host",
              under: [
                { card: "BT1-009", as: "bottom-source" },
                { card: "BT1-010", as: "upper-source" },
              ],
            },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: false },
    );
    s.state.memory = 15;
    const sentinelId = s.inst("sentinel").instanceId;
    const sourceIds = [s.inst("bottom-source").instanceId, s.inst("upper-source").instanceId];
    const hostId = s.perm("opponent-host").topCard!.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("x7").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const orderDecision = s.state.pendingDecision;
    expect(orderDecision?.kind).toBe("orderCards");
    expect(JSON.parse(orderDecision!.payloadJson)).toMatchObject({
      candidateInstanceIds: sourceIds,
      visibleInstanceIds: sourceIds,
      orderDestination: "deckBottom",
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: orderDecision!.decisionId,
        response: { kind: "orderCards", order: [sourceIds[1]!, sourceIds[0]!] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === BT12_112),
    );

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      sentinelId,
      sourceIds[1]!,
      sourceIds[0]!,
      hostId,
    ]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });
});

it("suppresses opponent Option Security effects only for source-owner attackers", async () => {
  const s = setupEngine({
    0: {
      battleArea: [
        { card: BT12_112, as: "x7" },
        { card: "BT1-009", as: "owner-attacker" },
      ],
    },
    1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
  });
  await s.ready();
  const security = observe(s.engine);
  expect(security.suppressesSecurityEffect(s.perm("owner-attacker"), "BT12-101")).toBe(true);
  expect(security.suppressesSecurityEffect(s.perm("attacker"), "BT12-101")).toBe(false);
});
