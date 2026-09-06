import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-035.js";
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
      }),
    ).toEqual({ ok: true });
    await settle(
      () => legal.perm("soloogarmon").topCard.cardId === "BT20-035" && legal.state.pendingDecision === undefined,
    );
    expect(legal.perm("soloogarmon").stack.map((card) => card.cardId)).toEqual(["BT20-071"]);

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
        battleArea: [{ card: "BT14-081", as: "host", under: ["BT20-035"] }],
        deck: [{ card: "BT20-010", as: "recovery" }],
      },
    });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("recovery").instanceId]);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("naturally recovers from the deck when a Fenriloogamon host removes security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-081", as: "host", under: ["BT20-035"] }],
          security: [{ card: "BT20-003", as: "ownSecurity" }],
          deck: [{ card: "BT20-010", as: "recovery" }, "BT20-001"],
        },
        1: { battleArea: [{ card: "BT20-010", as: "attacker" }], deck: ["BT20-001", "BT20-001"] },
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
});
