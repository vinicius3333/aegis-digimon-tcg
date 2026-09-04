import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-059.js";

describe("EX5-059 Dobermon (X Antibody)", () => {
  it("grants Retaliation to one of your Digimon until the opponent's turn ends", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Retaliation" },
      duration: "untilOpponentTurnEnd",
      target: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } },
    });
  });
  it("draws and trashes on digivolving, then reactivates its On Play effect for Dobermon/X Antibody", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "Draw", controller: "mine", amount: 1 },
      { kind: "Trash", target: { count: 1, filter: { controller: "mine", zone: "hand" } } },
      {
        kind: "ReactivateEffect",
        fromTrigger: "OnPlay",
        count: 1,
        condition: {
          kind: "selfDigivolutionStackHasTrait",
          filter: {
            nameOrTrait: [
              { match: "name", tokens: ["Dobermon"] },
              { match: "nameExact", tokens: ["X Antibody"] },
            ],
          },
        },
      },
    ]);
  });
  it("inherits once-per-turn memory when an effect plays your Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"], byEffect: true },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
  });

  it("grants Retaliation to one own Digimon through the public On Play intent", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX5-059", as: "source" }] } });
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("source"), "Retaliation"));
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Retaliation")).toBe(true);
  });

  it("reactivates On Play only for an exact X Antibody or Dobermon stack name", async () => {
    const resolve = async (stackCard: string) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT14-071", as: "base", under: [stackCard] }],
            hand: [
              { card: "EX5-059", as: "evolving" },
              { card: "BT1-001", as: "discard" },
            ],
            deck: ["BT1-010"],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 2;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("evolving").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle();
      return observe(s.engine).hasKeyword(s.perm("base"), "Retaliation");
    };

    expect(await resolve("BT9-109")).toBe(true);
    expect(await resolve("BT13-063")).toBe(false);
  });

  it("gains memory once for effect-played own Digimon, not for manual play", async () => {
    const effectPlay = setupEngine({
      0: { battleArea: [{ card: "BT14-071", as: "host", under: ["EX5-059"] }], hand: ["BT1-009", "BT1-010"] },
    });
    await effectPlay.ready();
    effectPlay.state.memory = 0;
    await advance(effectPlay.engine).verb.playInstances([effectPlay.state.players[0]!.hand[0]!.instanceId], "EX5-059");
    await advance(effectPlay.engine).verb.playInstances([effectPlay.state.players[0]!.hand[0]!.instanceId], "EX5-059");
    await settle();
    expect(effectPlay.state.memory).toBe(1);

    const manualPlay = setupEngine({
      0: {
        battleArea: [{ card: "BT14-071", as: "host", under: ["EX5-059"] }],
        hand: [{ card: "BT1-009", as: "manual" }],
      },
    });
    manualPlay.state.memory = 10;
    await manualPlay.ready();
    expect(
      manualPlay.engine.applyIntent(0, { type: "playCard", instanceId: manualPlay.inst("manual").instanceId }),
    ).toEqual({ ok: true });
    await settle();
    expect(manualPlay.state.memory).toBe(8);
  });
});
