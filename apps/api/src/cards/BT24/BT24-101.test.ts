import { EffectTiming } from "@aegis/shared";
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

  it("naturally plays and resolves the full On Play security/DP/recovery sequence", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-101", as: "jupitermon" }],
          security: [
            { card: "BT1-001", as: "payment" },
            { card: "BT1-002", as: "remaining" },
          ],
          deck: [
            { card: "BT1-003", as: "recovery1" },
            { card: "BT1-004", as: "recovery2" },
          ],
        },
        1: { battleArea: [{ card: "BT1-080", as: "target", dp: 13000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jupitermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("target").instanceId));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("payment").instanceId);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("remaining").instanceId,
        s.inst("recovery1").instanceId,
        s.inst("recovery2").instanceId,
      ]),
    );
  });

  it("naturally digivolves and resolves the When Digivolving sequence", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-014", as: "base" }],
          hand: [{ card: "BT24-101", as: "jupitermon" }],
          security: [
            { card: "BT1-001", as: "payment" },
            { card: "BT1-002", as: "remaining" },
          ],
          deck: [
            { card: "BT1-003", as: "recovery1" },
            { card: "BT1-004", as: "recovery2" },
          ],
        },
        1: { battleArea: [{ card: "BT1-080", as: "target", dp: 13000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("jupitermon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("target").instanceId));

    expect(s.perm("base").topCard.cardId).toBe("BT24-101");
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("payment").instanceId);
    expect(s.state.players[0]!.security).toHaveLength(3);
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

  it("naturally trashes the opponent's top security after an own security removal", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-101", as: "jupitermon" }],
        security: [
          { card: "BT1-001", as: "ownTop" },
          { card: "BT1-002", as: "ownRemaining" },
        ],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "attacker" }],
        security: [
          { card: "BT1-003", as: "opponentTop" },
          { card: "BT1-004", as: "opponentRemaining" },
        ],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1 && s.state.players[1]!.security.length === 1);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("ownTop").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("opponentTop").instanceId);
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
      | { affectsAll?: boolean; sourceFilter?: unknown; actions?: Array<{ cost?: { target?: { filter?: unknown } } }> }
      | undefined;
    expect(replacementAction?.affectsAll).toBe(true);
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

  it.each(["OnPlay", "WhenDigivolving"] as const)(
    "%s reduces DP and recovers 2 even when there was no security card to trash (Q5715)",
    async (timing) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT24-101", as: "jupitermon" }],
            deck: [
              { card: "BT1-001", as: "recovery1" },
              { card: "BT1-002", as: "recovery2" },
            ],
          },
          1: { battleArea: [{ card: "BT1-080", as: "target", dp: 13000 }] },
        },
        { autoSelectCards: true },
      );
      await s.ready();

      await advance(s.engine).fire(
        timing === "OnPlay" ? EffectTiming.OnPlay : EffectTiming.WhenDigivolving,
        s.perm("jupitermon"),
      );
      await settle(() => s.state.players[0]!.security.length === 2);

      expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("target").instanceId);
      expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual(
        expect.arrayContaining([s.inst("recovery1").instanceId, s.inst("recovery2").instanceId]),
      );
    },
  );

  it("prevents every simultaneously leaving TS Digimon and Tamer with one security payment (Q5718)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-101", as: "jupitermon" },
            { card: "BT24-009", as: "digimon" },
            { card: "BT24-088", as: "tamer" },
          ],
          security: [
            { card: "BT1-001", as: "payment" },
            { card: "BT1-002", as: "remaining" },
          ],
        },
        1: { security: ["BT1-003", "BT1-004"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent(
      [s.perm("digimon").permanentId, s.perm("tamer").permanentId],
      "byEffect",
    );

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual(
      expect.arrayContaining([s.perm("digimon").permanentId, s.perm("tamer").permanentId]),
    );
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("remaining").instanceId]);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("naturally protects a TS Digimon from battle deletion by paying the top security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-101", as: "jupitermon" },
            { card: "BT24-009", as: "tsTarget" },
          ],
          security: [
            { card: "BT1-001", as: "payment" },
            { card: "BT1-002", as: "remaining" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 13000 }] },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("tsTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("tsTarget").permanentId,
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("payment").instanceId);
  });
});
