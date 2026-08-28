import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-037.js";
import "./index.js";

describe("BT20-037 Chaosmon: Valdur Arm", () => {
  it("scales suspension and memory by level 6 stack cards, then disables opponent On Play and unsuspend", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect).toMatchObject({
      actions: [
        {
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } },
          scaling: { per: 1, unit: "digivolutionCards", filter: { levels: [6] } },
        },
        { kind: "GainMemory", amount: 1, scaling: { per: 1, unit: "digivolutionCards", filter: { levels: [6] } } },
        {
          kind: "DisableTimingEffect",
          target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: "all" },
          timings: ["onPlay"],
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Restrict",
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
          target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: "all" },
        },
      ],
    });
    expect(compiled.effects.filter((entry) => entry.keywords?.length)).toHaveLength(2);
  });

  it("scales from two level-6 sources and locks every opposing Digimon and Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-035", under: ["BT20-036"], as: "base" }],
          hand: [{ card: "BT20-037", as: "valdur" }],
        },
        1: {
          battleArea: [
            { card: "BT20-010", as: "digimon" },
            { card: "BT20-085", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("valdur").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("digimon").isSuspended && s.perm("tamer").isSuspended && s.state.memory === 7);
    for (const alias of ["digimon", "tamer"]) {
      expect(observe(s.engine).isRestricted(s.perm(alias), "unsuspend")).toBe(true);
      expect(observe(s.engine).timingEffectDisabled(s.perm(alias), "onPlay")).toBe(true);
    }
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Partition")).toBe(true);
  });

  it("Partitions its specified yellow and green/black level-6 sources after opponent-effect deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-037", under: ["BT20-035", "BT20-036"], as: "valdur" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("valdur").permanentId], "byEffect");
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-035") &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-036"),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });
});
