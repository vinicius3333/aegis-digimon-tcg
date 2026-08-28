import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-072.js";

describe("BT18-072 AncientBeetlemon", () => {
  it("matches the catalog, full IR, and exact DigiXros recipe", () => {
    expect(getCardDefinition("BT18-072")).toMatchObject({
      cardId: "BT18-072",
      nameEn: "AncientBeetlemon",
      colors: ["Black", "Yellow"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [
        { color: "Black", level: 5, memoryCost: 3 },
        { color: "Yellow", level: 5, memoryCost: 3 },
      ],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Ancient Insect", "Ten Warriors", "Insectoid"],
    });
    expect(compiled).toMatchObject({
      effects: [
        ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
          trigger,
          actions: [
            {
              kind: "DeDigivolve",
              amount: 2,
              target: { count: 2, filter: { controller: "opponent", kind: ["Digimon"] } },
            },
          ],
        })),
        {
          trigger: "AllTurns",
          actions: [
            {
              kind: "Replacement",
              event: "wouldLeavePlay",
              sourceFilter: { isSelfRef: true },
            },
          ],
        },
        { trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Insectoid"] }] },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ level: 5, traits: ["Insectoid"], cost: 3, isAlternate: true }],
      digiXrosRequirement: [
        {
          materials: [{ names: ["Beetlemon"] }, { names: ["MetalKabuterimon"] }],
          count: 2,
        },
      ],
    });
  });

  it("naturally plays for 11 and de-digivolves two opposing Digimon by two cards each", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-072", as: "ancient" }] },
        1: {
          battleArea: [
            { card: "BT1-060", as: "first", under: ["BT1-030", "BT1-032"] },
            { card: "BT1-060", as: "second", under: ["BT1-030", "BT1-032"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ancient").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("first").stack.length === 0 && s.perm("second").stack.length === 0);

    expect(s.perm("first").stack).toHaveLength(0);
    expect(s.perm("second").stack).toHaveLength(0);
    expect(s.state.memory).toBe(-1);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("ancient"), "Insectoid")).toBe(true);
    assertNoLoudGap(s);
  });

  it("naturally evolves from an Insectoid level 5 and resolves the When Digivolving copy", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-070", as: "base" }],
          hand: [{ card: "BT18-072", as: "ancient" }],
        },
        1: { battleArea: [{ card: "BT1-060", as: "target", under: ["BT1-030", "BT1-032"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ancient").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT18-072");

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain("BT18-070");
    expect(s.perm("target").stack).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("DigiXroses exactly one Beetlemon and one MetalKabuterimon for the two -2 reductions", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT18-072", as: "ancient" },
          { card: "BT18-063", as: "beetlemon" },
          { card: "BT18-067", as: "metalKabuterimon" },
        ],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("ancient").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("beetlemon").instanceId, s.inst("metalKabuterimon").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-072"));

    expect(s.perm("ancient").stack.map(({ cardId }) => cardId).sort()).toEqual(["BT18-063", "BT18-067"].sort());
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it("rejects a DigiXros declaration with two Beetlemon cards instead of the printed pair", () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT18-072", as: "ancient" },
          { card: "BT18-063", as: "firstBeetlemon" },
          { card: "BT18-063", as: "secondBeetlemon" },
        ],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("ancient").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("firstBeetlemon").instanceId, s.inst("secondBeetlemon").instanceId],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT18-072", "BT18-063", "BT18-063"]);
  });

  it("naturally replaces its battle deletion by playing an eligible level-4 stack card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-072", as: "ancient", dp: 5000, suspended: true, under: ["BT18-063"] }] },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const ancientId = s.perm("ancient").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("ancient").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-063"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === ancientId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-063")).toBe(true);
    assertNoLoudGap(s);
  });
});
