import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-048 ForgeBeemon", () => {
  it("has and publicly pays the Royal Base level-3 evolution route", async () => {
    expect(digivolutionRequirementsFor("BT19-048")).toContainEqual({
      level: 3, traits: ["Royal Base"], cost: 2, isAlternate: true,
    });
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT18-044", as: "base" }],
      hand: [{ card: "BT19-048", as: "forge" }], deck: ["BT19-030"],
    } });
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, {
      type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("forge").instanceId,
      useAlternateCost: true, alternateRequirementIndex: 0,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-048");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT18-044"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT19-048")).toBe(false);
  });

  it("face-up security gives all and only controller Royal Base Digimon +1000 DP", async () => {
    const s = setupEngine({ 0: {
      security: [{ card: "BT19-048", faceUp: true }],
      battleArea: [
        { card: "BT19-045", as: "firstRoyal" },
        { card: "BT19-052", as: "secondRoyal" },
        { card: "BT19-046", as: "plain" },
      ],
    } });
    await s.ready();
    expect(s.perm("firstRoyal").currentDP).toBe(2000);
    expect(s.perm("secondRoyal").currentDP).toBe(9000);
    expect(s.perm("plain").currentDP).toBe(3000);
  });

  it("a face-down security copy provides no Royal Base DP buff", async () => {
    const s = setupEngine({ 0: {
      security: ["BT19-048"], battleArea: [{ card: "BT19-045", as: "royal" }],
    } });
    await s.ready();
    expect(s.perm("royal").currentDP).toBe(1000);
  });

  it("pays once to prevent all simultaneous other Royal Base effect departures (Q3098)", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT19-048", as: "forge" },
      { card: "BT19-045", as: "firstRoyal" },
      { card: "BT19-052", as: "secondRoyal" },
      { card: "BT19-046", as: "plain" },
    ] } }, { autoAcceptOptional: true });
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([
      s.perm("firstRoyal").permanentId,
      s.perm("secondRoyal").permanentId,
      s.perm("plain").permanentId,
    ], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-045")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-052")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-046")).toBe(false);
    expect(s.state.players[0]!.security.at(-1)?.cardId).toBe("BT19-048");
    expect(s.state.players[0]!.security.at(-1)?.faceUp).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT19-048")).toBe(false);
  });

  it("does not prevent a Royal Base Digimon's battle deletion", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT19-048", as: "forge" }, { card: "BT19-045", as: "royal" },
    ] } }, { autoAcceptOptional: true });
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("royal").permanentId], "byBattle")).toBe(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-048")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("has the Insectoid rule trait and gives its evolution host inherited +1000 DP", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT19-048", as: "forge" }, { card: "BT19-052", as: "host", under: ["BT19-048"] },
    ] } });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("forge"), "Insectoid")).toBe(true);
    expect(s.perm("host").currentDP).toBe(9000);
  });
});
