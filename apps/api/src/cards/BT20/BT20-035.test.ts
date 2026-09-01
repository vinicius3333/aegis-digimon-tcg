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
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-035", as: "kazuchimon" }],
          hand: [{ card: "BT20-085", as: "tamer" }],
        },
        1: { battleArea: [{ card: "BT20-010", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("kazuchimon"), "Fortitude")).toBe(true);
    await advance(s.engine).verb.placeUnder(s.perm("kazuchimon").permanentId, [s.inst("tamer").instanceId]);
    await settle(() => s.perm("target").isSuspended && observe(s.engine).isRestricted(s.perm("target"), "unsuspend"));
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
});
