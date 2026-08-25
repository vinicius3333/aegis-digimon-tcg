import { describe, expect, it } from "vitest";
import { EffectTiming, type Seat } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./BT22-019.js";
import { compiled } from "./BT22-022.js";

describe("BT22-022 Veedramon", () => {
  it("gates the Tamer play at one or fewer Tamers and limits inherited protection to opponent effects", () => {
    const whenDigivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      condition: { kind: "permanentCount", op: "lte", value: 1, filter: { kind: ["Tamer"] } },
      target: {
        filter: { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["Veedramon"], match: "text" }] },
        count: 1,
      },
    });
    const inherited = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(inherited).toMatchObject({ isInherited: true, frequency: "OncePerTurn" });
    expect(inherited?.actions[0]).toMatchObject({
      event: "wouldLeavePlay",
      leaveCause: "opponentEffect",
      sourceFilter: {
        controllerDefault: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Veedramon"], match: "name" }],
      },
    });
  });

  it("uses the alternate CS evolution route and plays a Tamer whose whole text mentions Veedramon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-019", as: "veemon" },
            { card: "BT22-083", as: "existingTamer" },
          ],
          hand: [
            { card: "BT22-022", as: "veedramon" },
            { card: "BT11-112", as: "rina" },
            { card: "BT1-086", as: "invalidTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("veemon").permanentId,
        instanceId: s.inst("veedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("veemon").topCard?.cardId === "BT22-022");

    // BT22-019's resident Your Turn effect reduces Veedramon-name evolution by 1,
    // composing with BT22-022's printed CS route (2 -> 1).
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT11-112")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("invalidTamer").instanceId]);
  });

  it("does not play the Tamer with two Tamers already in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-022", as: "veedramon" },
            { card: "BT22-083", as: "firstTamer" },
            { card: "BT22-085", as: "secondTamer" },
          ],
          hand: [{ card: "BT11-112", as: "rina" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("veedramon"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("rina").instanceId]);
  });

  it("allows the optional Tamer play to be refused", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-022", as: "veedramon" }],
          hand: [{ card: "BT11-112", as: "rina" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();

    const resolution = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("veedramon"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await resolution;

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("rina").instanceId]);
  });

  it("suspends its Veedramon host to prevent one opponent-effect deletion per turn", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT22-022", under: ["BT22-022"], as: "host" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(1 as Seat, ["Digimon"]);
    try {
      expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
      expect(s.perm("host").isSuspended).toBe(true);
      expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("does not prevent removal by its controller's effect", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT22-022", under: ["BT22-022"], as: "host" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(0 as Seat, ["Digimon"]);
    try {
      expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});
