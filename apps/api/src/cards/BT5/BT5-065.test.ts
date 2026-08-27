import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-065.js";
import "./BT5-069.js";

describe("BT5-065 Shademon", () => {
  it("plays itself after its security battle", async () => {
    const s = setupEngine({
      0: {
        security: [
          { card: "BT5-065", as: "shade" },
          { card: "BT1-009", as: "secondCheck" },
        ],
      },
      1: { battleArea: [{ card: "BT5-069", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const shadeId = s.inst("shade").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === shadeId) &&
        s.events.some(
          (event) =>
            event.kind === "securityChecked" && "revealedCardId" in event && event.revealedCardId === "BT5-065",
        ),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === shadeId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(3);
    expect(s.events).toContainEqual(
      expect.objectContaining({
        kind: "securityChecked",
        revealedCardId: "BT5-065",
        resolution: "battle",
        battle: { securityDigimonDeleted: true, attackerDeleted: false },
      }),
    );
    const firstCheck = s.events.findIndex(
      (event) => event.kind === "securityChecked" && event.revealedCardId === "BT5-065",
    );
    const secondCheck = s.events.findIndex(
      (event) => event.kind === "securityChecked" && event.revealedCardId === "BT1-009",
    );
    const play = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.instanceIds.includes(shadeId) && event.to === "battleArea",
    );
    expect(secondCheck).toBeGreaterThan(firstCheck);
    expect(play).toBeGreaterThan(-1);
    expect(play).toBeGreaterThan(firstCheck);
    expect(play).toBeLessThan(secondCheck);
  });

  it("has Blocker and can't attack on its turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-065", as: "shade" }] } });
    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("shade"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("shade"), "attack")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("shade").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
  });

  it("can redirect an opponent's attack as a Blocker", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-065", as: "shade" }] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("shade").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "blocked"));
    expect(s.events).toContainEqual(expect.objectContaining({ kind: "blocked" }));
    expect(s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT5-065")?.isSuspended).toBe(true);
  });
});
