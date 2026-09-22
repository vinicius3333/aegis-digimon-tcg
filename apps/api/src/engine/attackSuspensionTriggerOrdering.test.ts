import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { internalsOf } from "./testkit/internals.js";
import { observe } from "./testkit/observe.js";

type EngineEvent = ReturnType<typeof setupEngine>["events"][number];
type TriggeredEvent = Extract<EngineEvent, { kind: "effectTriggered" }>;

function triggeredEvents(s: ReturnType<typeof setupEngine>, cardIds?: readonly string[]): TriggeredEvent[] {
  return s.events.filter(
    (event): event is TriggeredEvent =>
      event.kind === "effectTriggered" && (cardIds === undefined || cardIds.includes(event.sourceCardId ?? "")),
  );
}

describe("attack declaration suspension trigger ordering", () => {
  it.each(["OnUseAttack", "whenSuspended"] as const)(
    "lets the turn player resolve %s first between self-suspension and When Attacking",
    async (firstTiming) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "EX11-074", as: "vortexdramon" }],
            security: ["BT1-009", "BT1-010"],
            deck: ["BT1-011", "BT1-012"],
          },
          1: {
            battleArea: [{ card: "BT1-080", as: "target", suspended: true }],
            security: ["BT1-013", "BT1-014"],
            deck: ["BT1-015", "BT1-016"],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: false },
      );
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("vortexdramon").permanentId,
          target: { kind: "permanent", permanentId: s.perm("target").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
      const order = s.decisions.find(({ req }) => req.kind === "orderTriggers")?.req;
      const triggerKeys = order?.options?.triggerKeys ?? [];
      const triggerCardIds = order?.options?.triggerCardIds ?? [];
      expect(triggerKeys).toHaveLength(2);
      expect(triggerCardIds).toEqual(["EX11-074", "EX11-074"]);
      const attackEffectIndex = triggerKeys.findIndex((key) => key.includes("ir-12-0"));
      expect(attackEffectIndex).toBeGreaterThanOrEqual(0);
      const firstIndex = firstTiming === "OnUseAttack" ? attackEffectIndex : 1 - attackEffectIndex;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: order!.decisionId,
          response: { kind: "orderTriggers", order: [triggerKeys[firstIndex]!] },
        }),
      ).toEqual({ ok: true });
      await settle(() => triggeredEvents(s, ["EX11-074"]).length === 2);
      const triggered = triggeredEvents(s, ["EX11-074"]);
      expect(triggered.map((event) => event.timing)).toEqual(
        firstTiming === "OnUseAttack" ? ["OnUseAttack", "whenSuspended"] : ["whenSuspended", "OnUseAttack"],
      );
    },
  );

  it("keeps turn-player attack effects ahead of the non-turn player's suspension watcher", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX10-009", as: "attacker" }], security: ["BT1-009"] },
        1: {
          battleArea: [{ card: "EX11-074", as: "vortexdramon" }],
          trash: Array.from({ length: 10 }, () => "BT1-009"),
          security: ["BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => triggeredEvents(s, ["EX11-074"]).length > 0);

    const triggered = triggeredEvents(s, ["EX10-009", "EX11-074"]);
    expect(triggered.map((event) => event.sourceCardId)).toEqual(["EX10-009", "EX11-074"]);
  });

  it("folds watchers on other permanents into a normal attack's suspension window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX13-044", as: "normal" },
            { card: "EX13-045", as: "inherited", under: ["EX13-044"] },
            { card: "BT20-023", as: "battler" },
            { card: "BT1-014", as: "firstTrigger" },
            { card: "BT1-014", as: "secondTrigger" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "firstVictim", dp: 1000 },
            { card: "BT1-013", as: "secondVictim", dp: 1000 },
          ],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    // The public attack path must refresh resident watchers itself.

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("firstTrigger").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => triggeredEvents(s, ["EX13-044"]).length > 0);

    expect(triggeredEvents(s, ["EX13-044"]).length).toBeGreaterThan(0);
    expect(s.events.some((event) => event.kind === "combatResolved")).toBe(true);
  });

  it("resolves a derived suspension watcher before the older pending attack watcher", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-074", as: "vortexdramon" },
            { card: "BT12-056", as: "granKuwagamon" },
          ],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "victim" }],
          security: ["BT1-010"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds,
        preferTriggerKeys: ["ir-12-0", "BT12-056"],
      },
    );
    preferInstanceIds.push(s.perm("victim").permanentId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("vortexdramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        triggeredEvents(s, ["EX11-074"]).some((event) => event.timing === "whenSuspended") &&
        triggeredEvents(s, ["BT12-056"]).length > 0,
    );

    const triggered = triggeredEvents(s, ["EX11-074", "BT12-056"]);
    expect(triggered.map((event) => `${event.sourceCardId}:${event.timing}`)).toEqual([
      "EX11-074:OnUseAttack",
      "BT12-056:whenSuspended",
      "EX11-074:whenSuspended",
    ]);
  });

  it("does not create an attacker-suspension trigger for a withoutTap attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX11-074", as: "vortexdramon", suspended: true }], security: ["BT1-009"] },
        1: { security: ["BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await internalsOf(s.engine).combat.resolveAttack(
      0,
      s.perm("vortexdramon"),
      { kind: "player" },
      { withoutTap: true },
    );

    expect(s.perm("vortexdramon").isSuspended).toBe(true);
    expect(triggeredEvents(s, ["EX11-074"]).some((event) => event.timing === "whenSuspended")).toBe(false);
    expect(triggeredEvents(s).some((event) => event.timing === "OnUseAttack")).toBe(true);
  });

  it.each(["ir-12-0", "whenSuspended"])(
    "keeps the derived suspension trigger ahead of an older nested attack trigger despite preference %s",
    async (firstKey) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "EX11-074", as: "vortex", under: ["BT23-003"] },
              { card: "BT22-043", as: "csColorSource" },
            ],
            hand: [{ card: "BT23-100", as: "option" }],
            deck: ["BT1-009", "BT1-010"],
          },
          1: { security: ["BT1-009", "BT1-010"] },
        },
        {
          autoAcceptOptional: true,
          autoSelectCards: true,
          declinePrompts: ["Suspend", "Unsuspend", "Battle"],
          preferTriggerKeys: [firstKey],
        },
      );
      s.state.memory = 10;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.events.some((event) => event.kind === "attackDeclared") && !observe(s.engine).isAttacking());
      expect(triggeredEvents(s, ["EX11-074"]).map((event) => event.timing)).toEqual([
        "whenSuspended",
        "OnUseAttack",
      ]);
    },
  );
});
