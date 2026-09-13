import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-029.js";
import "../ST2/ST2-16.js";
import "./BT13-030.js";

describe("BT13-029 MachGaogamon", () => {
  it("locks the attack target for the turn and unsuspends on opponent-hand additions", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        expect.objectContaining({
          kind: "Restrict",
          restriction: "attackTargetChange",
          duration: "forTheTurn",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: expect.objectContaining({ kind: "zoneCount", value: 8 }),
        }),
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenEffectAddsToOpponentHand" })],
    });
  });

  it("prevents an opposing Blocker from switching the target at eight opposing hand cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-029", as: "mach" }] },
        1: {
          hand: Array.from({ length: 8 }, (_, index) => ({ card: "BT13-021", as: `hand-${index}` })),
          battleArea: [{ card: "BT13-024", as: "blocker" }],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mach").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "securityChecked"), 3000);
    expect(observe(s.engine).isRestricted(s.perm("mach"), "attackTargetChange")).toBe(true);
    expect(s.events.some(({ kind }) => kind === "blockWindowOpened")).toBe(false);
    expect(s.perm("blocker").isSuspended).toBe(false);
  });

  it("allows an opposing Blocker to switch the target below eight hand cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-029", as: "mach" }] },
      1: {
        hand: Array.from({ length: 7 }, () => "BT13-021"),
        battleArea: [{ card: "BT13-024", as: "blocker" }],
        security: ["BT1-009"],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mach").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));

    expect(observe(s.engine).isRestricted(s.perm("mach"), "attackTargetChange")).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("supplemental dispatch filters the controller and suppresses repeated additions of a card to the opponent's hand", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-10", as: "host", suspended: true, under: ["BT13-029"] }] },
    });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 0 });
    expect(s.perm("host").isSuspended).toBe(true);

    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });
    expect(s.perm("host").isSuspended).toBe(false);

    s.perm("host").isSuspended = true;
    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });
    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("unsuspends its legal host for public effect returns once per turn and resets", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST2-10", as: "host", under: [{ card: "BT13-029", as: "source" }] }],
          hand: [
            { card: "ST2-16", as: "firstOption" },
            { card: "ST2-16", as: "secondOption" },
            { card: "ST2-16", as: "thirdOption" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-015", as: "firstTarget" },
            { card: "BT1-015", as: "secondTarget" },
          ],
          security: ["BT1-010", "BT1-010", "BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    const firstId = s.inst("firstTarget").instanceId;
    const secondId = s.inst("secondTarget").instanceId;
    const sourceId = s.inst("source").instanceId;
    const firstOptionId = s.inst("firstOption").instanceId;
    const secondOptionId = s.inst("secondOption").instanceId;
    const thirdOptionId = s.inst("thirdOption").instanceId;
    s.state.memory = 10;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2 && !observe(s.engine).isAttacking());
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: firstOptionId })).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended && s.state.players[1]!.hand.some((c) => c.instanceId === firstId));
    expect(s.state.memory).toBe(3);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: secondOptionId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((c) => c.instanceId === secondId));
    await turn;
    expect(s.state.memory).toBe(-4);
    expect(s.perm("host").isSuspended).toBe(true);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: firstId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === firstId));
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: thirdOptionId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((c) => c.instanceId === firstId));
    await nextTurn;
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("host").stack.map((c) => c.instanceId)).toContain(sourceId);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual(
      expect.arrayContaining([firstOptionId, secondOptionId, thirdOptionId]),
    );
  });
});
