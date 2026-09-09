import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-059.js";
import "./EX5-058.js";
import "../BT1/BT1-009.js";
import "../BT1/BT1-010.js";
import "../BT1/BT1-011.js";
import "../BT10/BT10-011.js";
import "../BT13/BT13-063.js";
import "../P/P-065.js";
import "../EX2/EX2-041.js";
import "../ST1/ST1-03.js";
import "../index.js";

describe("EX5-059 Dobermon (X Antibody)", () => {
  it("matches the catalog and encodes every printed clause", () => {
    expect(getCardDefinition("EX5-059")).toMatchObject({
      cardId: "EX5-059",
      nameEn: "Dobermon (X Antibody)",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 4000,
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Dark Animal", "X Antibody"],
      effectText: expect.stringContaining("activate this Digimon's [On Play] effects"),
      inheritedEffectText: expect.stringContaining("When an effect plays one of your Digimon"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toEqual([
      {
        kind: "GainKeyword",
        target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
        keyword: { keyword: "Retaliation", raw: "＜Retaliation＞" },
        duration: "untilOpponentTurnEnd",
      },
    ]);
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
      {
        kind: "ActivateForeignEffect",
        zone: "digivolutionCards",
        fromTriggers: ["OnPlay"],
        filter: { nameOrTrait: [{ tokens: ["Gammamon"], match: "name" }] },
        count: 1,
      },
    ]);
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
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("draws one, trashes one, and reactivates On Play through a legal public evolution", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-071", as: "base" }],
          hand: [
            { card: "EX5-059", as: "evolving" },
            { card: "BT1-009", as: "discard" },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("discard").instanceId);
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX5-059");
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT14-071"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-009");
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Retaliation")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("reactivates both this card's and Gammamon's On Play effects for the Q3656 stack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT14-071",
              as: "base",
              under: ["EX2-041", "BT10-011", "P-065"],
            },
          ],
          hand: [
            { card: "EX5-059", as: "evolving" },
            { card: "BT1-009", as: "discard" },
          ],
          deck: ["BT1-010"],
        },
        // Match P-065's focused boundary fixture: ST1-03 is printed at exactly
        // 2000 DP, so its reactivated On Play deletion has one legal target.
        1: {
          battleArea: [
            { card: "ST1-03", as: "target", dp: 2000 },
            { card: "BT1-009", as: "safe", dp: 2000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const targetPermanentId = s.perm("target").permanentId;
    const targetInstanceId = s.perm("target").topCard!.instanceId;
    preferred.push(s.inst("discard").instanceId, targetPermanentId, s.perm("target").topCard!.instanceId);
    s.state.memory = 2;
    await s.ready();
    expect(s.perm("target").currentDP).toBe(2000);
    expect(s.perm("safe").currentDP).toBe(2000);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.length === 1 &&
        s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-009"),
    );
    const p065TargetDecision = s.decisions.find(
      ({ req }) =>
        req.sourceCardId === "EX5-059" &&
        req.kind === "chooseTargets" &&
        req.options?.candidateInstanceIds.includes(targetPermanentId),
    );
    expect(p065TargetDecision?.req.options?.candidateInstanceIds).toEqual(expect.arrayContaining([targetPermanentId]));
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === targetPermanentId)).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === targetInstanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-009")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Retaliation")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.pendingDecision).toBeUndefined();

    const negative = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-071", as: "base", under: ["BT13-063"] }],
          hand: [
            { card: "EX5-059", as: "evolving" },
            { card: "BT1-009", as: "discard" },
          ],
          deck: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 2000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    negative.state.memory = 2;
    await negative.ready();
    expect(
      negative.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: negative.perm("base").permanentId,
        instanceId: negative.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(negative.state.players[1]!.battleArea).toHaveLength(1);
    expect(observe(negative.engine).hasKeyword(negative.perm("base"), "Retaliation")).toBe(false);
    expect(negative.state.pendingDecision).toBeUndefined();
  });

  it("gains inherited memory for a public effect-played Digimon, not a manual play", async () => {
    const effectPlay = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-071", as: "host", under: ["EX5-059"] }, { card: "BT1-009" }, { card: "BT1-010" }],
          hand: [{ card: "EX5-058", as: "source" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    effectPlay.state.memory = 6;
    await effectPlay.ready();
    expect(
      effectPlay.engine.applyIntent(0, { type: "playCard", instanceId: effectPlay.inst("source").instanceId }),
    ).toEqual({
      ok: true,
    });
    await settle(() =>
      effectPlay.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "TOKEN-Fujitsumon-Token"),
    );
    expect(
      effectPlay.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "TOKEN-Fujitsumon-Token"),
    ).toBe(true);
    expect(effectPlay.state.memory).toBe(2);
    expect(effectPlay.state.pendingDecision).toBeUndefined();

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
    expect(manualPlay.state.pendingDecision).toBeUndefined();
  });

  it("rejects evolution from a non-purple level-three source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "wrongSource" }], hand: [{ card: "EX5-059", as: "evolving" }] },
    });
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongSource").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX5-059"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
