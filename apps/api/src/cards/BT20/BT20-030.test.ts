import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-030.js";
import "./index.js";

describe("BT20-030 Liollmon", () => {
  it("reveals three and independently adds one qualifying Digimon and one ACCEL Option", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                kind: ["Digimon"],
                nameOrTrait: [
                  { tokens: ["Chaosmon"], match: "name" },
                  { tokens: ["ACCEL"], match: "trait" },
                ],
              },
              count: 1,
              to: "hand",
            },
            {
              filter: { kind: ["Option"], nameOrTrait: [{ tokens: ["ACCEL"], match: "trait" }] },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toEqual([
      { keyword: "Barrier", raw: "＜Barrier＞" },
    ]);
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Frimon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["ACCEL"], cost: 0, isAlternate: true },
    ]);
  });

  it("adds one qualifying Digimon and one ACCEL Option, then bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-030", as: "liollmon" }],
          deck: [
            { card: "BT20-031", as: "accelDigimon" },
            { card: "BT20-099", as: "accelOption" },
            { card: "BT20-010", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("accelDigimon").instanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("accelOption").instanceId) &&
        s.state.players[0]!.deck.length === 1,
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
  });

  it("grants Barrier only when Liollmon is an inherited source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-031", as: "host", under: ["BT20-030"] },
          { card: "BT20-030", as: "top" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("top"), "Barrier")).toBe(false);
  });
});
