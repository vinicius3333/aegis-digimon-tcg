import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-017 Sangomon", () => {
  it("naturally resolves its reveal search when played from hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-017", as: "sango" }],
          deck: ["BT19-018", "BT19-053", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sango").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["BT19-018", "BT19-053"].sort());
  });

  it("naturally resolves its inherited memory gain after a public attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-019", as: "host", under: ["BT19-017"] }] },
      1: { security: ["BT1-001"] },
    });
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it("must add an Aquatic card and a LIBERATOR card, then bottoms the rest (Q3072)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-017", as: "sango" }],
          deck: ["BT19-018", "BT19-053", "BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("sango"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["BT19-018", "BT19-053"].sort());
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-009"]);
  });

  it("does not add one dual-qualifying revealed card twice", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-017", as: "sango" }], deck: ["BT19-019", "BT1-009", "BT1-010"] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("sango"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-019"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("its inherited End of Attack gains exactly 1 memory once per turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT19-019", as: "host", under: ["BT19-017"] }] } });
    s.state.memory = 0;
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndAttack, s.perm("host"));
    expect(s.state.memory).toBe(1);
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndAttack, s.perm("host"));
    expect(s.state.memory).toBe(1);
  });
});
