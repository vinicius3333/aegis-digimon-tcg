import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-045.js";

describe("BT5-045 LordKnightmon", () => {
  it("may play a yellow Warrior of any level when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-045", as: "lord" }], hand: [{ card: "BT5-042", as: "warrior" }] },
        1: { security: ["BT1-009"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const warriorId = s.inst("warrior").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("lord").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === warriorId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === warriorId)).toBe(true);
  });

  it("may also play a yellow level 3 that is not a Warrior", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-045", as: "lord" }], hand: [{ card: "BT5-034", as: "rookie" }] },
        1: { security: ["BT1-009"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const rookieId = s.inst("rookie").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("lord").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === rookieId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === rookieId)).toBe(true);
  });

  it("only offers yellow Digimon that satisfy one of the two printed branches", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-045", as: "lord" }],
          hand: [
            { card: "BT1-045", as: "yellowRookie" },
            { card: "BT5-041", as: "yellowUltimate" },
            { card: "BT1-009", as: "redRookie" },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const yellowRookieId = s.inst("yellowRookie").instanceId;
    const yellowUltimateId = s.inst("yellowUltimate").instanceId;
    const redRookieId = s.inst("redRookie").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("lord").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === yellowRookieId));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === yellowRookieId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === yellowUltimateId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === redRookieId)).toBe(true);
  });

  it("may decline the hand play without moving the card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-045", as: "lord" }], hand: [{ card: "BT5-042", as: "warrior" }] },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: false, autoDeclineOptional: true, autoSelectCards: true },
    );
    const warriorId = s.inst("warrior").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("lord").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === warriorId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === warriorId)).toBe(false);
  });

  it("can legally evolve from a yellow level 5 and retain the resulting stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT5-042", as: "base" }],
        hand: [{ card: "BT5-045", as: "lord" }],
      },
    });
    s.state.memory = 3;
    const lordId = s.inst("lord").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: lordId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === lordId);

    expect(s.perm("base").topCard.cardId).toBe("BT5-045");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT5-042"]);
    expect(s.state.memory).toBe(0);
  });

  it("gets +1000 DP for each other own Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-045", as: "lord" }, "BT1-009", "BT1-010"] },
      1: { battleArea: ["BT1-009", "BT1-010"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("lord").currentDP).toBe(s.perm("lord").baseDP + 2000);
  });
});
