import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT15-074.js";
import "../index.js";

describe("BT15-074", () => {
  it("has Blocker and may trash an opponent's hand Digimon, otherwise gains memory", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Blocker" }] });
    expect(compiled.effects?.[1]?.actions[0]).toMatchObject({ kind: "Trash", chooser: "opponent", optional: true });
    expect(compiled.effects?.[1]?.actions[1]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "ifThisEffectDidNotAct" },
    });
  });

  it("naturally lets the opponent trash a Digimon card from hand on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT15-074", as: "gesomon" }], security: ["BT1-009"] },
        1: { hand: [{ card: "BT1-009", as: "opponentCard" }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gesomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("opponentCard").instanceId));

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("opponentCard").instanceId);
    expect(s.state.memory).toBe(5);
  });

  it("naturally gains the fallback memory when the opponent has no Digimon card to trash", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT15-074", as: "gesomon" }], security: ["BT1-009"] },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gesomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 6);

    expect(s.state.memory).toBe(6);
  });
  it("restricts attacks with no opposing Digimon and gains inherited memory when an opponent Digimon is played", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "Aura", while: { kind: "opponentHasNone" } }],
    });
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenPlayed" }],
    });
    expect(compiled.effects?.[4]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      sourceFilter: { controller: "opponent", kind: ["Digimon"], byEffect: true },
    });
  });

  it("naturally gains memory when an effect plays an opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-078", as: "attacker", under: ["BT15-074"] }],
          security: ["BT1-009"],
        },
        1: { trash: [{ card: "BT1-009", as: "playedByEffect" }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("playedByEffect").instanceId);
  });

  it("does not gain memory when the opponent manually plays a Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-074", as: "watcher" }], security: ["BT1-009"] },
        1: { hand: [{ card: "BT1-009", as: "manual" }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("manual").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-009"));

    expect(s.state.memory).toBe(8);
  });

  it("gains inherited memory once for same-turn effect plays and resets next owner turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-078", as: "attacker", under: ["BT15-074"] }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          trash: [
            { card: "BT1-009", as: "playedByEffect" },
            { card: "BT1-009", as: "secondPlayedByEffect" },
            { card: "BT1-009", as: "nextPlayedByEffect" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.memory === 1 && !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined,
    );
    expect(
      s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("playedByEffect").instanceId),
    ).toBe(true);

    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(1);
    expect(
      s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("secondPlayedByEffect").instanceId),
    ).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.memory === 4 && !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined,
    );
    expect(
      s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("nextPlayedByEffect").instanceId),
    ).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});
