import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { internalsOf } from "../../engine/testkit/internals.js";
import { compiled } from "./EX4-002.js";
import "../index.js";

describe("EX4-002 Kokomon", () => {
  it("draws once per turn when an effect suspends one of your Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenEffectSuspends", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] }] });
  });

  it("draws when an effect suspends the host carrying Kokomon", async () => {
    const s = setupEngine({
      0: { deck: ["BT1-010"], battleArea: [{ card: "BT1-009", as: "host", under: ["EX4-002"] }] },
    });
    await s.ready();
    await internalsOf(s.engine).primitives.suspend([s.perm("host").permanentId]);
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("does not draw when an attack suspends the host", async () => {
    const s = setupEngine({
      0: { deck: ["BT1-010"], battleArea: [{ card: "BT1-009", dp: 5000, as: "host", under: ["EX4-002"] }] },
      1: { battleArea: [{ card: "BT1-009", dp: 1000, as: "defender" }] },
    });
    await s.ready();
    await internalsOf(s.engine).combat.resolveAttack(0, s.perm("host"), { kind: "permanent", permanentId: s.perm("defender").permanentId });
    await settle(() => s.perm("host").isSuspended);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
