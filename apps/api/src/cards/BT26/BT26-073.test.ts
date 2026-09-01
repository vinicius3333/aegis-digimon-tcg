import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-073.js";
import "../index.js";

describe("BT26-073 Aegiochusmon: Dark", () => {
  it("encodes both exclusive costs, On Deletion play, inherited Security Attack, and Wizard", () => {
    expect(getCardDefinition("BT26-073")).toMatchObject({
      nameEn: "Aegiochusmon: Dark",
      colors: ["Purple", "Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 8000,
      types: ["Shaman", "Iliad", "TS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
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
    expect(compiled.digivolutionRequirement).toContainEqual({
      namesExact: ["Aegiomon"],
      cost: 3,
      isAlternate: true,
    });
    expect(digivolutionRequirementsFor("BT26-073")).toContainEqual({
      namesExact: ["Aegiomon"],
      cost: 3,
      isAlternate: true,
    });
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

  it("digivolves from an off-color Aegiomon for the named cost 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-033", as: "aegiomon" }],
        hand: [{ card: "BT26-073", as: "dark" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("aegiomon").permanentId,
        instanceId: s.inst("dark").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("aegiomon").topCard.cardId === "BT26-073");

    expect(s.state.memory).toBe(0);
  });

  it("uses one level-4 TS Assembly card for the printed reduction", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-073", as: "dark" }],
          trash: [{ card: "BT26-069", as: "level4Ts" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dark").instanceId,
        assembly: { materialInstanceIds: [s.inst("level4Ts").instanceId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-073"));

    const dark = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT26-073");
    expect(dark?.stack.map(({ cardId }) => cardId)).toEqual(["BT26-069"]);
    expect(s.state.memory).toBe(0);
  });

  it("Q7098 keeps the level-4 ceiling on the TS side of the Assembly union", () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT26-073", as: "dark" }],
        trash: [{ card: "BT26-060", as: "level6Ts" }],
      },
    });
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dark").instanceId,
        assembly: { materialInstanceIds: [s.inst("level6Ts").instanceId] },
      } as never),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("pays the self-delete mode and deletes only an opponent level 5 or lower Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT26-073", as: "dark" }] },
        1: {
          battleArea: [
            { card: "BT26-074", as: "low" },
            { card: "BT26-060", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dark").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 1);
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

  it("may decline the optional On Deletion play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-073", as: "dark" }], hand: [{ card: "BT26-069", as: "candidate" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("dark").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("candidate").instanceId);
  });

  it("finishes the parent deletion after its self-cost On Deletion plays a TS card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-073", as: "dark" }],
          hand: [{ card: "BT26-069", as: "candidate" }],
        },
        1: { battleArea: [{ card: "BT26-074", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("dark"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-069"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT26-069"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
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
          { card: "BT26-059", as: "host", under: ["BT26-073"] },
          { card: "BT26-073", as: "standalone" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("standalone"), "Wizard")).toBe(true);
  });

  it("executes inherited Security A. +1 for two security checks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-059", as: "host", under: ["BT26-073"] }] },
        1: { security: ["BT1-001", "BT1-002", "BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
