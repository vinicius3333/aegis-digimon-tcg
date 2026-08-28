import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT10-028.js";
describe("BT10-028 Cannondramon", () => {
  it("encodes Blocker, evolution unsuspend, and a self-anchored opponent-turn battle watcher", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({ trigger: "Static", keywords: [expect.objectContaining({ keyword: "Blocker" })] }),
      expect.objectContaining({
        trigger: "WhenDigivolving",
        actions: [expect.objectContaining({ kind: "Unsuspend" })],
      }),
      expect.objectContaining({
        trigger: "OpponentsTurn",
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenDeletesInBattle",
            sourceFilter: { isSelfRef: true },
          }),
        ],
      }),
    ]);
  });

  it("unsuspends itself when digivolving", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-011", as: "base", suspended: true }],
        hand: [{ card: "BT10-028", as: "evolving" }],
      },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("base").isSuspended);
    expect(s.perm("base").isSuspended).toBe(false);
  });

  it("blocks, suspends for the block, deletes the attacker, then unsuspends on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-028", as: "cannondramon" }],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 3000 }] },
      },
      { autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const attackerInstanceId = s.perm("attacker").topCard.instanceId;
    expect(observe(s.engine).subscriptions("whenDeletesInBattle", s.perm("cannondramon").permanentId)).toHaveLength(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.events.find((event) => event.kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [s.perm("cannondramon").permanentId],
    });

    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: s.perm("cannondramon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[1]!.trash.some((card) => card.instanceId === attackerInstanceId),
    );

    expect(s.perm("cannondramon").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("anchors the battle deletion watcher to the Cannondramon that battled and limits it to once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-028", as: "observer", suspended: true },
            { card: "BT10-028", as: "blocker" },
          ],
          security: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "firstAttacker", dp: 3000 },
            { card: "BT1-011", as: "secondAttacker", dp: 3000 },
          ],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const attackerInstanceIds = new Map(
      ["firstAttacker", "secondAttacker"].map((alias) => [alias, s.perm(alias).topCard.instanceId]),
    );

    for (const attacker of ["firstAttacker", "secondAttacker"]) {
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm(attacker).permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      const priorBlocks = s.events.filter((event) => event.kind === "blocked").length;
      await settle(() => s.events.filter((event) => event.kind === "blockWindowOpened").length > priorBlocks, 5000);
      expect(
        s.engine.applyIntent(0, {
          type: "declareBlock",
          blockerPermanentId: s.perm("blocker").permanentId,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          !observe(s.engine).isAttacking() &&
          s.state.players[1]!.trash.some((card) => card.instanceId === attackerInstanceIds.get(attacker)),
        5000,
      );
    }

    expect(s.perm("observer").isSuspended).toBe(true);
    expect(s.perm("blocker").isSuspended).toBe(true);
  });
});
