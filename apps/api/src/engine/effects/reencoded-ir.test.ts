import { describe, it, expect } from "vitest";
import { CardColor, CardKind, type CompiledCard, type Filter } from "@aegis/shared";
import { candidatePermanents, definitionMatches, runtimeCompiledCard } from "./interpreter.js";
// Side-effect import: registers every card module, so `runtimeCompiledCard` resolves the IR the
// engine actually runs (a hand-authored module's inline record, not the shared aggregate).
import "../../cards/index.js";

/**
 * Re-encoded IR fields — proof that a formerly DEAD key now constrains behavior.
 *
 * Each case below covers a declarative effect field consumed by the runtime:
 * the compiler emitted it, no engine source consumed it, so the affected cards were silently
 * unconstrained. The fix was a re-encoding onto the spelling the engine already reads
 * (`maxPlayCost`/`playCostMax` -> `playCostLte`, and so on), applied in three places: the
 * emitter (`the declarative-effect encoder`), the compiled corpus
 * (`packages/shared/src/effects/effects.json`), and the hand-authored card modules.
 *
 * These tests assert against the REAL filter taken from the REAL card's runtime IR, through the
 * REAL predicate (`definitionMatches`). Reverting a re-encoding turns each `rejects` assertion
 * red, because the dead spelling imposes no constraint at all.
 */

interface Facts {
  cardId: string;
  nameEn: string;
  kinds: CardKind[];
  colors: CardColor[];
  level: number;
  playCost: number;
  dp: number;
  types?: string[];
  forms?: string[];
  attributes?: string[];
  effectText?: string;
  linkRequirement?: string;
  isToken?: boolean;
}

function facts(over: Partial<Facts>): never {
  return {
    cardId: "TEST-001",
    nameEn: "Testmon",
    kinds: [CardKind.Digimon],
    colors: [CardColor.Red],
    level: 4,
    playCost: 4,
    dp: 5000,
    types: [],
    forms: [],
    attributes: [],
    effectText: "",
    ...over,
  } as never;
}

/** Every object anywhere in a card's runtime IR that carries `key`. */
function nodesWithKey(compiled: CompiledCard | undefined, key: string): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node === null || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (key in record) found.push(record);
    for (const value of Object.values(record)) walk(value);
  };
  walk(compiled);
  return found;
}

function irOf(cardId: string): CompiledCard {
  const compiled = runtimeCompiledCard(cardId);
  if (compiled === undefined) throw new Error(`${cardId} has no runtime IR`);
  return compiled;
}

/** The single filter in `cardId`'s IR carrying `key` (all occurrences must agree). */
function filterWith(cardId: string, key: string): Filter {
  const nodes = nodesWithKey(irOf(cardId), key);
  expect(nodes.length, `${cardId} should carry ${key}`).toBeGreaterThan(0);
  const serialized = new Set(nodes.map((n) => JSON.stringify(n)));
  expect(serialized.size, `${cardId} carries divergent ${key} filters`).toBe(1);
  return nodes[0] as Filter;
}

function assertKeysGone(cardId: string, keys: string[]): void {
  for (const key of keys) {
    expect(nodesWithKey(irOf(cardId), key), `${cardId} still emits dead key ${key}`).toEqual([]);
  }
}

// ---------------------------------------------------------------------------
// maxPlayCost / playCostMax -> playCostLte
// ---------------------------------------------------------------------------

/**
 * `playCostLte` is the play-cost upper bound `definitionMatches` reads (interpreter.ts). The
 * corpus carried two further spellings of the same idea that nothing read, so every one of these
 * cards' "play cost N or less" clauses matched a Digimon of ANY play cost.
 */
const PLAY_COST_CASES: { cardId: string; bound: number; base: Partial<Facts> }[] = [
  // BT3-107 / BT6-065: "Delete 1 of your opponent's Digimon with a play cost of 4 or less".
  { cardId: "BT3-107", bound: 4, base: {} },
  { cardId: "BT6-065", bound: 4, base: {} },
  // BT9-103 / BT15-065: "none of their Digimon with play costs of N or less can attack players".
  { cardId: "BT9-103", bound: 7, base: {} },
  { cardId: "BT15-065", bound: 5, base: {} },
  // BT22-067: a red-or-black Digimon card with a play cost of 4 or less.
  { cardId: "BT22-067", bound: 4, base: { colors: [CardColor.Black] } },
  // BT25-071: a [TS]-trait Digimon card with a play cost of 4 or less.
  { cardId: "BT25-071", bound: 4, base: { types: ["TS"] } },
  // BT25-074: a [D-Brigade]/[ACCEL] Digimon card with a play cost of 12 or less.
  { cardId: "BT25-074", bound: 12, base: { types: ["D-Brigade"] } },
];

describe("playCostLte — 'play cost N or less' actually bounds the candidate pool", () => {
  it.each(PLAY_COST_CASES)("$cardId caps the pool at play cost $bound", ({ cardId, bound, base }) => {
    assertKeysGone(cardId, ["maxPlayCost", "playCostMax"]);
    const filter = filterWith(cardId, "playCostLte");
    expect(filter.playCostLte).toBe(bound);

    // Guards against a vacuous test: the at-bound card must genuinely qualify.
    expect(definitionMatches(filter, facts({ ...base, playCost: bound }))).toBe(true);
    // A no-play-cost token/card uses -1 as a sentinel, not a numeric cost below the cap (BT14-018 Q2386).
    expect(definitionMatches(filter, facts({ ...base, playCost: -1 }))).toBe(false);
    // REVERT-CONFIRM-RED: with the dead spelling restored this is `true` — the bound is
    // unread, so an over-cost Digimon is a legal target.
    expect(definitionMatches(filter, facts({ ...base, playCost: bound + 1 }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// nameContains / nameIncludes / traitOrName -> nameOrTrait
// ---------------------------------------------------------------------------

/**
 * `nameOrTrait` is the only name/trait matcher the engine reads (`matchNameOrTrait`). Three other
 * spellings sat in the corpus. `match:"name"` is a SUBSTRING test, which is exactly what
 * `nameContains`/`nameIncludes` meant; `traitOrName` becomes the two-ref union (name ∪ trait),
 * because `nameOrTrait` arrays are OR-ed.
 */
describe("nameOrTrait — name/trait gates actually reject non-matching cards", () => {
  it("BT13-019 plays only a [Sistermon] (nameContains)", () => {
    assertKeysGone("BT13-019", ["nameContains"]);
    const filter = filterWith("BT13-019", "nameOrTrait");
    expect(definitionMatches(filter, facts({ nameEn: "Sistermon Blanc" }))).toBe(true);
    // REVERT-CONFIRM-RED: `nameContains` is unread, so Omnimon qualified for a Sistermon-only play.
    expect(definitionMatches(filter, facts({ nameEn: "Omnimon" }))).toBe(false);
  });

  it("BT14-086 ＜Mind Link＞s only [Numemon]/[Monzaemon]/[DigiPolice] (nameContains)", () => {
    assertKeysGone("BT14-086", ["nameContains"]);
    const ir = irOf("BT14-086");
    const mindLink = nodesWithKey(ir, "nameOrTrait").filter(
      (n) => JSON.stringify(n.nameOrTrait).includes("Numemon") || JSON.stringify(n.nameOrTrait).includes("Monzaemon"),
    );
    expect(mindLink.length).toBeGreaterThan(0);
    for (const node of mindLink) {
      const token = JSON.stringify(node.nameOrTrait).includes("Numemon") ? "Numemon" : "Monzaemon";
      expect(definitionMatches(node as Filter, facts({ nameEn: `Super${token}` }))).toBe(true);
      expect(definitionMatches(node as Filter, facts({ nameEn: "Agumon" }))).toBe(false);
    }
  });

  it("BT8-065 accepts only Digimon cards with [Mamemon] in their names", () => {
    assertKeysGone("BT8-065", ["traitOrName"]);
    const filter = filterWith("BT8-065", "nameOrTrait");
    expect(definitionMatches(filter, facts({ nameEn: "MetalMamemon", types: [] }))).toBe(true);
    // The committed catalog says "with [Mamemon] in their names"; a same-named
    // trait alone is not sufficient.
    expect(definitionMatches(filter, facts({ nameEn: "Agumon", types: ["Mamemon"] }))).toBe(false);
    expect(definitionMatches(filter, facts({ nameEn: "Agumon", types: ["Reptile"] }))).toBe(false);
  });

  it("BT9-111 returns only cards with [X Antibody] in their TRAITS from its own stack", () => {
    assertKeysGone("BT9-111", ["traitOrName"]);
    const filter = filterWith("BT9-111", "nameOrTrait");
    expect(definitionMatches(filter, facts({ nameEn: "Agumon", types: ["X Antibody"] }))).toBe(true);
    // The printed text reads "with [X Antibody] in their traits", so the name alone never
    // qualifies — an X Antibody card is identified by its trait, not by its title.
    expect(definitionMatches(filter, facts({ nameEn: "Omnimon X Antibody", types: [] }))).toBe(false);
    expect(definitionMatches(filter, facts({ nameEn: "Omnimon", types: ["Dragon"] }))).toBe(false);
  });

  it.each(["BT10-039", "BT17-038"])("%s uses only an Option with [Plug-In] in its name (nameIncludes)", (cardId) => {
    assertKeysGone(cardId, ["nameIncludes"]);
    const filter = filterWith(cardId, "nameOrTrait");
    const option = { kinds: [CardKind.Option], colors: [CardColor.Yellow] };
    // The bracket delimiters of the printed "[Plug-In]" must not leak into the token, or
    // NOTHING would match (a card is never literally named "[Plug-In]").
    expect(definitionMatches(filter, facts({ ...option, nameEn: "Digi-Plug-In S" }))).toBe(true);
    expect(definitionMatches(filter, facts({ ...option, nameEn: "Hammer Spark" }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// levelLessOrEqual / levelGreaterOrEqual -> levelComparison
// ---------------------------------------------------------------------------

describe("levelComparison — static level bounds actually bound", () => {
  it("BT9-082 deletes 1 level-6-or-higher and all level-5-or-lower opponent Digimon", () => {
    assertKeysGone("BT9-082", ["levelGreaterOrEqual", "levelLessOrEqual"]);
    const comparisons = nodesWithKey(irOf("BT9-082"), "levelComparison").map(
      (n) => n.levelComparison as { op: string; value: number },
    );
    expect(comparisons).toContainEqual({ op: "gte", value: 6 });
    expect(comparisons).toContainEqual({ op: "lte", value: 5 });

    const high = { levelComparison: { op: "gte", value: 6 } } as Filter;
    const low = { levelComparison: { op: "lte", value: 5 } } as Filter;
    expect(definitionMatches(high, facts({ level: 6 }))).toBe(true);
    // REVERT-CONFIRM-RED: the dead spellings imposed no bound, so the "level 6 or higher" delete
    // could take a level-5 Digimon and the "level 5 or lower" sweep could take a level-7.
    expect(definitionMatches(high, facts({ level: 5 }))).toBe(false);
    expect(definitionMatches(low, facts({ level: 5 }))).toBe(true);
    expect(definitionMatches(low, facts({ level: 7 }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Board-level seams: controller / superlative / excludeSelf / dp / dynamic level cap
// ---------------------------------------------------------------------------

/**
 * Minimal board for the target-resolution seam (`candidatePermanents`), which is what actually
 * turns a Filter into the pool an effect may act on. Seat 0 is the effect's controller.
 */
interface BoardCard {
  permanentId: string;
  seat: 0 | 1;
  def: Partial<Facts>;
  currentDP?: number;
  zone?: "battleArea" | "breeding";
}

function board(cards: BoardCard[], opts?: { selfPermanentId?: string; mySecurity?: number }) {
  const permanents = cards.map((c) => ({
    permanentId: c.permanentId,
    ownerSeat: c.seat,
    controllerSeat: c.seat,
    topCard: { cardId: c.permanentId, instanceId: `${c.permanentId}#i`, ownerSeat: c.seat },
    stack: [],
    currentDP: c.currentDP ?? 5000,
    isSuspended: false,
    linked: [],
    inBreeding: c.zone === "breeding",
  }));
  const byId = new Map(permanents.map((p) => [p.permanentId, p]));
  const defById = new Map(cards.map((c) => [c.permanentId, facts({ ...c.def }) as unknown as Facts]));
  const players = [0, 1].map((seat) => ({
    seat,
    battleArea: permanents.filter((p) => p.ownerSeat === seat && !p.inBreeding),
    security: Array.from({ length: seat === 0 ? (opts?.mySecurity ?? 0) : 0 }, () => ({ faceUp: false })),
    hand: [],
    deck: [],
    trash: [],
    breeding: permanents.find((p) => p.ownerSeat === seat && p.inBreeding),
  }));
  const self = opts?.selfPermanentId !== undefined ? byId.get(opts.selfPermanentId) : undefined;
  const source = {
    instanceId: "SRC#i",
    cardId: "SRC",
    ownerSeat: 0,
    definition: facts({ cardId: "SRC" }),
    permanent: () => self,
    isOnBattleArea: () => self !== undefined,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
  const ctx = {
    source,
    trigger: {},
    game: {
      state: { memory: 0, players, turnSeat: 0 },
      player: (s: number) => players[s],
      opponentOf: (s: number) => (s === 0 ? 1 : 0),
      permanentById: (id: string) => byId.get(id),
      definitionOf: (card: { cardId: string }) => defById.get(card.cardId),
    },
    fx: {},
    ask: {},
    selections: new Map(),
  };
  return { ctx, source };
}

/** Ids the engine would offer for `filter`, on the given board. */
function poolFor(filter: Filter, b: ReturnType<typeof board>): string[] {
  return candidatePermanents(b.ctx as never, { filter, count: 1 } as never, undefined).map((p) => p.permanentId);
}

describe("isOpponents/isLowestDP -> controller + superlative (BT20-018)", () => {
  it("offers only the opponent's lowest-DP Digimon", () => {
    assertKeysGone("BT20-018", ["isOpponents", "isLowestDP"]);
    const filter = filterWith("BT20-018", "superlative");
    expect(filter.controller).toBe("opponent");
    expect((filter as { superlative?: string }).superlative).toBe("lowestDP");

    const b = board([
      { permanentId: "MINE_TINY", seat: 0, currentDP: 1000, def: {} },
      { permanentId: "OPP_LOW", seat: 1, currentDP: 3000, def: {} },
      { permanentId: "OPP_HIGH", seat: 1, currentDP: 9000, def: {} },
    ]);
    // REVERT-CONFIRM-RED: with `isOpponents`/`isLowestDP` (both unread) the pool was every
    // permanent on the board, including the controller's own 1000-DP Digimon.
    expect(poolFor(filter, b)).toEqual(["OPP_LOW"]);
  });
});

describe("field-wide target unions", () => {
  it("offers matching permanents from both the battle and breeding areas", () => {
    const b = board([
      { permanentId: "BATTLE", seat: 0, def: { nameEn: "King Drasil_7D6" } },
      { permanentId: "BREEDING", seat: 0, zone: "breeding", def: { nameEn: "King Drasil_7D6" } },
      { permanentId: "OTHER", seat: 0, def: { nameEn: "Mother Eater" } },
    ]);
    const fieldFilter: Filter = {
      controller: "mine",
      nameOrTrait: [{ tokens: ["King Drasil_7D6"], match: "name" }],
      or: [{ zone: "battleArea" }, { zone: "breeding" }],
    };

    expect(poolFor(fieldFilter, b)).toEqual(["BREEDING", "BATTLE"]);
  });
});

describe("notSelf -> excludeSelf", () => {
  it.each(["EX6-029", "BT8-020"])("%s excludes the source permanent from its own pool", (cardId) => {
    assertKeysGone(cardId, ["notSelf"]);
    const filter = filterWith(cardId, "excludeSelf");
    const b = board(
      [
        { permanentId: "SELF", seat: 0, def: {} },
        { permanentId: "OTHER", seat: 0, def: {} },
      ],
      { selfPermanentId: "SELF" },
    );
    // REVERT-CONFIRM-RED: `notSelf` is unread, so "1 OTHER Digimon" included this Digimon.
    expect(poolFor({ ...filter, zone: "battleArea" }, b)).toEqual(["OTHER"]);
  });
});

describe("dpLessOrEqual -> dp comparison", () => {
  it("BT8-015 deletes only opponent Digimon at 5000 DP or less", () => {
    assertKeysGone("BT8-015", ["dpLessOrEqual"]);
    const filter = filterWith("BT8-015", "dp");
    // The DNA-digivolving clause printed "5000 DP or less"; the emitter's bare `\d+` had matched
    // the leading "delete 1", so the bound was silently 1 as well as being unread.
    expect(filter.dp).toEqual({ op: "lte", value: 5000 });
    const b = board([
      { permanentId: "OPP_SMALL", seat: 1, currentDP: 5000, def: {} },
      { permanentId: "OPP_BIG", seat: 1, currentDP: 6000, def: {} },
    ]);
    expect(poolFor(filter, b)).toEqual(["OPP_SMALL"]);
  });

  it("EX3-074 plays only a [Dramon] at 12000 DP or less", () => {
    assertKeysGone("EX3-074", ["dpLessOrEqual"]);
    const filter = filterWith("EX3-074", "dp");
    expect(filter.dp).toEqual({ op: "lte", value: 12000 });
    const dramon = { nameEn: "Slayerdramon", colors: [CardColor.Green] };
    const b = board([
      { permanentId: "SMALL", seat: 0, currentDP: 12000, def: dramon },
      { permanentId: "BIG", seat: 0, currentDP: 13000, def: dramon },
    ]);
    expect(poolFor(filter, b)).toEqual(["SMALL"]);
  });
});

describe("levelLessOrEqual{ref:securityCount} -> levelComparison + security scaling", () => {
  it.each(["BT8-042", "EX6-028"])(
    "%s caps the returned Digimon's level at the controller's security count",
    (cardId) => {
      assertKeysGone(cardId, ["levelLessOrEqual"]);
      const filter = filterWith(cardId, "levelComparison");
      expect(filter.levelComparison).toEqual({
        op: "lte",
        value: 0,
        scaling: { unit: "security", per: 1, filter: { controller: "mine" } },
      });

      const opponents: BoardCard[] = [
        { permanentId: "OPP_L3", seat: 1, def: { level: 3 } },
        { permanentId: "OPP_L5", seat: 1, def: { level: 5 } },
      ];
      // 3 security cards -> only the level-3 Digimon is legal.
      expect(poolFor(filter, board(opponents, { mySecurity: 3 }))).toEqual(["OPP_L3"]);
      // 5 security cards -> both become legal, proving the bound tracks the live count.
      expect(poolFor(filter, board(opponents, { mySecurity: 5 }))).toEqual(["OPP_L3", "OPP_L5"]);
      // REVERT-CONFIRM-RED: `levelLessOrEqual:{ref:"securityCount"}` is unread, so both Digimon
      // were legal at ANY security count, including 0.
      expect(poolFor(filter, board(opponents, { mySecurity: 0 }))).toEqual([]);
    },
  );
});

describe("nameContains -> DigivolutionRequirement.names", () => {
  it.each([
    ["EX4-036", "Gargomon"],
    ["BT22-031", "Numemon"],
  ])("%s's alternate digivolve path requires [%s] in the base's name", (cardId, token) => {
    assertKeysGone(cardId, ["nameContains"]);
    const requirement = irOf(cardId).digivolutionRequirement?.find((r) => r.isAlternate === true);
    // `names` is the substring name gate `digivolutionRequirementsFor` reads; `nameContains`
    // was read by nobody, so the alternate path accepted ANY level-4 base.
    expect(requirement?.names).toEqual([token]);
  });
});

// ---------------------------------------------------------------------------
// Ghost keys: costMax / maxCost -> playCostLte, and lowercase `color` -> `colors`
// ---------------------------------------------------------------------------

/**
 * `costMax`/`maxCost` were GHOSTS: emitted into effects.json, declared nowhere in `ir.ts`, read by
 * nobody — so TypeScript could not flag them either. Both meant "play cost N or less".
 */
describe("costMax/maxCost -> playCostLte", () => {
  it("BT19-036 places only a yellow/purple cost-5-or-less card as security", () => {
    assertKeysGone("BT19-036", ["costMax", "color"]);
    const filter = filterWith("BT19-036", "playCostLte");
    expect(filter.playCostLte).toBe(5);
    expect(filter.colors).toEqual(["Yellow", "Purple"]);
    // BT19-036 places a yellow/purple Option, so keep the synthetic candidate's kind
    // aligned with the live IR's kind gate (the default Facts kind is Digimon).
    const yellow = { kinds: [CardKind.Option], colors: [CardColor.Yellow] };
    expect(definitionMatches(filter, facts({ ...yellow, playCost: 5 }))).toBe(true);
    // REVERT-CONFIRM-RED (cost): the ghost `costMax` bounded nothing.
    expect(definitionMatches(filter, facts({ ...yellow, playCost: 6 }))).toBe(false);
    // REVERT-CONFIRM-RED (color): lowercase `color` is not the key `definitionMatches` reads,
    // so a green card also qualified for a "yellow or purple card" clause.
    expect(definitionMatches(filter, facts({ colors: [CardColor.Green], playCost: 5 }))).toBe(false);
  });

  it("BT19-037 uses only a single-color Option costing 5 or less", () => {
    assertKeysGone("BT19-037", ["maxCost"]);
    const filter = filterWith("BT19-037", "playCostLte");
    expect(filter.playCostLte).toBe(5);
    const option = { kinds: [CardKind.Option] };
    expect(definitionMatches(filter, facts({ ...option, playCost: 5 }))).toBe(true);
    expect(definitionMatches(filter, facts({ ...option, playCost: 6 }))).toBe(false);
  });
});

/**
 * "Digivolve this card from your hand onto one of your <color> Tamers" compiled to a lowercase
 * `color` array. `definitionMatches` reads `colors` with capitalized values, so the color gate
 * was a no-op: every Tamer you controlled was a legal base, of any color.
 */
const TAMER_ONTO_COLOR: [string, CardColor][] = [
  ["BT4-011", CardColor.Red],
  ["BT4-025", CardColor.Blue],
  ["BT6-049", CardColor.Green],
  ["BT7-061", CardColor.Black],
  ["BT7-071", CardColor.Purple],
  ["BT17-022", CardColor.Yellow],
];

describe("color -> colors (Tamer-onto digivolve base gate)", () => {
  it.each(TAMER_ONTO_COLOR)("%s only accepts a %s Tamer as its base", (cardId, color) => {
    assertKeysGone(cardId, ["color"]);
    // The Tamer-onto base gate, not any other color filter the card may carry.
    const filter = nodesWithKey(irOf(cardId), "colors").find(
      (n) => JSON.stringify(n.kind) === JSON.stringify(["Tamer"]),
    ) as Filter | undefined;
    expect(filter, `${cardId} has no Tamer-onto color gate`).toBeDefined();
    expect(filter!.colors).toEqual([color]);
    const tamer = { kinds: [CardKind.Tamer], level: 0 };
    expect(definitionMatches(filter!, facts({ ...tamer, colors: [color] }))).toBe(true);
    // REVERT-CONFIRM-RED: with lowercase `color` this is `true` — an off-color Tamer was a legal base.
    const offColor = color === CardColor.Red ? CardColor.White : CardColor.Red;
    expect(definitionMatches(filter!, facts({ ...tamer, colors: [offColor] }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// hasCardsUnder -> hasDigivolutionCards / digivolutionCards:"none"
// hasText:"<Link>" -> hasLinkRequirement
// ---------------------------------------------------------------------------

describe("hasCardsUnder -> the digivolution-stack gates the engine reads (RB1-014)", () => {
  it("splits 'with cards under it' from 'without cards under it'", () => {
    assertKeysGone("RB1-014", ["hasCardsUnder"]);
    const stackFilters = nodesWithKey(irOf("RB1-014"), "digivolutionCards") as Filter[];
    const withCards = stackFilters.find((filter) => filter.digivolutionCards === "hasAny");
    const withoutCards = stackFilters.find((filter) => filter.digivolutionCards === "none");
    expect(withCards?.digivolutionCards).toBe("hasAny");
    expect(withoutCards?.digivolutionCards).toBe("none");

    const bare = { permanentId: "BARE", seat: 1 as const, def: {} };
    const b = board([bare]);
    // A permanent with an empty stack: legal for the "without cards under it" Restrict,
    // illegal for the "with cards under it" Trash.
    // REVERT-CONFIRM-RED: `hasCardsUnder` is unread, so BOTH pools contained every opponent
    // Digimon/Tamer regardless of what was under it.
    expect(poolFor(withoutCards!, b)).toEqual(["BARE"]);
    expect(poolFor(withCards!, b)).toEqual([]);
  });
});

describe("hasText:'<Link>' -> hasLinkRequirement (BT22-035)", () => {
  it("links only a card that actually carries a ＜Link＞ requirement", () => {
    assertKeysGone("BT22-035", ["hasText"]);
    const filter = filterWith("BT22-035", "hasLinkRequirement");
    expect(filter.hasLinkRequirement).toBe(true);
    const linkable = facts({ level: 4, linkRequirement: "[Link] [Appmon] trait: Cost 1" });
    const plain = facts({ level: 4 });
    expect(definitionMatches(filter, linkable)).toBe(true);
    // REVERT-CONFIRM-RED: the ghost `hasText` gated nothing, so any level-4-or-lower Digimon
    // card could be "linked" — including cards with no ＜Link＞ requirement at all.
    expect(definitionMatches(filter, plain)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// digimon / tamer / isDigiEgg -> kind (boolean kind-shorthand re-encoding, Q1b)
// ---------------------------------------------------------------------------

/**
 * `digimon: true` and `tamer: true` were boolean shorthand for `kind: ["Digimon"]` /
 * `kind: ["Tamer"]` that nothing read; `isDigiEgg: false` was shorthand for "any kind but
 * DigiEgg" (a whitelist can't express "all but one", so it re-encodes to the other three
 * kinds explicitly). All three cards below are hand-authored overrides — the corpus-only
 * cards. `kind` is what `definitionMatches` actually reads (interpreter.ts).
 *
 * Each `filter` below is picked out of the card's own runtime IR directly (not through
 * `filterWith`, which requires every node carrying the key to be identical — `kind` recurs
 * across many unrelated filters in the same card, so it can't be located generically).
 */
describe('digimon -> kind:["Digimon"] (BT20-019 immuneToOpponentEffects grant)', () => {
  it("grants immunity only to a Digimon, never a Tamer", () => {
    assertKeysGone("BT20-019", ["digimon"]);
    const ir = irOf("BT20-019");
    const grant = ir.effects.find((e) => e.trigger === "WhenDigivolving")?.actions[0] as unknown as {
      target: { filter: Filter };
    };
    const filter = grant.target.filter;
    expect(filter.kind).toEqual(["Digimon"]);

    expect(definitionMatches(filter, facts({ kinds: [CardKind.Digimon] }))).toBe(true);
    // REVERT-CONFIRM-RED: with the dead `digimon: true` restored, `kind` disappears from the
    // filter entirely, so a Tamer under the same `controller: "mine"` gate also qualified.
    expect(definitionMatches(filter, facts({ kinds: [CardKind.Tamer] }))).toBe(false);
  });
});

describe('tamer -> kind:["Tamer"] (BT7-036/BT7-047 digivolve-onto-Tamer base gate)', () => {
  it.each(["BT7-036", "BT7-047"])("%s only digivolves onto a Tamer, never a Digimon", (cardId) => {
    assertKeysGone(cardId, ["tamer"]);
    const ir = irOf(cardId);
    const digivolve = ir.effects.find((e) => e.trigger === "Static")?.actions[0] as unknown as {
      target: { filter: Filter };
    };
    const filter = digivolve.target.filter;
    expect(filter.kind).toEqual(["Tamer"]);

    expect(definitionMatches(filter, facts({ kinds: [CardKind.Tamer], level: 0 }))).toBe(true);
    // REVERT-CONFIRM-RED: with the dead `tamer: true` restored, `kind` disappears from the
    // filter entirely, so a same-color Digimon also qualified as a digivolution base.
    expect(definitionMatches(filter, facts({ kinds: [CardKind.Digimon], level: 3 }))).toBe(false);
  });
});

describe('isDigiEgg:false -> kind:["Digimon","Tamer","Option"] (BT23-017 non-Digi-Egg Return)', () => {
  it("returns a non-Digi-Egg [CS] card, never a Digi-Egg [CS] card", () => {
    assertKeysGone("BT23-017", ["isDigiEgg"]);
    const ir = irOf("BT23-017");
    const returnAction = ir.effects.find((e) => e.trigger === "OnPlay")?.actions[0] as unknown as {
      target: { filter: Filter };
    };
    const filter = returnAction.target.filter;
    expect(filter.kind).toEqual(["Digimon", "Tamer", "Option"]);

    expect(definitionMatches(filter, facts({ kinds: [CardKind.Digimon], types: ["CS"] }))).toBe(true);
    // REVERT-CONFIRM-RED: with the dead `isDigiEgg: false` restored, `kind` disappears from the
    // filter entirely, so a Digi-Egg card with the [CS] trait also qualified as "non-Digi-Egg".
    expect(definitionMatches(filter, facts({ kinds: [CardKind.DigiEgg], types: ["CS"] }))).toBe(false);
  });
});

describe("excludeCardIds exact card-number gate (BT18-034 Q4999)", () => {
  it("rejects BT7-111 while accepting another Lucemon: Chaos Mode printing", () => {
    const filter = filterWith("BT18-034", "excludeCardIds");
    expect(filter.excludeCardIds).toEqual(["BT7-111"]);
    expect(definitionMatches(filter, facts({ cardId: "BT7-111", nameEn: "Lucemon: Chaos Mode" }))).toBe(false);
    expect(definitionMatches(filter, facts({ cardId: "BT18-082", nameEn: "Lucemon: Chaos Mode" }))).toBe(true);
  });
});
