import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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
    // The played Zubamon resolves its own On Play effect, revealing BT1-009
    // and adding it to hand after it is placed beneath Durandamon.
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
