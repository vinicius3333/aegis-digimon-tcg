import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-035.js";
import "../BT1/BT1-096.js";
import "./index.js";

describe("BT20-035 Kazuchimon", () => {
  it("suspends and restricts separate opponent targets, and only activates its effect plus attack when a Tamer enters the stack", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } } },
        {
          kind: "Restrict",
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
          target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } },
        },
      ],
    });
    const reaction = compiled.effects.find((entry) => entry.trigger === "AllTurns" && !entry.isInherited);
    expect(reaction).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { controllerDefault: "mine" },
          triggerFilter: { isSelfRef: true },
          addedDigivolutionCardFilter: { kind: ["Tamer"] },
          actions: [
            { kind: "ActivateEffect", effectType: "WhenDigivolving" },
            { kind: "Attack", optional: true },
          ],
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          actions: [
            {
              kind: "SecurityManipulation",
              op: "addTop",
              source: "deck",
              condition: { kind: "selfHasNameContaining", names: ["Fenriloogamon"] },
            },
          ],
        },
      ],
    });
  });

  it("has Fortitude and reactivates its When Digivolving payload when a Tamer enters its stack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-035", as: "kazuchimon" }],
          hand: [{ card: "BT20-085", as: "tamer" }],
        },
        1: {
          battleArea: [
            { card: "BT20-010", as: "suspendTarget" },
            { card: "BT20-085", as: "restrictTarget" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("suspendTarget").permanentId, s.perm("restrictTarget").permanentId);
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("kazuchimon"), "Fortitude")).toBe(true);
    // The first When Digivolving choice suspends the Digimon; the second choice
    // intentionally selects a different Tamer, proving Q4343's separate targets.
    await advance(s.engine).verb.placeUnder(s.perm("kazuchimon").permanentId, [s.inst("tamer").instanceId]);
    await settle(
      () =>
        s.perm("suspendTarget").isSuspended && observe(s.engine).isRestricted(s.perm("restrictTarget"), "unsuspend"),
    );
    expect(s.perm("restrictTarget").isSuspended).toBe(false);
  });

  it.each([true, false])(
    "restricts its Tamer-triggered attack to an opponent Digimon (target exists: %s)",
    async (hasTarget) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT20-035", as: "kazu", under: ["BT20-003", "BT20-029", "BT20-032", "BT1-076"] },
              { card: "BT14-087", as: "tamer" },
            ],
            deck: Array(8).fill("BT1-010"),
          },
          1: {
            battleArea: [{ card: hasTarget ? "BT1-010" : "BT14-087", as: "target" }],
            security: Array(3).fill("BT1-010"),
            deck: Array(5).fill("BT1-010"),
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      const tamerId = s.inst("tamer").instanceId;
      const targetId = s.inst("target").instanceId;
      await s.ready();
      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      advance(s.engine).endMainPhaseIfOpen(0);
      await turn;
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
      expect(s.perm("kazu").stack[0]!.instanceId).toBe(tamerId);
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === tamerId)).toBe(false);
      expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(hasTarget);
      expect(s.events.some((event) => event.kind === "combatResolved")).toBe(hasTarget);
      expect(s.state.players[1]!.security).toHaveLength(3);
      expect(s.state.players[1]!.trash.some((card) => card.instanceId === targetId)).toBe(hasTarget);
      if (!hasTarget) expect(s.perm("target").isSuspended).toBe(true);
    },
  );

  it("publicly evolves from a legal level-5 SEEKERS Digimon and rejects a level-4 source", async () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT20-071", as: "soloogarmon" }], hand: [{ card: "BT20-035", as: "kazuchimon" }] },
    });
    legal.state.memory = 3;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("soloogarmon").permanentId,
        instanceId: legal.inst("kazuchimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => legal.perm("soloogarmon").topCard.cardId === "BT20-035" && legal.state.pendingDecision === undefined,
    );
    expect(legal.perm("soloogarmon").stack.map((card) => card.cardId)).toEqual(["BT20-071"]);
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT20-032", as: "bulkmon" }], hand: [{ card: "BT20-035", as: "kazuchimon" }] },
    });
    illegal.state.memory = 3;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("bulkmon").permanentId,
        instanceId: illegal.inst("kazuchimon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(illegal.perm("bulkmon").topCard.cardId).toBe("BT20-032");
  });

  it("does not react when a Tamer enters a different Digimon's stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-035", as: "kazuchimon" },
            { card: "BT20-030", as: "otherHost" },
          ],
          hand: [{ card: "BT20-085", as: "tamer" }],
        },
        1: { battleArea: [{ card: "BT20-010", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.placeUnder(s.perm("otherHost").permanentId, [s.inst("tamer").instanceId]);
    expect(s.perm("target").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(false);
  });

  it("recovers once when Fenriloogamon's security is removed", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-101", as: "host", under: ["BT20-035"] }],
        deck: [{ card: "BT20-010", as: "recovery" }],
      },
    });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("recovery").instanceId]);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("publicly replays the same Fortitude Digimon after it is deleted in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-035", suspended: true, as: "kazuchimon", under: ["BT20-071"] }],
          security: ["BT1-010"],
          deck: ["BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-010", dp: 13000, as: "attacker" }],
          security: ["BT1-010"],
          deck: ["BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const originalInstanceId = s.inst("kazuchimon").instanceId;
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("kazuchimon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === originalInstanceId),
    );
    const replayed = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === originalInstanceId,
    );
    expect(replayed).toBeDefined();
    expect(replayed!.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT20-071")).toBe(true);
  });

  it("naturally recovers from the deck when a Fenriloogamon host removes security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-101", as: "host", under: ["BT20-035"] }],
          security: [{ card: "BT1-010", as: "ownSecurity" }],
          deck: [{ card: "BT20-010", as: "recovery" }, "BT1-010"],
        },
        1: { battleArea: [{ card: "BT20-010", as: "attacker" }], deck: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.events.some((event) => event.kind === "securityChecked") && s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toContain(s.inst("recovery").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).not.toContain(s.inst("recovery").instanceId);
  });

  it("resolves the checked Security effect before inherited recovery (Q4344)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-101", under: ["BT20-035"], as: "host" }],
        security: [{ card: "BT1-096", as: "option" }],
        deck: [{ card: "BT1-010", as: "drawn" }, { card: "BT1-010", as: "recovered" }, "BT1-010"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("drawn").instanceId,
      s.inst("option").instanceId,
    ]);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("recovered").instanceId]);
  });

  it("recovers only once per turn from your security removals, ignores opponent security loss, then resets next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-101", as: "host", under: ["BT20-035"] },
            { card: "BT1-010", dp: 12000, as: "ally" },
          ],
          security: ["BT1-010", "BT1-010"],
          deck: [
            { card: "BT1-010", as: "recovery1" },
            { card: "BT1-010", as: "recovery2" },
            { card: "BT1-010", as: "recovery3" },
            "BT1-010",
            "BT1-010",
            "BT1-010",
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", dp: 12000, as: "attacker1" },
            { card: "BT1-010", dp: 12000, as: "attacker2" },
          ],
          security: ["BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 5;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    for (const attacker of ["attacker1", "attacker2"] as const) {
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm(attacker).permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
    }
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("recovery1").instanceId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).not.toContain(s.inst("recovery2").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("recovery2").instanceId);

    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    // Own Draw consumed recovery2; opponent security loss must leave recovery3 in the deck.
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("recovery3").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const nextOpponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker1").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toContain(s.inst("recovery3").instanceId);
    advance(s.engine).endMainPhaseIfOpen(1);
    await nextOpponentTurn;
  });

  it("does not recover when the inherited host is not named Fenriloogamon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-091", as: "host", under: ["BT20-035"] }],
          security: ["BT1-010"],
          deck: [{ card: "BT20-010", as: "recovery" }],
        },
        1: { battleArea: [{ card: "BT20-010", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("recovery").instanceId);
  });
});
