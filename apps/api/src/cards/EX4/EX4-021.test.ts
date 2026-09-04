import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

const EX4_021 = "EX4-021";
const BLUE_METALGREYMON = "BT10-024";
const DARKKNIGHTMON = "BT10-066";

describe("EX4-021 GreyKnightsmon", () => {
  it("registers the official identity and complete residual-free IR", () => {
    expect(getCardDefinition(EX4_021)).toMatchObject({
      cardId: EX4_021,
      nameEn: "GreyKnightsmon",
      colors: ["Blue", "Black"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Blue", level: 5, memoryCost: 5 },
        { color: "Black", level: 5, memoryCost: 5 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Dark Knight", "BlueFlare", "Twilight"],
    });
    expect(runtimeCompiledCard("EX4-021")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("de-digivolves one opposing Digimon and prevents all attacks by level 4 or lower Digimon", () => {
    expect(runtimeCompiledCard("EX4-021")?.effects?.[0]?.actions).toMatchObject([
      { kind: "DeDigivolve", amount: 1, target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } } },
      {
        kind: "Restrict",
        restriction: "attack",
        duration: "untilOpponentTurnEnd",
        whileMatchesTargetFilter: true,
        target: {
          count: "all",
          filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
        },
      },
    ]);
  });

  it("replays MetalGreymon and DarkKnightmon from its digivolution cards when leaving play", () => {
    expect(runtimeCompiledCard("EX4-021")?.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["digivolutionCards"],
          fromOwnDigivolutionStack: true,
          payCost: false,
          target: { filter: { nameOrTrait: [{ match: "nameExact", tokens: ["MetalGreymon"] }] } },
        },
        {
          kind: "PlayWithoutCost",
          from: ["digivolutionCards"],
          fromOwnDigivolutionStack: true,
          payCost: false,
          target: { filter: { nameOrTrait: [{ match: "nameExact", tokens: ["DarkKnightmon"] }] } },
        },
      ],
    });
  });

  it.each([
    ["blue", "EX4-019"],
    ["black", "EX4-045"],
  ])("digivolves from a %s level-5 Digimon for 5", async (_color, baseCard) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: EX4_021, as: "greyKnights" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("greyKnights").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === EX4_021);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([baseCard]);
  });

  it("de-digivolves first and dynamically restricts every opposing level 4 or lower Digimon (Q3461)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: EX4_021, as: "greyKnights" }] },
      1: {
        battleArea: [{ card: "EX4-020", as: "changing", under: ["EX4-016"] }],
        hand: [{ card: "EX4-019", as: "levelFive" }],
      },
    });
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("greyKnights"));
    await settle(() => s.perm("changing").topCard.cardId === "EX4-016");

    expect(observe(s.engine).isRestricted(s.perm("changing"), "attack")).toBe(true);
    const newcomer = s.putOnBoard(1, { card: "EX4-016" });
    await s.ready();
    expect(observe(s.engine).isRestricted(newcomer, "attack")).toBe(true);

    await advance(s.engine).verb.digivolveFromInstance(s.perm("changing").permanentId, s.inst("levelFive").instanceId, {
      costOverride: 0,
    });

    expect(s.perm("changing").topCard.cardId).toBe("EX4-019");
    expect(observe(s.engine).isRestricted(s.perm("changing"), "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(newcomer, "attack")).toBe(true);
  });

  it("plays at cost 8 (12 - 2×2) with both materials placed under it", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: EX4_021, as: "dx" },
            { card: BLUE_METALGREYMON, as: "mg" },
            { card: DARKKNIGHTMON, as: "dk" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const dx = s.inst("dx");
    const mg = s.inst("mg");
    const dk = s.inst("dk");
    s.state.memory = 8;

    const res = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: dx.instanceId,
      digiXros: { materialInstanceIds: [mg.instanceId, dk.instanceId] },
    });
    expect(res).toEqual({ ok: true });

    await settle(() => p0.battleArea.some((perm) => perm.topCard?.cardId === EX4_021) && p0.hand.length === 0);

    const perm = p0.battleArea.find((candidate) => candidate.topCard?.cardId === EX4_021);
    expect(perm).toBeDefined();
    expect(perm!.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining([BLUE_METALGREYMON, DARKKNIGHTMON]));
    expect(p0.hand.some((card) => card.instanceId === mg.instanceId)).toBe(false);
    expect(p0.hand.some((card) => card.instanceId === dk.instanceId)).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("rejects a material that satisfies no recipe slot", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: EX4_021, as: "dx" },
          { card: "AD1-001", as: "wrong" },
        ],
      },
    });
    const dx = s.inst("dx");
    const wrong = s.inst("wrong");
    s.state.memory = 10;

    const res = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: dx.instanceId,
      digiXros: { materialInstanceIds: [wrong.instanceId] },
    });
    expect(res.ok).toBe(false);
  });

  it("rejects name-containing X Antibody variants from the exact DigiXros recipe", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: EX4_021, as: "dx" },
          { card: "BT9-015", as: "metalGreymonX" },
          { card: "BT10-069", as: "darkKnightmonX" },
        ],
      },
    });
    s.state.memory = 12;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dx").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("metalGreymonX").instanceId, s.inst("darkKnightmonX").instanceId],
        },
      }).ok,
    ).toBe(false);
  });

  it("plays both exact cards from its own stack when it is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: EX4_021, as: "greyKnights", under: [BLUE_METALGREYMON, DARKKNIGHTMON] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const greyKnightsId = s.perm("greyKnights").permanentId;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([greyKnightsId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId).sort()).toEqual(
      [BLUE_METALGREYMON, DARKKNIGHTMON].sort(),
    );
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain(EX4_021);
  });

  it("does not borrow exact cards from another stack or accept name-containing variants", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: EX4_021, as: "greyKnights", under: ["BT9-015", "BT10-069"] },
            { card: "BT1-009", as: "donor", under: [BLUE_METALGREYMON, DARKKNIGHTMON] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const greyKnightsId = s.perm("greyKnights").permanentId;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([greyKnightsId], "byEffect");

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("donor").stack.map((card) => card.cardId)).toEqual([BLUE_METALGREYMON, DARKKNIGHTMON]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining([EX4_021, "BT9-015", "BT10-069"]),
    );
  });

  it("may decline the leave-play effect without replaying either source", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: EX4_021, as: "greyKnights", under: [BLUE_METALGREYMON, DARKKNIGHTMON] }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("greyKnights").permanentId], "byEffect");

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining([EX4_021, BLUE_METALGREYMON, DARKKNIGHTMON]),
    );
  });
});
