import { describe, expect, it } from "vitest";
import {
  compiledEffects,
  EffectDuration,
  EffectTiming,
  digivolutionRequirementsFor,
  getCardDefinition,
} from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX12-052.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";

describe("EX12-052 Diarbbitmon", () => {
  it("maps evolution, keywords, Use Req., immunity, shared OPT, direct battle, and Option Main", () => {
    expect(digivolutionRequirementsFor("EX12-052")).toEqual([
      { level: 5, texts: ["Angoramon"], cost: 3, isAlternate: true },
      { level: 5, traits: ["NSp"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.effects.filter((effect) => effect.trigger === "Static")).toEqual([
      { trigger: "Static", actions: [], keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] },
      { trigger: "Static", actions: [], keywords: [{ keyword: "Vortex", raw: "＜Vortex＞" }] },
      {
        trigger: "Static",
        actions: [
          {
            kind: "WaiveColorRequirement",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            condition: {
              kind: "youHave",
              filter: {
                zone: "battleArea",
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["NSp"], match: "trait" }],
              },
              raw: "you have an [NSp] trait card in play",
            },
          },
        ],
      },
    ]);

    const digivolving = compiled.effects.filter((effect) => effect.trigger === "WhenDigivolving");
    expect(digivolving).toHaveLength(2);
    expect(digivolving[0]).toMatchObject({
      actions: [
        {
          kind: "Restrict",
          restriction: "beAffected",
          fromSourceKind: ["Digimon"],
          byOpponentEffectsOnly: true,
          duration: "untilOpponentTurnEnd",
        },
      ],
    });
    expect(digivolving[1]).toMatchObject({
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [
        { kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd", optional: true },
        {
          kind: "Battle",
          attacker: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1, fromSelectionRef: "buffedDigimon" },
          defender: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
      ],
    });
    for (const trigger of ["WhenAttacking", "Counter"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [{ kind: "ModifyDP" }, { kind: "Battle" }],
      });
    }
    expect(compiled.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
      actions: [
        { kind: "Unsuspend", optional: true },
        { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 2 } },
        {
          kind: "Restrict",
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
          target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 2 },
        },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(registeredCompiledCards.get("EX12-052")).toEqual(compiled);
    expect(compiledEffects["EX12-052"]).toEqual(compiled);
  });

  it("Q6836-Q6844 scopes immunity to opposing Digimon effects and forces battle after accepting the buff", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-052", as: "source", dp: 12000 }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => observe(s.engine).hasRestriction(s.perm("source"), "beAffected", "Digimon"));

    expect(s.perm("source").currentDP).toBe(15000);
    expect(observe(s.engine).hasRestriction(s.perm("source"), "beAffected", "Digimon")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);

    const sourceId = s.perm("source").permanentId;
    advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
    await advance(s.engine).verb.modifyDP(sourceId, 1000, EffectDuration.UntilOpponentTurnEnd);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("source").currentDP).toBe(16000);

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    await advance(s.engine).verb.modifyDP(sourceId, -1000, EffectDuration.UntilOpponentTurnEnd);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("source").currentDP).toBe(16000);

    advance(s.engine).verb.enterEffectResolution(1, ["Option"]);
    await advance(s.engine).verb.modifyDP(sourceId, -1000, EffectDuration.UntilOpponentTurnEnd);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("source").currentDP).toBe(15000);
  });

  it("shares the once-per-turn budget across When Digivolving and When Attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-052", as: "source", dp: 12000 }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    expect(s.perm("source").currentDP).toBe(15000);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    expect(s.perm("source").currentDP).toBe(15000);
  });

  it.each([
    ["When Attacking", EffectTiming.OnUseAttack],
    ["Counter", EffectTiming.OnCounterTiming],
  ])("executes the shared battle clause from %s", async (_label, timing) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-052", as: "source", dp: 12000 }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(timing, s.perm("source"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("source").currentDP).toBe(15000);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("resolves the Option Main face independently: unsuspends, suspends two, and locks two", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-050", as: "nsp" },
            { card: "BT1-009", as: "own", suspended: true },
          ],
          hand: [{ card: "EX12-052", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "oppOne" },
            { card: "BT1-010", as: "oppTwo" },
            { card: "BT1-011", as: "oppThree" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("oppOne").isSuspended && s.perm("oppTwo").isSuspended);
    await settle(() => false, 60);

    expect(s.perm("own").isSuspended).toBe(false);
    const locked = ["oppOne", "oppTwo", "oppThree"].filter((alias) =>
      observe(s.engine).isRestricted(s.perm(alias), "unsuspend"),
    );
    expect(locked).toHaveLength(2);
  });

  it("digivolves through both colors and both alternates, rejecting a nonmatch", async () => {
    for (const [baseCardId, useAlternateCost, expectedCost] of [
      ["BT1-075", false, 4],
      ["BT10-064", false, 4],
      ["BT13-055", true, 3],
      ["EX12-051", true, 3],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: "EX12-052", as: "target" }] },
      });
      s.state.memory = 4;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("target").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX12-052");
      expect(s.state.memory).toBe(4 - expectedCost);
    }

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-020", as: "base" }], hand: [{ card: "EX12-052", as: "target" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("target").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("maps the complete dual-card catalog identity and publishes both keywords", async () => {
    expect(getCardDefinition("EX12-052")).toMatchObject({
      nameEn: "Diarbbitmon",
      colors: ["Green", "Black"],
      kinds: ["Digimon", "Option"],
      playCost: 5,
      dp: 12000,
      level: 6,
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Beast Knight", "NSp"],
      evoCosts: [
        { color: "Green", level: 5, memoryCost: 4 },
        { color: "Black", level: 5, memoryCost: 4 },
      ],
      isDualCard: true,
      dualEffect: "Truskmore Advance",
      optionColorRequirements: ["Green"],
    });
    const s = setupEngine({ 0: { battleArea: [{ card: "EX12-052", as: "source" }] } });
    await s.ready();
    expect([...s.perm("source").keywords]).toEqual(expect.arrayContaining(["Piercing", "Vortex"]));
  });
});
