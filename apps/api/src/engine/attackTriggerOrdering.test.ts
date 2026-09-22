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

  it("gives Shoutmon EX6's When Attacking and Alliance priority over EX5 opponent-attack watchers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-054", as: "metalEtemon", under: ["BT12-067", "EX5-048"] }],
          hand: [{ card: "BT11-040", as: "redirectCost" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT19-014", as: "shoutmonEx6" },
            { card: "BT1-009", as: "allianceAlly" },
          ],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("shoutmonEx6").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");

    const firstOrder = s.decisions.find(({ req }) => req.kind === "orderTriggers");
    expect(firstOrder?.seat).toBe(1);
    expect(firstOrder?.req.options?.triggerCardIds).toEqual(["BT19-014", "BT19-014"]);
    expect(
      s.events.some(
        (event) => event.kind === "effectTriggered" && ["EX5-048", "EX5-054"].includes(event.sourceCardId ?? ""),
      ),
    ).toBe(false);
  });

  it("resolves an effect-driven attacker's [When Attacking] before the security check it opens", async () => {
    // Match 89641815: BT26-015's "when your effect adds cards to a deck, 1 of your Digimon may
    // get +3000 DP and attack" ordered the attack from inside its own resolving body, so the
    // attacker's inherited BT26-009 [When Attacking] was parked as a nested pending trigger and
    // only drained once the security card had already been flipped — the hand prompt landing on
    // top of the reveal animation. §11-1 runs the When Attacking window before the check.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-014", as: "attacker", under: [{ card: "BT26-009" }] }],
          hand: [{ card: "BT26-015", as: "butenmon" }],
          trash: [{ card: "BT1-011", as: "returned" }],
          deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "prey", dp: 9000 }],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("butenmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));

    const whenAttacking = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT26-009",
    );
    const revealed = s.events.findIndex((event) => event.kind === "securityRevealed");
    expect(whenAttacking).toBeGreaterThanOrEqual(0);
    expect(revealed).toBeGreaterThanOrEqual(0);
    expect(whenAttacking).toBeLessThan(revealed);
    expect(
      s.events.find((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT26-009"),
    ).not.toMatchObject({ duringSecurityCheck: true });
  });
  // Turn-player priority on an EFFECT-DRIVEN attack (KB Q1976/Q1993 — BT10-052/BT10-070 ask
  // exactly this): the attacker's [When Attacking] effect pools into the ordering effect's
  // paused window, so the non-turn player's "when an opponent's Digimon attacks" watcher must
  // wait for that pool to drain instead of firing at the declaration. Uses a Digimon-hosted,
  // cost-free watcher to prove the ordering is event-level, not specific to Tamer-hosted
  // suspend-cost redirects (BT11-092).
  it("keeps an effect-driven attack's When Attacking ahead of an opponent-attack watcher", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-052", as: "watcher" },
            { card: "BT1-009", as: "suspendedAlly", suspended: true },
          ],
          security: ["BT1-009", "BT1-010"],
          deck: ["BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT13-021", as: "attacker", dp: 13000 }],
          hand: [{ card: "BT25-016", as: "grapLeomon" }],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    preferred.push(s.perm("attacker").permanentId);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("grapLeomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "attackDeclared") && !observe(s.engine).isAttacking());

    const triggered = s.events
      .filter((event) => event.kind === "effectTriggered")
      .map((event) => `${String(event.sourceCardId)}:${String(event.timing)}`);
    const whenAttacking = triggered.indexOf("BT13-021:OnUseAttack");
    const watcher = triggered.indexOf("BT10-052:whenOpponentAttacks");
    expect(whenAttacking).toBeGreaterThanOrEqual(0);
    expect(watcher).toBeGreaterThanOrEqual(0);
    expect(whenAttacking).toBeLessThan(watcher);
  });
});
