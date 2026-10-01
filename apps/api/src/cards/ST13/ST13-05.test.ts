import type { ServerEvent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT9/BT9-047.js";
import "../ST2/ST2-13.js";
import "./ST13-02.js";
import "./ST13-03.js";
import "./ST13-05.js";

describe("ST13-05 Durandamon", () => {
  it("reveals 3 while attacking and plays one eligible Legend-Arms Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST13-05", as: "durandamon" }], deck: ["ST13-02", "BT1-009", "BT1-010"] },
        1: { security: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("durandamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST13-02"));
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
  });

  it("may decline the revealed play and puts every revealed card on the deck bottom", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST13-05", as: "durandamon" }], deck: ["ST13-02", "BT1-009", "BT1-010"] },
        1: { security: ["BT1-011"] },
      },
      { autoOrderCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("durandamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const refusal = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: refusal.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-009", "BT1-010", "ST13-02"]);
  });

  it("gains its DP and Security Attack bonus only once when its controller's effects add sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST13-05", as: "durandamon" }],
          hand: [
            { card: "ST13-02", as: "zubamon" },
            { card: "ST13-03", as: "zubaeagermon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "oppTarget", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zubamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("durandamon").stack.some((card) => card.cardId === "ST13-02") &&
        observe(s.engine).hasKeyword(s.perm("durandamon"), "SecurityAttack"),
    );
    expect(s.perm("durandamon").currentDP).toBe(14_000);
    expect(observe(s.engine).hasKeyword(s.perm("durandamon"), "SecurityAttack")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zubaeagermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("durandamon").stack.some((card) => card.cardId === "ST13-03"));
    expect(s.perm("durandamon").currentDP).toBe(14_000);
    expect(observe(s.engine).hasKeyword(s.perm("durandamon"), "SecurityAttack")).toBe(true);
  });

  it("does not gain the bonus when an opponent's effect adds the source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST13-05", as: "durandamon" }],
        hand: [{ card: "ST13-02", as: "source" }],
      },
    });
    await s.ready();

    advance(s.engine).verb.enterEffectResolution?.(1, ["Digimon"]);
    await advance(s.engine).verb.placeUnder(s.perm("durandamon").permanentId, [s.inst("source").instanceId]);
    advance(s.engine).verb.leaveEffectResolution?.();

    expect(s.perm("durandamon").currentDP).toBe(11_000);
    expect(observe(s.engine).keywordAmount(s.perm("durandamon"), "SecurityAttack")).toBe(0);
  });

  it("suppresses an Option card's Security effect while inherited by RagnaLoardmon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST13-06", as: "ragna", under: ["ST13-05"] }] },
      1: { security: ["ST2-13"] },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ragna").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.memory).toBe(0);
  });
});

const REVEALED = ["ST13-02", "BT1-009", "BT1-010"];
const BELOW_REVEALED = ["BT1-001", "BT1-002"];

function setupWhenAttacking(opponentBattleArea: string[], answers: { autoAcceptOptional?: boolean }) {
  return setupEngine(
    {
      0: { battleArea: [{ card: "ST13-05", as: "durandamon" }], deck: [...REVEALED, ...BELOW_REVEALED] },
      1: { battleArea: opponentBattleArea, security: ["BT1-011"] },
    },
    { ...answers, autoSelectCards: answers.autoAcceptOptional, autoOrderCards: true },
  );
}

function declareSecurityAttack(s: ReturnType<typeof setupWhenAttacking>) {
  return s.engine.applyIntent(0, {
    type: "attack",
    attackerPermanentId: s.perm("durandamon").permanentId,
    target: { kind: "player" },
  });
}

function isLegendArmsPlay(event: ServerEvent) {
  return event.kind === "cardPlayed" && event.cardId === "ST13-02";
}

function deckCardIds(s: ReturnType<typeof setupWhenAttacking>) {
  return Array.from(s.state.players[0]!.deck, (card) => card.cardId);
}

describe("ST13-05 Durandamon — KB Q&A rulings", () => {
  it("may choose not to play the revealed Legend-Arms Digimon, which goes to the deck bottom with the rest (Q773)", async () => {
    const s = setupWhenAttacking([], {});
    await s.ready();

    expect(declareSecurityAttack(s)).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const offer = s.decisions.at(-1)!.req;
    const legendArms = offer.options?.visibleCards?.find((card) => card.cardId === "ST13-02");
    expect(offer.options?.candidateInstanceIds).toContain(legendArms?.instanceId);
    expect(offer.options?.min ?? 0).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: offer.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(Array.from(s.state.players[0]!.battleArea, (permanent) => permanent.topCard.cardId)).toEqual(["ST13-05"]);
    expect(deckCardIds(s).slice(0, 2)).toEqual(BELOW_REVEALED);
    expect(deckCardIds(s).slice(2).sort()).toEqual([...REVEALED].sort());
  });

  it("cannot play the revealed Legend-Arms Digimon while Pomumon is in play, so it goes to the deck bottom (Q774)", async () => {
    const withPomumon = setupWhenAttacking(["BT9-047"], { autoAcceptOptional: true });
    await withPomumon.ready();
    expect(declareSecurityAttack(withPomumon)).toEqual({ ok: true });
    await settle(() => withPomumon.state.players[1]!.security.length === 0);

    expect(Array.from(withPomumon.state.players[0]!.battleArea, (permanent) => permanent.topCard.cardId)).toEqual([
      "ST13-05",
    ]);
    expect(withPomumon.events.some(isLegendArmsPlay)).toBe(false);
    expect(deckCardIds(withPomumon).slice(0, 2)).toEqual(BELOW_REVEALED);
    expect(deckCardIds(withPomumon).slice(2).sort()).toEqual([...REVEALED].sort());

    const withoutPomumon = setupWhenAttacking([], { autoAcceptOptional: true });
    await withoutPomumon.ready();
    expect(declareSecurityAttack(withoutPomumon)).toEqual({ ok: true });
    await settle(() => withoutPomumon.state.players[1]!.security.length === 0);
    expect(withoutPomumon.events.some(isLegendArmsPlay)).toBe(true);
  });
});
