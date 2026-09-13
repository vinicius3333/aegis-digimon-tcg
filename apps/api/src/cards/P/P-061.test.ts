import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-061.js";
import "./P-064.js";

describe("P-061 Jellymon", () => {
  it("draws 1 when its host attacks while Kiyoshiro is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-064" }, { card: "BT9-023", as: "host", under: ["P-061"] }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoDeclineOptional: true },
    );
    const drawnId = s.inst("drawn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === drawnId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawnId)).toBe(true);
  });

  it("draws only once per turn across two attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-064" }, { card: "BT9-023", as: "host", under: ["P-061"], dp: 9000 }],
          hand: ["BT1-009"],
          deck: [
            { card: "BT1-009", as: "firstDraw" },
            { card: "BT1-010", as: "staysInDeck" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", suspended: true, dp: 1000 },
            { card: "BT1-010", as: "second", suspended: true, dp: 1000 },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("first").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("firstDraw").instanceId) &&
        s.events.filter((event) => event.kind === "combatResolved").length === 1 &&
        s.state.phase === Phase.Main &&
        s.state.turnSeat === 0 &&
        !observe(s.engine).isAttacking(),
    );
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("second").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.length === 0 &&
        s.events.filter((event) => event.kind === "combatResolved").length === 2 &&
        s.state.phase === Phase.Main &&
        s.state.turnSeat === 0 &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("staysInDeck").instanceId)).toBe(true);
  });

  it("can draw again after a real turn boundary", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-064" }, { card: "BT9-023", as: "host", under: ["P-061"], dp: 9000 }],
          hand: ["BT1-009"],
          deck: [
            { card: "BT1-009", as: "normalDraw0" },
            { card: "BT1-010", as: "effectDraw0" },
            { card: "BT1-011", as: "normalDrawNext" },
            { card: "BT1-012", as: "effectDrawNext" },
            "BT1-013",
            "BT1-014",
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", suspended: true, dp: 1000 },
            { card: "BT1-010", as: "second", suspended: true, dp: 1000 },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 0;
    s.state.isFirstPlayersFirstTurn = false;
    const firstDraw = s.inst("effectDraw0").instanceId;
    const secondDraw = s.inst("effectDrawNext").instanceId;
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === firstDraw)).toBe(false);
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const attackResult = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "permanent", permanentId: s.perm("first").permanentId },
    });
    expect(attackResult).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "combatResolved").length === 1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === firstDraw)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([s.perm("second").permanentId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("second").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === secondDraw) &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === secondDraw)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
