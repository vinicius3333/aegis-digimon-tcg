import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-097.js";
import "../BT2/BT2-107.js";
import "./BT3-095.js";
import "../ST7/ST7-10.js";

describe("BT3-097 A Delicate Plan", () => {
  it("prevents checked Option cards from activating their Security effects", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT3-007", as: "attacker", dp: 20_000 }], hand: [{ card: "BT3-097", as: "option" }] },
        1: { security: [{ card: "BT2-107", as: "securityOption" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT3-097"));
    expect(s.state.memory).toBe(9);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.memory).toBe(9);
  });

  it("adds itself to its owner's hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT3-097", as: "securityOption", faceUp: true }] } });
    const id = s.inst("securityOption").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === id)).toBe(true);
  });
});

describe("BT3-097 A Delicate Plan — KB Q&A rulings", () => {
  it("still lets checked Tamer cards activate their [Security] effects (Q1131)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST7-10", as: "securityAttacker", dp: 20_000 }],
          hand: [{ card: "BT3-097", as: "option" }],
        },
        1: {
          security: [
            { card: "BT3-095", as: "securityTamer" },
            { card: "BT2-107", as: "securityOption" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const tamerId = s.inst("securityTamer").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT3-097"));
    expect(s.state.memory).toBe(9);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("securityAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    await advance(s.engine).finishAttack();

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("securityOption").instanceId);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === tamerId)).toBe(true);
    expect(s.state.memory).toBe(9);
  });
});
