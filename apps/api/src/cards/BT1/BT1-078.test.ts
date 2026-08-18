import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-078.js";

describe("BT1-078 Jagamon", () => {
  it("reveals 3 cards and may digivolve into a revealed level 6 green Digimon for free", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-078", as: "attacker" }], deck: [{ card: "BT1-081", as: "evolution" }, "BT1-010", "BT1-011"] }, 1: { security: ["BT1-012"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("attacker").topCard.instanceId === s.inst("evolution").instanceId &&
        s.state.players[0]!.deck.length === 2,
    );
    expect(s.perm("attacker").topCard.cardId).toBe("BT1-081");
    // The evolution bonus draw sees the unrevealed deck, which is empty here. The
    // other two revealed cards therefore remain in deck after the effect finishes.
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("may decline the revealed evolution and bottoms every revealed card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-078", as: "attacker" }],
        deck: [{ card: "BT1-081", as: "evolution" }, { card: "BT1-010", as: "missA" }, { card: "BT1-011", as: "missB" }],
      },
      1: { security: ["BT1-012"] },
    });
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decline = s.decisions.at(-1)!.req;
    expect(decline.options).toMatchObject({ min: 0, max: 1 });
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decline.decisionId,
      response: { kind: "selectCards", instanceIds: [] },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && s.state.pendingDecision === undefined);

    expect(s.perm("attacker").topCard.cardId).toBe("BT1-078");
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(expect.arrayContaining([
      s.inst("evolution").instanceId,
      s.inst("missA").instanceId,
      s.inst("missB").instanceId,
    ]));
  });
});
