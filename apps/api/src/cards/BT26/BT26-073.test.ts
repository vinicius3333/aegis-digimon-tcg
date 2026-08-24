import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-073.js";
import "../index.js";

describe("BT26-073 Aegiochusmon: Dark", () => {
  it("encodes both exclusive costs, On Deletion play, inherited Security Attack, and Wizard", () => {
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "Modal",
      choose: 1,
      optional: true,
      abortOnDecline: true,
      options: [
        [{ kind: "Delete", cost: { kind: "deleteOwn" } }],
        [{ kind: "Delete", cost: { kind: "return", to: "deckBottom" } }],
      ],
    });
    expect(compiled.effects[2]?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand", "trash"],
      payCost: false,
      optional: true,
    });
    expect(compiled.effects[3]).toMatchObject({
      isInherited: true,
      keywords: [{ keyword: "SecurityAttack", amount: 1 }],
    });
    expect(compiled.effects[4]?.actions[0]).toMatchObject({ kind: "GrantStatic", grant: "trait", tokens: ["Wizard"] });
    expect(compiled.digivolutionRequirement).toContainEqual({ names: ["Aegiomon"], cost: 3, isAlternate: true });
    expect(compiled.assemblyRequirement).toEqual([
      {
        reduceCost: 2,
        materials: [
          {
            levelMax: 4,
            nameOrTrait: [
              { tokens: ["Chronomon"], match: "text" },
              { tokens: ["TS"], match: "trait" },
            ],
            count: 1,
          },
        ],
      },
    ]);
  });

  it("pays the self-delete mode and deletes only an opponent level 5 or lower Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-073", as: "dark" }] },
        1: {
          battleArea: [
            { card: "BT26-074", as: "low" },
            { card: "BT26-060", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("dark"));
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT26-060"]);
  });

  it("may return an exact Shaman or TS card from trash instead of deleting itself", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-073", as: "dark" }], trash: [{ card: "BT26-074", as: "cost" }] },
        1: { battleArea: [{ card: "BT26-074", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("dark"));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("may decline without paying either cost or deleting the opponent's Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-073", as: "dark" }], trash: [{ card: "BT26-074", as: "cost" }] },
        1: { battleArea: [{ card: "BT26-074", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("dark"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT26-073");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT26-074");
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("plays an eligible TS Digimon for free when deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-073", as: "dark" }], hand: [{ card: "BT26-069", as: "candidate" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("dark").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-069"));
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("can play an eligible TS Tamer rather than only a Digimon on deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-073", as: "dark" }], hand: [{ card: "BT26-090", as: "tsTamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("dark").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-090"));

    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("publishes inherited Security A. +1 and the rule-granted Wizard trait", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-074", as: "host", under: ["BT26-073"] },
          { card: "BT26-073", as: "standalone" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("standalone"), "Wizard")).toBe(true);
  });
});
