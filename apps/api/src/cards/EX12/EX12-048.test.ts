import { describe, expect, it } from "vitest";
import {
  assemblyRequirementFor,
  compiledEffects,
  EffectTiming,
  digivolutionRequirementsFor,
  getCardDefinition,
} from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { compiled } from "./EX12-048.js";
import "../index.js";

describe("EX12-048 SeitenGokuumon", () => {
  it("maps evolution, Assembly, keywords, scaled target reduction, and leave-play replacement", () => {
    expect(getCardDefinition("EX12-048")).toMatchObject({
      nameEn: "SeitenGokuumon",
      colors: ["Yellow", "Red", "Blue"],
      playCost: 5,
      dp: 12000,
      level: 6,
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Tathāgata", "Shambala", "SW"],
      evoCosts: [
        { color: "Yellow", level: 5, memoryCost: 5 },
        { color: "Red", level: 5, memoryCost: 5 },
        { color: "Blue", level: 5, memoryCost: 5 },
      ],
    });
    expect(digivolutionRequirementsFor("EX12-048")).toEqual([
      { level: 5, texts: ["Gokuumon"], cost: 3, isAlternate: true },
      { level: 5, traits: ["Shambala"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.assemblyRequirement).toEqual([
      {
        materials: [{ count: 3, names: ["Gokuumon", "Sangomon", "Cho-Hakkaimon", "Sanzomon"], differentNames: true }],
        reduceCost: 6,
      },
    ]);
    expect(compiled.effects.filter((effect) => effect.trigger === "Static")).toEqual([
      { trigger: "Static", actions: [], keywords: [{ keyword: "Rush", raw: "＜Rush＞" }] },
      { trigger: "Static", actions: [], keywords: [{ keyword: "Raid", raw: "＜Raid＞" }] },
      { trigger: "Static", actions: [], keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] },
      {
        trigger: "Static",
        actions: [],
        keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }],
      },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "ModifyDP", amount: -8000, duration: "untilOpponentTurnEnd" },
          {
            kind: "ModifyDP",
            amount: -3000,
            duration: "untilOpponentTurnEnd",
            scaling: { per: 1, filter: { levels: [5] }, unit: "digivolutionCards" },
            target: { sameTarget: true },
          },
          { kind: "Attack", optional: true, withoutSuspending: false },
        ],
      });
    }
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanYourEffect",
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["digivolutionCards"],
              fromOwnDigivolutionStack: true,
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(assemblyRequirementFor("EX12-048")).toEqual(compiled.assemblyRequirement);
    expect(registeredCompiledCards.get("EX12-048")).toEqual(compiled);
    expect(compiledEffects["EX12-048"]).toEqual(compiled);
  });

  it("applies both reductions to the same selected opponent on both printed timings", async () => {
    for (const timing of [EffectTiming.OnPlay, EffectTiming.WhenDigivolving]) {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "EX12-048", as: "source", dp: 50000, under: ["BT1-020", "BT1-024"] }] },
          1: {
            battleArea: [
              { card: "BT1-009", as: "first", dp: 40000 },
              { card: "BT1-011", as: "second", dp: 40000 },
            ],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );

      await advance(s.engine).fire(timing, s.perm("source"));
      await settle();

      expect([s.perm("first").currentDP, s.perm("second").currentDP].sort((a, b) => a - b)).toEqual([26000, 40000]);
      expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
      expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(["BT1-020", "BT1-024"]);
    }
  });

  it("Q6822 keeps a 0-DP target present through the optional attack and Raid redirection", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-048", as: "source" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 8000 }], security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.events.some((event) => event.kind === "attackDeclared"));

    await settle(() => s.state.players[1]!.battleArea.every(({ permanentId }) => permanentId !== targetId));
    expect(s.events.filter((event) => event.kind === "attackDeclared").at(-1)).toMatchObject({
      target: { kind: "permanent", permanentId: targetId },
    });
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("assembles with 3 allowed different names and clamps the reduced play cost to 0", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-048", as: "source" }],
          trash: [
            { card: "EX12-015", as: "gokuumon" },
            { card: "BT4-022", as: "sangomon" },
            { card: "BT12-041", as: "choHakkaimon" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        assembly: {
          materialInstanceIds: [
            s.inst("gokuumon").instanceId,
            s.inst("sangomon").instanceId,
            s.inst("choHakkaimon").instanceId,
          ],
        },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX12-048"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]!.stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX12-015", "BT4-022", "BT12-041"]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.state.players[0]!.battleArea[0]!.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("rejects Assembly materials that repeat the same allowed name", () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX12-048", as: "source" }],
        trash: [
          { card: "EX12-015", as: "first" },
          { card: "EX12-015", as: "second" },
          { card: "EX12-015", as: "third" },
        ],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        assembly: {
          materialInstanceIds: [s.inst("first").instanceId, s.inst("second").instanceId, s.inst("third").instanceId],
        },
      } as never),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("plays up to two eligible level-5 cards from its own stack when removed by an opponent effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-048", as: "source", under: ["BT12-039", "EX6-024"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(
      expect.arrayContaining(["BT12-039", "EX6-024"]),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-048")).toBe(false);
  });

  it("does not play stack cards when its controller's own effect removes it", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-048", as: "source", under: ["EX12-015", "EX12-029"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("Q6821/Q6823 applies level 5 to both leave-play eligibility branches", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX12-048",
              as: "source",
              under: [
                { card: "EX6-024", as: "gokuumonText" },
                { card: "EX12-006", as: "lowLevelSw" },
                { card: "BT1-020", as: "unrelatedLevelFive" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("gokuumonText").instanceId);
    s.state.turnSeat = 1;

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX6-024"]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("lowLevelSw").instanceId, s.inst("unrelatedLevelFive").instanceId]),
    );
  });

  it("also plays eligible sources when it leaves through battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-048", as: "source", suspended: true, under: ["EX12-015"] }] },
        1: { battleArea: [{ card: "BT1-024", as: "attacker", dp: 15000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const sourceId = s.perm("source").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: sourceId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX12-015"));

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === sourceId)).toBe(false);
  });

  it("digivolves through all printed colors and both alternate predicates", async () => {
    for (const [baseCardId, useAlternateCost, expectedCost] of [
      ["EX12-045", false, 5],
      ["BT1-020", false, 5],
      ["EX12-029", false, 5],
      ["EX6-024", true, 3],
      ["EX12-063", true, 3],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: "EX12-048", as: "target" }] },
      });
      s.state.memory = 5;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("target").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX12-048");
      expect(s.state.memory).toBe(5 - expectedCost);
    }
  });

  it("rejects an off-color level-5 card matching neither alternate predicate", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-075", as: "base" }], hand: [{ card: "EX12-048", as: "target" }] },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("target").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
