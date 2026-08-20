import { describe, it, expect } from "vitest";
import {
  CardKind,
  EffectDuration,
  requireCardDefinition,
  isDigimon,
  isTamer,
  isOption,
  isDigiEgg,
  appFusionCostFor,
  assemblyRequirementFor,
  GameState,
  PlayerState,
  CardInstance,
  type Filter,
} from "@aegis/shared";
import { cite, markNotTestable } from "./_kb.js";
import "./not-testable.js";
import { definitionMatches } from "../effects/interpreter.js";
import type { Primitives } from "../effects/EffectContext.js";
import { MemoryGauge } from "../MemoryGauge.js";
import { applyOverflow } from "../state/access.js";
import { validateDecklist } from "../deckValidation.js";
import { RED_DECK } from "../testDecks.js";
import { setupEngine as setup, makeInstance as instance, makeDigimon as digimon, settle } from "../testkit/harness.js";
import "../../cards/index.js";
import { advance } from "../testkit/advance.js";

/**
 * Comprehensive Rules chapter 2 "Card Information" (comprehensive-0002, 0031-0052).
 * See `ch01-game-overview.test.ts` / README.md for the citation contract.
 */

// §2-1 (comprehensive-0031): the rule is about PHYSICAL reprints of the same card number
// carrying different (newer) text over time; the engine has exactly one CardDefinition per
// cardId (cards.json is a committed single-point-in-time snapshot), never
// multiple competing "versions" of the same printed card simultaneously resolvable at
// runtime. There is no "which version is newest" decision for the engine to get right or
// wrong, so there is no engine-observable consequence to assert.
markNotTestable(
  "comprehensive-0031",
  "Rule concerns physical card reprints with differing text over time; the engine's card " +
    "registry holds exactly one static definition per cardId with no version-overlay " +
    "concept, so there is no 'newest version' decision for the engine to make.",
);

describe("§2-2 Card Category (comprehensive-0032)", () => {
  it("2-2-3..2-2-6: the four card categories are distinct and drive real predicates", () => {
    cite("comprehensive-0032", "the four card categories: Digi-Egg, Digimon, Tamer, Option");

    const digimonDef = requireCardDefinition("AD1-001");
    expect(digimonDef.kinds).toEqual([CardKind.Digimon]);
    expect(isDigimon(digimonDef)).toBe(true);
    expect(isTamer(digimonDef)).toBe(false);

    const tamerDef = requireCardDefinition("AD1-019");
    expect(isTamer(tamerDef)).toBe(true);
    expect(isDigimon(tamerDef)).toBe(false);

    const optionDef = requireCardDefinition("BT1-090");
    expect(isOption(optionDef)).toBe(true);

    const eggDef = requireCardDefinition("BT1-001");
    expect(isDigiEgg(eggDef) || isDigimon(eggDef)).toBe(true); // at minimum resolves to a real kind
  });
});

describe("§2-3-1 Name (comprehensive-0034)", () => {
  it("2-3-1-4: an ACE card's stored name never literally contains 'ACE'", () => {
    cite("comprehensive-0034", "2-3-1-4 ACE is not included in the card name");

    const ace = requireCardDefinition("AD1-005");
    expect(ace.isAce).toBe(true);
    expect(ace.nameEn).not.toMatch(/ACE/);
    expect(ace.nameEn).toBe("Gaiamon");
  });

  it("2-3-1-2: bracket-name filtering (nameOrTrait) matches only that exact card name", () => {
    const marcusDef = requireCardDefinition("BT12-092");
    const filter: Filter = { nameOrTrait: [{ tokens: [marcusDef.nameEn], match: "nameExact" }] };
    expect(definitionMatches(filter, marcusDef)).toBe(true);

    const otherDef = requireCardDefinition("AD1-001");
    expect(definitionMatches(filter, otherDef)).toBe(false);
  });
});

describe("§2-3-2 Traits (comprehensive-0035)", () => {
  it("2-3-2-1/2-3-2-2: multiple traits (form/attribute/type) are separate, independently matchable", () => {
    cite("comprehensive-0035", "traits: form, attribute, and type; slash-separated when multiple");

    const def = requireCardDefinition("AD1-005"); // forms: God/Appmon, attributes: God, types: Creation
    expect(def.forms?.length).toBeGreaterThan(1);

    const traitFilter: Filter = { traits: ["Appmon"] };
    expect(definitionMatches(traitFilter, def)).toBe(true);
    const wrongTraitFilter: Filter = { traits: ["Dinosaur"] };
    expect(definitionMatches(wrongTraitFilter, def)).toBe(false);
  });
});

describe("§2-3-3 Effects / (Rule) (comprehensive-0036)", () => {
  it("2-3-3-1/2-3-11-1: upper text (effect) is a field distinct from inherited/security text", () => {
    cite("comprehensive-0036", "2-3-3 an effect is the upper text on a card");

    const def = requireCardDefinition("BT12-088");
    expect(def.effectText).toBeTruthy();
    expect(def.inheritedEffectText).toBeTruthy();
    expect(def.securityEffectText).toBeTruthy();
    // The three fields hold genuinely different text, not the same string duplicated.
    expect(def.effectText).not.toBe(def.inheritedEffectText);
    expect(def.effectText).not.toBe(def.securityEffectText);
  });
});

describe("§2-3-5 Digivolution Requirements (comprehensive-0037)", () => {
  it("2-3-5-2: a digivolution cost is a color+level+memory requirement engine code reads", () => {
    cite("comprehensive-0037", "2-3-5-2 digivolution cost required to digivolve");

    const def = requireCardDefinition("AD1-001");
    expect(def.evoCosts.length).toBeGreaterThan(0);
    const cost = def.evoCosts[0]!;
    expect(typeof cost.color).toBe("string");
    expect(typeof cost.level).toBe("number");
    expect(typeof cost.memoryCost).toBe("number");
  });
});

describe("§2-3-6 DNA Digivolution (comprehensive-0038)", () => {
  it("implemented: dnaDigivolveInto merges 2 battle-area materials into a new permanent carrying both as its digivolution stack", async () => {
    cite("comprehensive-0038", "DNA digivolution requirements, see 8-2");

    const s = setup();
    const p0 = s.state.players[0]!;
    // Vanilla materials/result (empty printed effectText — BT1-009/BT1-020 have none) so no
    // [When Digivolving]/[On Play] decision prompt is opened that this bare-engine setup (no
    // auto-response wiring) would otherwise leave hanging.
    const mat1 = digimon(0, 3000, "BT1-009");
    const mat2 = digimon(0, 4000, "BT1-009");
    p0.battleArea.push(mat1, mat2);
    const result = instance("BT1-020", 0, true); // a real Digimon card, loose in hand

    p0.hand.push(result);

    const fx = (s.engine as unknown as { primitives: Primitives }).primitives;
    const merged = await fx.dnaDigivolveInto([mat1.permanentId, mat2.permanentId], result.instanceId, {
      payCost: false,
    });

    expect(merged).toBeDefined();
    // Both materials left the battle area as their own permanents...
    expect(p0.battleArea.some((p) => p.permanentId === mat1.permanentId)).toBe(false);
    expect(p0.battleArea.some((p) => p.permanentId === mat2.permanentId)).toBe(false);
    // ...and the merged result is a single new permanent carrying both as digivolution cards.
    expect(p0.battleArea.some((p) => p.permanentId === merged!.permanentId)).toBe(true);
    expect(merged!.topCard?.cardId).toBe("BT1-020");
    expect(merged!.stack.map((c) => c.cardId)).toEqual(["BT1-009", "BT1-009"]);
  });
});

describe("§2-3-7 DigiXros Requirements (comprehensive-0039)", () => {
  it("implemented: playing EX10-058 via DigiXros reduces its cost per material and places both materials under it", async () => {
    cite("comprehensive-0039", "the requirements for a DigiXros");

    const { getCompiledCard, getCardDefinition } = await import("@aegis/shared");
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;

    const compiled = getCompiledCard("EX10-058");
    const requirement = compiled?.digiXrosRequirement?.[0];
    expect(requirement, "EX10-058 must carry a compiled digiXrosRequirement").toBeDefined();
    const perMaterialReduction = requirement!.count as number;
    const printedCost = getCardDefinition("EX10-058")?.playCost ?? 0;

    const lilithmon = instance("EX10-058", 0, false);
    // Real [Bagra Army]-trait Digimon (cards.json: BT10-073 ChuuChuumon, BT10-077 MadLeomon).
    const material1 = instance("BT10-073", 0, false);
    const material2 = instance("BT10-077", 0, false);
    p0.hand.push(lilithmon, material1, material2);
    s.state.memory = printedCost; // affords the full printed cost; DigiXros must reduce it

    // An opponent Digimon so the [On Play] grant clause has a legal candidate.
    p1.battleArea.push(digimon(1, 3000, "AD1-001"));
    const memoryBefore = s.state.memory;

    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: lilithmon.instanceId,
      digiXros: { materialInstanceIds: [material1.instanceId, material2.instanceId] },
    } as never);
    expect(result).toEqual({ ok: true });

    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "EX10-058"), 200);
    await settle(() => false, 60); // flush the [On Play] grant-recipient prompt
    const lilithPermanent = p0.battleArea.find((p) => p.topCard?.cardId === "EX10-058");
    expect(lilithPermanent).toBeDefined();

    // Memory charged equals the printed cost minus the per-material reduction (2 materials).
    const expectedCost = Math.max(0, printedCost - 2 * perMaterialReduction);
    expect(memoryBefore - s.state.memory).toBe(expectedCost);

    // Both materials ended up under the new EX10-058 permanent.
    const stackIds = lilithPermanent!.stack.map((c) => c.instanceId);
    expect(stackIds).toContain(material1.instanceId);
    expect(stackIds).toContain(material2.instanceId);
  });
});

describe("§2-3-8 Burst Digivolve (comprehensive-0040)", () => {
  /**
   * Shared setup for both tests below: BT13-020 (ShineGreymon: Burst Mode) digivolving onto a
   * real "ShineGreymon" base via its compiled alternate (Cost 0) digivolutionRequirement, with
   * memory pinned to the gauge's minimum so the NORMAL printed cost (5) is unaffordable — only
   * the Burst (Cost 0) path could legally succeed.
   */
  function layBurstScenario() {
    const s = setup({ autoSelectCards: true });
    const p0 = s.state.players[0]!;
    const base = digimon(0, 9000, "BT4-020"); // a real "ShineGreymon", Red Lv.6
    p0.battleArea.push(base);
    const marcus = digimon(0, 0, "BT12-092"); // a [Marcus Damon] Tamer, the alt-cost's return target
    p0.battleArea.push(marcus);
    const burstCard = instance("BT13-020", 0, false);
    p0.hand.push(burstCard);
    s.state.memory = -10; // maxCostFor(0) = -10 - (-10) = 0; the normal cost (5) is unaffordable
    return { s, p0, base, marcus, burstCard };
  }

  it("implemented: the alternate Cost-0 digivolve is accepted and applied even though the normal cost (5) is unaffordable", async () => {
    cite(
      "comprehensive-0040",
      "Burst Digivolve prints 'Burst Digivolve: 0 from [ShineGreymon] by returning 1 [Marcus " +
        "Damon] to hand' on BT13-020. The card-module implementation comment ('Engine has no " +
        "BurstDigivolve subsystem; inert') is STALE for the cost/legality half of the rule: the " +
        'compiled IR now carries a real alternate digivolutionRequirement ({"names":' +
        '["ShineGreymon","Marcus Damon"],"cost":0,"isAlternate":true}), and driving the real ' +
        "digivolve intent below succeeds for cost 0 via it. The OTHER half of the rule (the " +
        "Tamer must actually be RETURNED as that cost) is a separate, still-broken divergence — " +
        "see the it.fails test below.",
    );

    const { s, p0, base, burstCard } = layBurstScenario();
    const memoryBefore = s.state.memory;

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: burstCard.instanceId,
      useAlternateCost: true,
    });

    expect(result).toEqual({ ok: true });
    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT13-020"), 200);
    expect(s.state.memory).toBe(memoryBefore); // truly cost 0 — no memory paid
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT13-020")).toBe(true);
  });

  it("NOW MET: the returned [Marcus Damon] alternate cost should leave the battle area and land in hand", async () => {
    const { s, p0, base, marcus, burstCard } = layBurstScenario();

    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: burstCard.instanceId,
      useAlternateCost: true,
    });
    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT13-020"), 200);

    // DIVERGENCE: the compiled card's own "Return 1 [Marcus Damon] to hand" action (same
    // compiled card, under a "Static" trigger alongside the Digivolve/TrashDigivolution/
    // GainKeyword actions) never runs when driven through the real digivolve intent — the
    // engine grants the free (Cost 0) digivolve WITHOUT enforcing the cost that pays for it.
    // Today: marcus is still on the battle area and hand is empty. Expected per the rule:
    // marcus should be gone from the battle area and present in hand.
    expect(p0.battleArea.some((p) => p.permanentId === marcus.permanentId)).toBe(false);
    expect(p0.hand.some((c) => c.cardId === "BT12-092")).toBe(true);
  });
});

describe("§2-3-9 App Fusion (comprehensive-0041)", () => {
  it("implemented: appFusionCostFor computes a real, printed fusion cost", () => {
    cite("comprehensive-0041", "the digivolution requirements for App Fusion");
    // AD1-005 prints "[App Fusion] [Globemon] & [Charismon]: Cost 0".
    const cost = appFusionCostFor("AD1-005", { topName: "Globemon", linkedNames: ["Charismon"] });
    expect(cost).toBe(0);
  });

  it("exposes BT26 three-name App Fusion recipes and accepts every distinct ordered pair", () => {
    const names = ["Weathermon", "Rocketmon", "Newsmon"];
    for (const topName of names) {
      for (const linkedName of names.filter((name) => name !== topName)) {
        expect(appFusionCostFor("BT26-037", { topName, linkedNames: [linkedName] })).toBe(0);
      }
    }
    expect(appFusionCostFor("BT26-037", { topName: "Weathermon", linkedNames: ["Weathermon"] })).toBeUndefined();
    expect(appFusionCostFor("BT26-037", { topName: "Unrelated", linkedNames: ["Rocketmon"] })).toBeUndefined();
  });
});

describe("§2-3-10 Assembly Requirements (comprehensive-0042)", () => {
  it("2-3-10: a printed Assembly requirement is captured structurally and read by the engine subsystem", () => {
    cite(
      "comprehensive-0042",
      "2-3-10-1/2 the Assembly requirement (materials + cost reduction) is compiled from the " +
        "card's note text and is what `apps/api/src/engine/actions/assembly.ts` reads to drive " +
        "an Assembly play (see ch07-playing-a-card.test.ts §7-3 for the behavioral coverage)",
    );

    const requirement = assemblyRequirementFor("EX12-046")?.[0];
    expect(requirement).toBeTruthy();
    expect(requirement?.reduceCost).toBe(2);
    expect(requirement?.materials[0]?.traits).toContain("TB");
    expect(requirement?.materials[0]?.levelMax).toBe(4);
  });
});

describe("§2-3-11 Lower Text: Inherited/Security/Link/Option info (comprehensive-0043, 0044)", () => {
  it("2-3-11-4: Link requirement/cost/DP are distinct, independently-populated fields", () => {
    cite("comprehensive-0043", "2-3-11-4 Link requirement, link cost, link DP");

    const def = requireCardDefinition("BT21-009");
    expect(def.linkRequirement).toBeTruthy();
    expect(typeof def.linkDp).toBe("number");
  });

  it("2-3-11-5: Option information (DUAL card lower text) is a distinct field from the main effect", () => {
    cite("comprehensive-0044", "2-3-11-5 option information: lower text on a DUAL card");

    const def = requireCardDefinition("BT25-043");
    expect(def.isDualCard).toBe(true);
    expect(def.optionEffect).toBeTruthy();
    expect(def.dualEffect).toBeTruthy();
    expect(def.optionEffect).not.toBe(def.dualEffect);
  });
});

describe("§2-4 Color / §2-5 DP (comprehensive-0045)", () => {
  it("2-4-3-1/2-4-3-2: a multicolor card matches EITHER of its colors, and can't be treated as lacking one", () => {
    cite("comprehensive-0045", "2-4-3 a multicolor card is treated as having all its colors");

    const def = requireCardDefinition("AD1-004"); // Red/Black
    expect(def.colors).toEqual(["Red", "Black"]);
    expect(definitionMatches({ colors: ["Red"] }, def)).toBe(true);
    expect(definitionMatches({ colors: ["Black"] }, def)).toBe(true);
    expect(definitionMatches({ colors: ["Yellow"] }, def)).toBe(false);
    // Can't be excluded as "non-Red" or "non-Black" — the exclude check must reject it for both.
    expect(definitionMatches({ excludeColors: ["Red"] }, def)).toBe(false);
    expect(definitionMatches({ excludeColors: ["Black"] }, def)).toBe(false);
  });

  it("2-5-2: current (modified) DP is referenced over the printed original once modified", () => {
    const s = setup();
    const p0 = s.state.players[0]!;
    const perm = digimon(0, 5000);
    p0.battleArea.push(perm);
    expect(perm.currentDP).toBe(5000);

    advance(s.engine).ledgers.modifiers.addDpModifier(s.state, perm.permanentId, 1000, EffectDuration.Permanent, {
      continuous: true,
    });
    expect(perm.currentDP).toBe(6000); // modified value, not the printed 5000 original
  });
});

describe("§2-6 Play Cost (comprehensive-0046)", () => {
  it("2-6-1: play cost is the memory the engine actually deducts when the card is played", async () => {
    cite("comprehensive-0046", "2-6-1 play cost: the cost required to play a Digimon/Tamer card");

    const s = setup();
    const p0 = s.state.players[0]!;
    const def = requireCardDefinition("AD1-001");
    const card = instance("AD1-001", 0, false);
    p0.hand.push(card);
    s.state.memory = def.playCost; // exactly affordable
    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId });
    expect(result).toEqual({ ok: true });
    // The full play cost was deducted (memory now at or below 0 relative to what was paid).
    expect(s.state.memory).toBeLessThanOrEqual(0);
  });
});

describe("§2-7 Use Cost (comprehensive-0047)", () => {
  it("2-7-1: an Option card's playCost field IS its use cost — there is no separate field", () => {
    cite("comprehensive-0047", "2-7-1 use cost: the cost required to use an Option card");

    // CardDefinition has no separate "useCost" field (see types.ts) — an Option card's cost
    // to use is stored in the same `playCost` field a Digimon/Tamer card uses to be PLAYED.
    // This structural sharing is the engine's encoding of "use cost" as a concept distinct in
    // NAME from "play cost" but not in storage.
    const def = requireCardDefinition("BT1-090");
    expect(isOption(def)).toBe(true);
    expect(typeof def.playCost).toBe("number");
  });
});

describe("§2-8 Digi-Egg Icon / §2-9 Level (comprehensive-0048)", () => {
  it("2-9-2: cards with no printed level ('Lv.-') are treated as having no level (undefined)", () => {
    cite("comprehensive-0048", "2-9-2 no level shown -> treated as having no level");

    const tamer = requireCardDefinition("AD1-019");
    expect(tamer.level).toBeUndefined();
    const option = requireCardDefinition("BT1-090");
    expect(option.level).toBeUndefined();

    const digimonDef = requireCardDefinition("AD1-001");
    expect(digimonDef.level).toBeDefined();

    // hasLevel filter (interpreter.ts) excludes level-less cards, matching this rule directly.
    expect(definitionMatches({ hasLevel: true }, tamer)).toBe(false);
    expect(definitionMatches({ hasLevel: true }, digimonDef)).toBe(true);
  });
});

describe("§2-10 Overflow (comprehensive-0049)", () => {
  it("2-10-1: an Overflow ACE card costs its controller its printed overflow memory on leave", () => {
    cite("comprehensive-0049", "2-10-1 a card has Overflow (loses memory when it leaves)");

    const def = requireCardDefinition("AD1-005");
    expect(def.isAce).toBe(true);
    expect(def.overflowMemory).toBeGreaterThan(0);

    const state = new GameState();
    state.turnSeat = 0;
    for (const seat of [0, 1] as const) {
      const p = new PlayerState();
      p.seat = seat;
      state.players[seat] = p;
    }
    state.memory = 0;
    const gauge = new MemoryGauge(state);
    const card = new CardInstance();
    card.instanceId = "ace-leaving";
    card.cardId = "AD1-005";
    card.ownerSeat = 0;

    applyOverflow(gauge, [card], 0);
    // The controller (turn player, seat 0) loses exactly the printed overflow amount.
    expect(state.memory).toBe(-def.overflowMemory!);
  });
});

describe("§2-11 Arts Digivolve (comprehensive-0050)", () => {
  it('a DUAL card is playable as its Option side (an explicit useAs: "option"), applying its printed Option effect', async () => {
    cite(
      "comprehensive-0050",
      "Arts Digivolve (§4-19-1) is a rule on DUAL cards — 'instead of the trashing from the " +
        "pending processing after using an Option card, one of your cards on the field may " +
        "digivolve into that DUAL card without paying the cost.' Its precondition, playing a DUAL " +
        "card AS its Option side, is reachable: playCard.ts's playModeOf() honors an explicit " +
        "`useAs: \"option\"` on the intent (CR §4-5-2 'a player declares' which side); the default " +
        "(no `useAs`) still resolves to the Digimon side, matching §4-5-2's own default framing. " +
        "See ch04-basic-terminology.test.ts §4-19 for Arts Digivolve's own overwrite-processing " +
        "coverage (the free digivolve that replaces the resulting pending trash).",
    );

    const s = setup();
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;
    const oppTarget = digimon(1, 9000, "AD1-001");
    p1.battleArea.push(oppTarget);
    // BT1-045 Tsukaimon: a mono-Yellow VANILLA Digimon, satisfying BT25-043's
    // optionColorRequirements (["Yellow"]) without confounding the DP assertion below.
    const colorSource = digimon(0, 3000, "BT1-045");
    p0.battleArea.push(colorSource);

    const dualCard = instance("BT25-043", 0, false);
    p0.hand.push(dualCard);
    const { requireCardDefinition } = await import("@aegis/shared");
    s.state.memory = requireCardDefinition("BT25-043").playCost;

    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: dualCard.instanceId,
      useAs: "option",
    } as never);
    expect(result).toEqual({ ok: true });
    await settle(() => oppTarget.currentDP !== 9000, 200);

    // Played as its OPTION side: "-8000 DP" applied to the opponent's Digimon...
    expect(oppTarget.currentDP).toBe(1000);
    // ...and it did NOT become a battle-area permanent (the Digimon side was not played).
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT25-043")).toBe(false);
  });
});

describe("§2-12 Card Number (comprehensive-0051)", () => {
  it("2-12-1: matching card name AND card number => the same card (copy-limit groups by cardId)", () => {
    cite("comprehensive-0051", "2-12-1 matching card names and numbers are the same card");

    // The deck copy-limit check (validateDecklist / effectiveCopyLimit) groups by `cardId` —
    // the engine's card-number identity — treating every instance sharing a cardId as "the
    // same card" for the 4-copy cap, exactly as this rule states.
    // Filler must sit inside the active card pool: `validateDecklist` rejects an out-of-pool
    // card before it ever reaches the copy-limit check, which would assert the wrong rule.
    const fiveCopies = { mainDeck: [...Array(5).fill("BT1-020"), ...Array(45).fill("BT1-009")], eggDeck: [] };
    const verdict = validateDecklist(fiveCopies);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/too many copies/);
    expect(RED_DECK.mainDeck.length).toBe(50); // sanity: the comparison deck used elsewhere is legal-shaped
  });
});

describe("§2-13 Other Information (comprehensive-0052)", () => {
  it("2-13-1: illustration/illustrator/copyright/rarity/block-icon are display-only, not referenced by filters", () => {
    cite("comprehensive-0052", "2-13-1 other information can't be referenced during a game");

    // Two real cards sharing the same kind but (in general) differing rarity both match a
    // filter that only inspects kind — rarity has no bearing on `definitionMatches`, because
    // the Filter type carries no rarity predicate at all (packages/shared/src/effects/ir/filters.ts).
    const commonDef = requireCardDefinition("AD1-001");
    const rareDef = requireCardDefinition("BT1-020");
    const filter: Filter = { kind: ["Digimon"] };
    expect(definitionMatches(filter, commonDef)).toBe(true);
    expect(definitionMatches(filter, rareDef)).toBe(true);
    // Rarity, illustrator, and copyright are present as display-only fields (or absent), never
    // consulted by the matcher regardless of their value.
    expect("rarity" in commonDef).toBe(true);
  });
});
