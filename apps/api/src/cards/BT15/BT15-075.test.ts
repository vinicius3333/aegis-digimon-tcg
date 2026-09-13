import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT15-075.js";
import "../index.js";

describe("BT15-075", () => {
  it("may trash a hand card for +2000 DP and draws with SoC in stack when digivolving or attacking", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        { kind: "ModifyDP", amount: 2000, cost: { kind: "trash" }, optional: true },
        { kind: "Draw", amount: 1, condition: { filter: { kind: ["Tamer"] } } },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        { kind: "ModifyDP", amount: 2000 },
        { kind: "Draw", amount: 1, condition: { filter: { kind: ["Tamer"] } } },
      ],
    });
  });
  it("gains 1 memory once per turn after attacking when the opponent has memory", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "EndOfAttack",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "GainMemory", amount: 1 }],
    }));

  it("trashes for the attack boost and draws from an SoC Tamer stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-075", as: "loogarmon", under: ["BT14-087"] }],
          hand: [{ card: "BT1-009", as: "costCard" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("loogarmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("costCard").instanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId),
    );

    expect(s.perm("loogarmon").currentDP).toBe(7000);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("costCard").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("gains inherited end-of-attack memory only once per turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT15-080", as: "host", under: ["BT15-075"] }] },
      1: { security: ["ST2-13", "ST2-13"] },
    });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && s.state.memory === -1);
    expect(s.state.memory).toBe(-1);

    s.state.memory = 0;
    s.state.turnSeat = 0;
    s.state.phase = Phase.Main;
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.memory).toBe(-2);
  });

  it("gains end-of-attack memory once across same-turn attacks and again after reset", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-091", as: "host", under: ["BT15-075"] }],
          hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT15-032", as: "opponent", under: ["BT14-029"] }],
          security: ["BT1-010", "BT1-010", "BT1-010"],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 0;
    s.state.memory = 1;
    const hostId = s.perm("host").permanentId;
    const sourceId = s.perm("host").stack.find((card) => card.cardId === "BT15-075")!.instanceId;
    expect(s.perm("opponent").stack.map((card) => card.cardId)).toEqual(["BT14-029"]);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2 && !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(0);
    expect(s.perm("host").stack.some((card) => card.instanceId === sourceId)).toBe(true);
    await advance(s.engine).verb.unsuspend([hostId]);
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(-1);
    expect(s.perm("host").stack.some((card) => card.instanceId === sourceId)).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 1;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.unsuspend([hostId]);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(0);
    expect(s.perm("host").stack.some((card) => card.instanceId === sourceId)).toBe(true);
    expect(s.perm("opponent").stack.map((card) => card.cardId)).toEqual(["BT14-029"]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });
});
