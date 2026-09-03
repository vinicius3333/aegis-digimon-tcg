import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-029.js";
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
          security: ["BT1-002"],
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
        security: ["BT1-002"],
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

  it("unsuspends its host when an effect adds a card to the opponent's hand", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-015", as: "host", suspended: true, under: ["BT13-029"] }] },
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

  it("naturally unsuspends when a played blue Tamer causes an effect return to the opponent's hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-015", as: "host", suspended: true, under: ["BT13-029"] },
            { card: "BT13-030", as: "ulforce" },
          ],
          hand: [{ card: "BT13-097", as: "blueTamer" }],
        },
        1: { battleArea: [{ card: "BT1-015", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blueTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("target").instanceId) &&
        !s.perm("host").isSuspended,
    );

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("target").instanceId);
  });
});
