import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

describe("attack trigger ordering", () => {
  it.each([
    ["attacker first", ["EX10-009"], true],
    ["trash watcher first", ["subtrigger"], false],
  ])(
    "orders initially armed watchers with the attacker's When Attacking window (%s)",
    async (_label, preferredTriggerKeys, candidateInBreeding) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "EX10-009", as: "creepymon" }],
            trash: [
              { card: "BT24-078", as: "creepymonX" },
              { card: "BT1-009", as: "breedingCandidate" },
            ],
            deck: [{ card: "BT1-010", as: "bonusDraw" }],
          },
          1: { security: ["BT1-009", "BT1-010", "BT1-011"], trash: Array.from({ length: 10 }, () => "BT1-012") },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: preferredTriggerKeys },
      );
      const sourceId = s.inst("creepymon").instanceId;
      const candidateId = s.inst("breedingCandidate").instanceId;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("creepymon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      const orderRequest = s.decisions.find(({ req }) => req.kind === "orderTriggers");
      expect(orderRequest?.req.options?.triggerCardIds).toEqual(expect.arrayContaining(["EX10-009", "BT24-078"]));
      expect(s.perm("creepymon").topCard.cardId).toBe("BT24-078");
      expect(s.perm("creepymon").stack.map((card) => card.instanceId)).toEqual([sourceId]);
      expect(s.state.players[0]!.breeding?.topCard?.instanceId === candidateId).toBe(candidateInBreeding);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId).includes(candidateId)).toBe(!candidateInBreeding);
      expect(
        s.events.filter((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX10-009"),
      ).toHaveLength(candidateInBreeding ? 1 : 0);
      expect(
        s.events.filter((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT24-078"),
      ).toHaveLength(2);
    },
  );

  it("does not retroactively arm a watcher whose source enters trash after declaration", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-009", as: "creepymon", under: ["EX9-059", "BT2-075"] }],
          hand: [{ card: "BT24-078", as: "creepymonX" }],
          deck: [{ card: "BT1-009", as: "inheritedDraw" }],
        },
        1: { security: ["BT1-010", "BT1-011"], trash: Array.from({ length: 10 }, () => "BT1-012") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sourceIds = s.perm("creepymon").stack.map((card) => card.instanceId);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("creepymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("creepymon").topCard.cardId).toBe("EX10-009");
    expect(s.perm("creepymon").stack.map((card) => card.instanceId)).toEqual(sourceIds);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("creepymonX").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("inheritedDraw").instanceId);
  });

  it.each([
    ["OnUseAttack first", "BT23-034", "EX2-060"],
    ["OnAllyAttack first", "EX2-060", "BT23-034"],
  ])("lets the turn player choose own attack timings (%s)", async (_label, preferredKey, otherKey) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-089", as: "dpTarget" }],
          security: [
            { card: "BT1-009", as: "securityOne" },
            { card: "BT1-010", as: "securityTwo" },
            { card: "BT1-011", as: "securityThree" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT23-034", as: "sakuyamon" },
            { card: "EX2-060", as: "rika" },
          ],
          hand: [{ card: "EX2-066", as: "plugIn" }],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("sakuyamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "orderTriggers"));
    const pendingOrderEntry = s.decisions.find(({ req }) => req.kind === "orderTriggers");
    expect(pendingOrderEntry).toBeDefined();
    const pendingOrder = pendingOrderEntry!.req;
    const triggerKeys = pendingOrder.options?.triggerKeys ?? [];
    const triggerCardIds = pendingOrder.options?.triggerCardIds ?? [];
    const preferredIndex = triggerCardIds.findIndex((cardId) => cardId === preferredKey);
    expect(preferredIndex).toBeGreaterThanOrEqual(0);
    expect(triggerCardIds).toEqual(expect.arrayContaining(["BT23-034", "EX2-060"]));
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: pendingOrder.decisionId,
        response: { kind: "orderTriggers", order: [triggerKeys[preferredIndex]!] },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    const triggered = s.events.filter((event) => event.kind === "effectTriggered");
    const preferredEventIndex = triggered.findIndex((event) => event.sourceCardId === preferredKey);
    const otherEventIndex = triggered.findIndex((event) => event.sourceCardId === otherKey);
    expect(preferredEventIndex).toBeGreaterThanOrEqual(0);
    expect(otherEventIndex).toBeGreaterThanOrEqual(0);
    expect(preferredEventIndex).toBeLessThan(otherEventIndex);
    expect(s.perm("dpTarget").currentDP).toBe(6000);
    expect(s.perm("rika").isSuspended).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("plugIn").instanceId);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("securityThree").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("gives the turn player OnAllyAttack timing priority over an opponent watcher", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-038", as: "watcherHost", under: ["BT12-023"] }],
          deck: ["BT1-009"],
          security: [
            { card: "BT1-009", as: "securityOne" },
            { card: "BT1-010", as: "securityTwo" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT10-036", as: "attacker", under: [{ card: "BT1-045", as: "attackerSource" }] },
            { card: "EX2-060", as: "allyTamer" },
          ],
          hand: [{ card: "EX2-066", as: "plugIn" }],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    const triggered = s.events.filter((event) => event.kind === "effectTriggered");
    const allyIndex = triggered.findIndex((event) => event.sourceCardId === "EX2-060");
    const watcherIndex = triggered.findIndex((event) => event.sourceCardId === "BT12-023");
    expect(allyIndex).toBeGreaterThanOrEqual(0);
    expect(watcherIndex).toBeGreaterThanOrEqual(0);
    expect(allyIndex).toBeLessThan(watcherIndex);
    expect(s.perm("allyTamer").isSuspended).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("plugIn").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("attackerSource").instanceId);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
  });
});
