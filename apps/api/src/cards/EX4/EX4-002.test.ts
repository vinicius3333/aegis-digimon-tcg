import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-002.js";
import "../index.js";

describe("EX4-002 Kokomon", () => {
  it("draws once per turn when an effect suspends one of your Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        { kind: "SubTrigger", event: "whenEffectSuspends", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] },
      ],
    });
  });

  it("draws when an effect suspends the host carrying Kokomon", async () => {
    const s = setupEngine({
      0: { deck: ["BT1-010"], battleArea: [{ card: "BT1-009", as: "host", under: ["EX4-002"] }] },
    });
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("host").permanentId], 0);
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("does not draw when an attack suspends the host", async () => {
    const s = setupEngine({
      0: { deck: ["BT1-010"], battleArea: [{ card: "BT1-009", dp: 5000, as: "host", under: ["EX4-002"] }] },
      1: { battleArea: [{ card: "BT1-009", dp: 1000, as: "defender" }], security: ["BT1-001"] },
    });
    await s.ready();
    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("draws only once when effects suspend multiple Digimon in the same turn", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-010", "BT1-011"],
        battleArea: [
          { card: "BT1-009", as: "first", under: ["EX4-002"] },
          { card: "BT1-009", as: "second" },
        ],
      },
    });
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("first").permanentId]);
    await settle(() => s.state.players[0]!.hand.length === 1);
    await advance(s.engine).verb.unsuspend([s.perm("first").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("second").permanentId]);
    await settle();

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
