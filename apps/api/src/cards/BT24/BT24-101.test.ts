import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_101 } from "./BT24-101.js";
import "../index.js";

async function paidToEvolveFromAegiochusmon(securityCount: number): Promise<number> {
  const s = setupEngine({
    0: {
      battleArea: [{ card: "BT24-014", as: "base" }],
      hand: [{ card: "BT24-101", as: "jupitermon" }],
      security: Array.from({ length: securityCount }, () => "AD1-001"),
    },
  });
  s.state.memory = 10;
  await s.engine.recomputeContinuousEffects();
  const before = s.state.memory;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("jupitermon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("base").topCard?.cardId === "BT24-101");
  return before - s.state.memory;
}

describe("BT24-101 Jupitermon", () => {
  it("sets the Aegiochusmon evolution cost to 1 per own security, including zero (Q5714)", async () => {
    expect(await paidToEvolveFromAegiochusmon(3)).toBe(3);
    expect(await paidToEvolveFromAegiochusmon(0)).toBe(0);
  });

  it("trashes opponent security once per turn only for removal from its controller's security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-101", as: "jupitermon" }] },
      1: { security: ["AD1-001", "AD1-001"] },
    });
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.state.players[1]!.security).toHaveLength(2);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("trashes the correct security cards and protects TS Digimon/Tamers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT24_101.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "SecurityManipulation",
        op: "trashTop",
        controller: "mine",
        amount: 1,
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "ModifyDP",
        amount: -13000,
        duration: "untilOpponentTurnEnd",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
      expect(effect?.actions?.[2]).toMatchObject({
        kind: "SecurityManipulation",
        op: "addTop",
        source: "deck",
        amount: 2,
        condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 1 },
      });
    }
    const securityWatcher = BT24_101.effects?.find(
      (entry) => entry.trigger === "AllTurns" && !entry.isInherited && entry.actions?.[0]?.kind === "SubTrigger",
    );
    expect(securityWatcher).toMatchObject({ frequency: "OncePerTurn" });
    expect(securityWatcher?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" },
    });
    const watcherAction = securityWatcher?.actions?.[0] as { actions?: unknown[] } | undefined;
    expect(watcherAction?.actions?.[0]).toMatchObject({
      kind: "trashSecurityTop",
      controller: "opponent",
      count: 1,
    });
    const replacement = BT24_101.effects?.find(
      (entry) => entry.trigger === "AllTurns" && entry.actions?.[0]?.kind === "Replacement",
    );
    expect(replacement).toMatchObject({ frequency: "OncePerTurn" });
    const replacementAction = replacement?.actions?.[0] as
      | { sourceFilter?: unknown; actions?: Array<{ cost?: { target?: { filter?: unknown } } }> }
      | undefined;
    expect(replacementAction?.sourceFilter).toMatchObject({
      controller: "mine",
      kind: ["Digimon", "Tamer"],
      nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
    });
    expect(replacementAction?.actions?.[0]?.cost?.target?.filter).toMatchObject({
      controller: "mine",
      zone: "security",
      position: "top",
    });
    expect(replacementAction?.actions?.[0]).toMatchObject({
      kind: "Prevent",
      mode: "leavePlay",
      optional: true,
      abortOnDecline: true,
    });
  });
});
