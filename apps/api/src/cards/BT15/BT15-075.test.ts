import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
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
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
        1: { security: ["BT1-001"] },
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
});
