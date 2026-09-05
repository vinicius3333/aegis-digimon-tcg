import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT10/BT10-100.js";
import "./EX1-069.js";
import "./EX1-072.js";

describe("EX1-072 Emergency Program Shutdown!", () => {
  it("prevents the opponent from using Option cards until the end of their next turn", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX1-072", as: "shutdown" }],
        battleArea: [{ card: "BT11-095", as: "blueSource" }],
        deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
        security: ["BT1-001", "BT1-001", "BT1-001"],
      },
      1: {
        hand: [{ card: "BT10-100", as: "opponentOption" }],
        battleArea: [{ card: "BT10-029", as: "yellowSource" }],
        deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
        security: ["BT1-001", "BT1-001", "BT1-001"],
      },
    });
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shutdown").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((c) => c.cardId === "EX1-072"));
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentOption").instanceId }).ok).toBe(
      false,
    );
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("from security restricts the opponent for the turn and returns to its owner's hand", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX1-069", as: "opponentOption" }],
        battleArea: [{ card: "EX1-047", as: "blackSource" }],
      },
      1: { security: [{ card: "EX1-072", as: "shutdown", faceUp: true }] },
    });
    s.state.memory = 5;
    const shutdownId = s.inst("shutdown").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("shutdown"));

    expect(s.state.players[1]!.hand.some((c) => c.instanceId === shutdownId)).toBe(true);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === shutdownId)).toBe(false);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("opponentOption").instanceId }).ok).toBe(
      false,
    );
  });

  it("applies its turn lock and returns to its owner's hand during a real security check", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX1-069", as: "opponentOption" }],
        battleArea: [
          { card: "BT1-009", as: "attacker" },
          { card: "EX1-047", as: "blackSource" },
        ],
      },
      1: { security: [{ card: "EX1-072", as: "shutdown" }] },
    });
    const shutdownId = s.inst("shutdown").instanceId;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === shutdownId));

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === shutdownId)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("opponentOption").instanceId }).ok).toBe(
      false,
    );
  });

  it("expires after the opponent's next turn, allowing Option use again", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-072", as: "shutdown" }],
          battleArea: [{ card: "BT11-095", as: "blueSource" }],
          deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
        1: {
          hand: [{ card: "BT10-100", as: "opponentOption" }],
          battleArea: [{ card: "BT10-029", as: "yellowSource" }],
          deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 4;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shutdown").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-072"));
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-072"));
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentOption").instanceId }).ok).toBe(
      false,
    );
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentOption").instanceId }).ok).toBe(
      true,
    );
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("still resolves a Security effect while the affected player cannot use Options (Q3265)", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX1-072", as: "shutdown" }],
        battleArea: [{ card: "BT11-095", as: "blueSource" }],
      },
      1: { security: [{ card: "EX1-072", as: "securityShutdown", faceUp: true }] },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shutdown").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-072"));
    const securityId = s.inst("securityShutdown").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityShutdown"));
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === securityId)).toBe(true);
  });

  it("allows Delay on an Option already in the battle area during the lock (Q3266)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-072", as: "shutdown" }],
          battleArea: [{ card: "BT11-095", as: "blueSource" }],
          deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
        1: {
          hand: [{ card: "BT10-100", as: "boost" }],
          battleArea: [{ card: "BT10-029", as: "yellowSource" }],
          deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("boost").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT10-100"));
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shutdown").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-072"));
    await advance(s.engine).waitForMainPhase(1);
    const [delay] = observe(s.engine).activatableEffects(
      s.state.players[1]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT10-100")!,
    ) as Array<{ effectKey: string }>;
    expect(delay).toBeDefined();
    expect(
      s.engine.applyIntent(1, {
        type: "activateEffect",
        sourceInstanceId: s.state.players[1]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT10-100")!
          .topCard!.instanceId,
        effectKey: delay!.effectKey,
      }).ok,
    ).toBe(true);
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT10-100"));
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT10-100")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
