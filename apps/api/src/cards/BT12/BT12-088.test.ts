import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup, type SeatSpec } from "../../engine/testkit/harness.js";
import "../BT3/BT3-101.js";
import "../BT4/BT4-097.js";
import "./BT12-017.js";
import "./BT12-088.js";

describe("BT12-088", () => {
  it("registers its printed Start of Your Turn effect from compiled IR", () => {
    const module = getEffectModule("BT12-088");
    expect(module?.cardId).toBe("BT12-088");
    const source = {
      instanceId: "source-088",
      cardId: "BT12-088",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnStartTurn, source).length).toBeGreaterThan(0);
  });

  it("sets memory to 3 at the start of your turn only when memory is 2 or less", async () => {
    const low = setupEngine({ 0: { battleArea: [{ card: "BT12-088", as: "takuya" }] } });
    await low.ready();
    low.state.memory = 2;
    await advance(low.engine).fire(EffectTiming.OnStartTurn, low.perm("takuya"));
    expect(low.state.memory).toBe(3);

    const high = setupEngine({ 0: { battleArea: [{ card: "BT12-088", as: "takuya" }] } });
    await high.ready();
    high.state.memory = 3;
    await advance(high.engine).fire(EffectTiming.OnStartTurn, high.perm("takuya"));
    expect(high.state.memory).toBe(3);
  });

  it("gains 2 memory once when an inherited host with 10000 or more DP checks security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-017", as: "host", under: ["BT12-088"] },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-009"],
        },
        1: { deck: ["BT1-009"], security: ["BT1-010", "BT1-010", "BT1-010"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 2 && s.state.players[1]!.security.length === 1);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;

    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 2 && s.state.players[1]!.security.length === 0);
    expect(s.state.memory).toBe(2);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("does not gain memory below the printed 10000 DP threshold", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-008", as: "host", under: ["BT12-088"] }] },
        1: { security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.state.memory).toBe(0);
  });

  it("plays itself from security through a real opponent attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      1: { security: [{ card: "BT12-088", as: "securityTakuya" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("securityTakuya").instanceId),
    );
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-088")).toBe(true);
  });
});

async function attackPlayerWithTakuyaHost(hostDP: number, defender: SeatSpec): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: "BT1-009", as: "host", dp: hostDP, under: ["BT12-088"] }] },
      1: defender,
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 0;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(
    () => s.events.some((event) => event.kind === "securityChecked") && s.state.pendingDecision === undefined,
  );
  return s;
}

function memoryChanges(s: EngineSetup): { from: number; to: number }[] {
  return s.events.flatMap((event) => (event.kind === "memoryChanged" ? [{ from: event.from, to: event.to }] : []));
}

describe("BT12-088 Takuya Kanbara — KB Q&A rulings", () => {
  it("does not gain 2 memory when a [Security] effect drops the host below 10000 DP before the trigger activates (Q2220)", async () => {
    const dropped = await attackPlayerWithTakuyaHost(8000, { security: ["BT3-101"] });
    expect(dropped.events.some((event) => event.kind === "securityChecked")).toBe(true);
    expect(dropped.perm("host").currentDP).toBe(7000);
    expect(memoryChanges(dropped)).toEqual([]);
    expect(dropped.state.memory).toBe(0);

    const unchanged = await attackPlayerWithTakuyaHost(8000, { security: ["BT1-010"] });
    expect(unchanged.perm("host").currentDP).toBe(10000);
    expect(unchanged.state.memory).toBe(2);
  });

  it("resolves the [Security] effect first, then the turn player's security-check trigger before the opponent's security-removal trigger (Q2221)", async () => {
    const opponentBoard: SeatSpec = {
      battleArea: [{ card: "BT4-097", as: "kari" }],
      security: ["BT3-101", "BT1-010"],
    };

    const securityFirst = await attackPlayerWithTakuyaHost(10000, opponentBoard);
    expect(securityFirst.perm("host").currentDP).toBe(9000);
    expect(securityFirst.perm("kari").isSuspended).toBe(true);
    expect(memoryChanges(securityFirst)).toEqual([{ from: 0, to: -1 }]);

    const turnPlayerFirst = await attackPlayerWithTakuyaHost(11000, opponentBoard);
    expect(turnPlayerFirst.perm("host").currentDP).toBe(10000);
    expect(turnPlayerFirst.perm("kari").isSuspended).toBe(true);
    expect(memoryChanges(turnPlayerFirst)).toEqual([
      { from: 0, to: 2 },
      { from: 2, to: 1 },
    ]);
  });

  it("gains 2 memory before the host battles and loses to a Security Digimon (Q2222)", async () => {
    const s = await attackPlayerWithTakuyaHost(8000, { security: [{ card: "BT12-017", as: "securityDigimon" }] });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT12-088"]),
    );
    expect(s.state.memory).toBe(2);

    const memoryGain = s.events.findIndex((event) => event.kind === "memoryChanged" && event.to === 2);
    const securityBattle = s.events.findIndex((event) => event.kind === "securityChecked");
    expect(s.events[securityBattle]).toMatchObject({
      resolution: "battle",
      battle: { attackerDP: 10000, securityCardDP: 11000, attackerDeleted: true },
    });
    expect(memoryGain).toBeGreaterThanOrEqual(0);
    expect(memoryGain).toBeLessThan(securityBattle);
  });
});
