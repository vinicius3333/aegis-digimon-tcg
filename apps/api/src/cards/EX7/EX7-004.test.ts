import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-004.js";
import { setupEngine, settle, assertNoLoudGap } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX7-004 Fluffymon", () => {
  it("inherits once-per-turn memory when an effect deletes in battle", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenDeletesInBattle", actions: [{ kind: "GainMemory", amount: 1 }] }],
    }));

  it("gains exactly 1 memory when its stacked host deletes an opposing Digimon in battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", dp: 4000, under: ["EX7-004"], as: "host" },
          { card: "BT1-009", dp: 4000, under: ["EX7-004"], as: "secondHost" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-009", dp: 3000, suspended: true, as: "firstDefender" },
          { card: "BT1-009", dp: 3000, suspended: true, as: "secondDefender" },
        ],
      },
    });
    const firstDefender = s.perm("firstDefender");
    const secondDefender = s.perm("secondDefender");
    await s.ready();
    s.state.memory = 3;
    const attacker = s.perm("host");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: firstDefender.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.memory === 4 &&
        s.events.some(
          (event) => event.kind === "combatResolved" && event.deletedPermanentIds?.includes(firstDefender.permanentId),
        ),
    );
    expect(s.state.memory).toBe(4);

    // Once Per Turn is tracked per inherited source, so the second host may gain memory once too.
    await settle(() => !observe(s.engine).isAttacking());
    s.perm("secondDefender").isSuspended = true;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondHost").permanentId,
        target: { kind: "permanent", permanentId: s.perm("secondDefender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.events.some(
        (event) => event.kind === "combatResolved" && event.deletedPermanentIds?.includes(secondDefender.permanentId),
      ),
    );
    expect(s.state.memory).toBe(5);

    assertNoLoudGap(s);
  });

  it("does not gain memory when the battle does not delete the opponent", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", dp: 4000, under: ["EX7-004"], as: "host" }] },
      1: { battleArea: [{ card: "BT1-009", dp: 5000, suspended: true, as: "defender" }] },
    });
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 20);

    expect(s.state.memory).toBe(3);
  });
});
