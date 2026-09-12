import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap } from "../../engine/testkit/harness.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-189.js";

describe("P-189 Dimetromon", () => {
  it("plays an optional LIBERATOR card costing 4 or less from hand or trash in Security", () => {
    expect(runtimeCompiledCard("P-189")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          optional: true,
          from: ["hand", "trash"],
          payCost: false,
          target: {
            count: 1,
            filter: { controller: "mine", playCostLte: 4, nameOrTrait: [{ tokens: ["LIBERATOR"], match: "trait" }] },
          },
        },
      ],
    });
  });

  it("actually plays a qualifying LIBERATOR from trash when revealed in Security", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "ST1-16", as: "nonLiberator" },
            { card: "BT9-109", as: "playable" },
          ],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          trash: [{ card: "BT18-060", as: "liberator" }],
          security: [{ card: "P-189", as: "dimetromon" }, "BT1-090", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const liberated = s.inst("liberator").instanceId;
    const dimetromon = s.inst("dimetromon").instanceId;
    s.state.memory = 10;
    s.state.turnSeat = 1;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length === 1 &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === liberated) &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === liberated)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === liberated)).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("nonLiberator").instanceId);
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).not.toContain(dimetromon);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(dimetromon);
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "securityRevealed", revealedCardId: "P-189", hasSecurityEffect: true }),
    );
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "securityChecked", revealedCardId: "P-189", resolution: "battle" }),
    );
    expect(s.state.memory).toBe(10);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("grants Progress and gains one memory once per turn when your opponent's security is removed", () => {
    const card = runtimeCompiledCard("P-189")!;
    expect(card.effects.flatMap((effect) => effect.keywords ?? [])).toEqual([
      { keyword: "Progress", raw: "＜Progress＞" },
    ]);
    expect(card.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ event: "whenSecurityRemoved", actions: [{ kind: "GainMemory", amount: 1 }] }],
    });
  });

  it("exposes Progress on the live Dimetromon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-189", as: "dimetromon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("dimetromon"), "Progress")).toBe(true);
  });

  it("gains once across two same-host security attacks, then resets for a third attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-020", as: "host", under: [{ card: "P-189", as: "source" }] },
            { card: "BT1-009", as: "redAnchor" },
          ],
          hand: [
            { card: "BT1-090", as: "playableFirst" },
            { card: "BT1-090", as: "playableSecond" },
          ],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", dp: 2000 }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: [
            { card: "BT1-009", as: "securityFirst" },
            { card: "BT1-009", as: "securitySecond" },
            { card: "BT1-009", as: "securityThird" },
            "BT1-009",
            "BT1-009",
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const sourceId = s.inst("source").instanceId;
    const finishAttack = async (checkCount: number): Promise<void> => {
      await settle(
        () =>
          s.events.filter((event) => event.kind === "securityChecked").length === checkCount &&
          s.state.pendingDecision === undefined &&
          !observe(s.engine).isAttacking(),
      );
      expect(s.events.filter((event) => event.kind === "securityChecked").at(-1)).toMatchObject({
        kind: "securityChecked",
        revealedCardId: "BT1-009",
      });
      expect(s.state.pendingDecision).toBeUndefined();
      expect(observe(s.engine).isAttacking()).toBe(false);
      expect(s.perm("host").permanentId).toBe(hostId);
      expect(s.perm("host").stack.some((card) => card.instanceId === sourceId)).toBe(true);
    };

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).hasAnyMainPhaseAction(0)).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await finishAttack(1);
    expect(s.state.players[1]!.security).toHaveLength(4);
    expect(s.state.memory).toBe(1);
    expect(observe(s.engine).hasAnyMainPhaseAction(0)).toBe(true);

    await advance(s.engine).verb.unsuspend([hostId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await finishAttack(2);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.state.memory).toBe(1);
    expect(observe(s.engine).hasAnyMainPhaseAction(0)).toBe(true);

    await advance(s.engine).verb.unsuspend([hostId]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    // Both turns passed while the gauge stayed on the active player's side, so the production
    // turn rule applies the natural +3 pass bonus before the owner's next Main phase.
    expect(s.state.memory).toBe(3);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await finishAttack(3);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(observe(s.engine).hasAnyMainPhaseAction(0)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });
});
