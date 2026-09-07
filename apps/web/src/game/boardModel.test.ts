import { describe, expect, it } from "vitest";
import { CardKind, Phase } from "@aegis/shared";
import { buildTriggerKey } from "@aegis/shared";
import type { Permanent, ServerEvent } from "@aegis/shared";
import { translator } from "../i18n";
import {
  activeBlockWindow,
  activeCounterWindow,
  buildMatchLog,
  canMoveFromBreeding,
  canUseBreedingAction,
  decisionEffectSource,
  decisionCardColors,
  differentColorsAllowCandidate,
  decisionSourceCounts,
  decisionPermanentDetails,
  decisionVisibleCards,
  digivolveBasePermanentIds,
  distinctCardIdsAllow,
  eventsAfter,
  describeEvent,
  buildInstanceIndex,
  getDigivolveCostOptions,
  handCardEvolutionRoute,
  findDnaMaterialCombination,
  linkCardSlots,
  playButtonLabel,
  triggerCardId,
  triggerLabel,
  triggerLabels,
} from "./boardModel";

describe("buildInstanceIndex", () => {
  it("keeps rendering when a transient state patch omits a permanent card list", () => {
    const state = {
      players: [
        {
          battleArea: [
            {
              permanentId: "agumon",
              topCard: { instanceId: "agumon-card", cardId: "BT1-010" },
              stack: undefined,
              linked: [],
            },
          ],
          breeding: undefined,
          trash: [],
          hand: [],
          deck: [],
        },
        {
          battleArea: [],
          breeding: undefined,
          trash: [],
          hand: [],
          deck: [],
        },
      ],
    } as unknown as import("@aegis/shared").GameState;

    expect(buildInstanceIndex(state, 0)).toEqual(
      new Map([
        ["agumon-card", "BT1-010"],
        ["agumon", "BT1-010"],
      ]),
    );
  });
});

describe("activeBlockWindow", () => {
  it("does not render an empty diagnostic block event as a pending prompt", () => {
    expect(
      activeBlockWindow(
        [
          {
            kind: "blockWindowOpened",
            attackerPermanentId: "attacker",
            eligibleBlockerIds: [],
          },
        ],
        false,
      ),
    ).toBeNull();
  });

  it("keeps a real blocker choice open until combat consumes it", () => {
    const opened: ServerEvent = {
      kind: "blockWindowOpened",
      attackerPermanentId: "attacker",
      eligibleBlockerIds: ["blanc"],
    };
    expect(activeBlockWindow([opened], false)).toEqual({
      attackerPermanentId: "attacker",
      eligibleBlockerIds: ["blanc"],
      mustBlock: false,
    });
    // ＜Collision＞ reaches the window as the compulsion the server enforces.
    expect(activeBlockWindow([{ ...opened, mustBlock: true }], false)).toMatchObject({ mustBlock: true });
    expect(
      activeBlockWindow(
        [
          opened,
          {
            kind: "blocked",
            blockerPermanentId: "blanc",
          },
        ],
        false,
      ),
    ).toBeNull();
    expect(
      activeBlockWindow(
        [
          opened,
          {
            kind: "blockDeclined",
            attackerPermanentId: "attacker",
          },
        ],
        false,
      ),
    ).toBeNull();
  });
});

describe("activeCounterWindow", () => {
  it("does not render an empty legacy Counter event as a pending prompt", () => {
    expect(
      activeCounterWindow(
        [
          {
            kind: "counterWindowOpened",
            attackerPermanentId: "attacker",
            defendingSeat: 1,
            eligibleCounters: [],
          },
        ],
        1,
        false,
      ),
    ).toBeNull();
  });

  it("returns a real Counter choice only to its defending seat", () => {
    const events: ServerEvent[] = [
      {
        kind: "counterWindowOpened",
        attackerPermanentId: "attacker",
        defendingSeat: 1,
        eligibleCounters: [{ instanceId: "ace", effectKey: "counter", description: "Blast Digivolve" }],
      },
    ];
    expect(activeCounterWindow(events, 0, false)).toBeNull();
    expect(activeCounterWindow(events, 1, false)).toMatchObject({
      attackerPermanentId: "attacker",
      eligibleCounters: [{ instanceId: "ace" }],
    });
    expect(
      activeCounterWindow(
        [
          ...events,
          {
            kind: "counterResolved",
            attackerPermanentId: "attacker",
            activated: false,
          },
        ],
        1,
        false,
      ),
    ).toBeNull();
  });
});

describe("eventsAfter", () => {
  it("keeps finding new events after the rolling buffer reaches 100 entries", () => {
    const events = Array.from({ length: 100 }, (_, index): ServerEvent => ({
      kind: "cardsMoved",
      instanceIds: [`event-${index}`],
      from: "deck",
      to: "hand",
    }));
    const previous = events.at(-1)!;
    const newest: ServerEvent = { kind: "securityRecovered", seat: 0, amount: 1 };
    const rolled = [...events.slice(-99), newest];

    expect(eventsAfter(rolled, previous)).toEqual([newest]);
  });
});

describe("friendly movement log", () => {
  it("uses singular grammar and player-facing zone names", () => {
    const line = describeEvent(
      { kind: "cardsMoved", instanceIds: ["egg"], from: "eggDeck", to: "breeding" },
      0,
      new Map(),
      translator("pt-BR"),
    );

    expect(line?.text).toBe("1 carta movida: deck de Digi-Eggs → área de criação");
  });

  it("names only the chosen publicly revealed card and its source", () => {
    const revealed: ServerEvent = {
      kind: "cardRevealed",
      seat: 0,
      cardId: "BT1-045",
      sourceCardId: "EX3-029",
    };

    expect(describeEvent(revealed, 0, new Map(), translator("pt-BR"))?.text).toBe(
      "Você revelou Tsukaimon com Airdramon",
    );
    expect(describeEvent(revealed, 1, new Map(), translator("pt-BR"))?.text).toBe(
      "O oponente revelou Tsukaimon com Airdramon",
    );
  });
});

describe("friendly memory log", () => {
  it("does not expose internal engine reasons", () => {
    const line = describeEvent(
      { kind: "memoryChanged", from: 0, to: -5, reason: "playCard" },
      0,
      new Map(),
      translator("pt-BR"),
    );

    expect(line?.text).toBe("Memória alterada: 0 → -5");
    expect(line?.text).not.toContain("playCard");
  });

  it("collapses the duplicate memory line a paid play emits", () => {
    const events: ServerEvent[] = [
      { kind: "memoryChanged", from: 3, to: 1, reason: "playCard" },
      { kind: "memoryChanged", from: 3, to: 1, reason: "payCost" },
    ];

    expect(buildMatchLog(events, 0, new Map(), translator("pt-BR")).map((line) => line.text)).toEqual([
      "Memória alterada: 3 → 1",
    ]);
  });

  it("keeps two identical non-memory lines, which are two real moves", () => {
    // Both players milling 2 cards reads the same way; collapsing it would hide one of the moves.
    const events: ServerEvent[] = [
      { kind: "cardsMoved", instanceIds: ["a", "b"], from: "deck", to: "trash" },
      { kind: "cardsMoved", instanceIds: ["c", "d"], from: "deck", to: "trash" },
    ];

    expect(buildMatchLog(events, 0, new Map(), translator("pt-BR"))).toHaveLength(2);
  });
});

describe("findDnaMaterialCombination", () => {
  it("finds distinct yellow and purple level 5 materials for Mastemon", () => {
    const permanent = (permanentId: string, cardId: string) =>
      ({
        permanentId,
        topCard: { instanceId: `${permanentId}-top`, cardId },
        stack: [],
        linked: [],
      }) as unknown as Permanent;

    expect(
      findDnaMaterialCombination("ST10-06", [permanent("yellow", "ST10-05"), permanent("purple", "ST10-12")]),
    ).toEqual(["yellow", "purple"]);
  });

  it("assigns two dual-color Ophanimon Falldown Mode to Ordinemon's distinct slots", () => {
    const permanent = (permanentId: string) =>
      ({
        permanentId,
        topCard: { instanceId: `${permanentId}-top`, cardId: "BT8-082" },
        stack: [],
        linked: [],
      }) as unknown as Permanent;

    expect(findDnaMaterialCombination("BT9-082", [permanent("host"), permanent("partner")])).toEqual([
      "host",
      "partner",
    ]);
  });

  it("tries every printed DNA requirement until BT18-041 finds a legal color pair", () => {
    const permanent = (permanentId: string, cardId: string) =>
      ({
        permanentId,
        topCard: { instanceId: `${permanentId}-top`, cardId },
        stack: [],
        linked: [],
      }) as unknown as Permanent;

    expect(
      findDnaMaterialCombination("BT18-041", [permanent("blue", "BT1-040"), permanent("black", "BT10-064")]),
    ).toEqual(["blue", "black"]);
  });

  it("preserves both legal choices when Ordinemon is dropped onto a dual-color material", () => {
    const permanent = (permanentId: string) =>
      ({
        permanentId,
        controllerSeat: 0,
        topCard: { instanceId: `${permanentId}-top`, cardId: "BT8-082" },
        stack: [],
        linked: [],
      }) as unknown as Permanent;
    const host = permanent("host");
    const partner = permanent("partner");

    expect(handCardEvolutionRoute("BT9-082", [host, partner], true)).toEqual({
      kind: "both",
      materialPermanentIds: ["host", "partner"],
    });
  });

  it("offers only the DNA route when the server rejects the normal digivolution", () => {
    const permanent = (permanentId: string) =>
      ({
        permanentId,
        controllerSeat: 0,
        topCard: { instanceId: `${permanentId}-top`, cardId: "BT8-082" },
        stack: [],
        linked: [],
      }) as unknown as Permanent;

    expect(handCardEvolutionRoute("BT9-082", [permanent("host"), permanent("partner")], false)).toEqual({
      kind: "dna",
      materialPermanentIds: ["host", "partner"],
    });
  });

  it("returns undefined when the field does not satisfy every DNA slot", () => {
    const yellow = {
      permanentId: "yellow",
      topCard: { instanceId: "yellow-top", cardId: "ST10-05" },
      stack: [],
      linked: [],
    } as unknown as Permanent;
    expect(findDnaMaterialCombination("ST10-06", [yellow])).toBeUndefined();
  });
});

describe("digivolveBasePermanentIds", () => {
  // Bug: dragging a hand Digimon marked every permanent on the field, Tamers included,
  // because the board painted "this area accepts the drop" rather than "this is a base".
  const digimon = permOf("ST10-05");
  const tamer = permOf("BT7-085");

  it("leaves a Tamer out of the bases the server offered", () => {
    expect(digivolveBasePermanentIds("ST10-06", [digimon, tamer], [digimon.permanentId])).toEqual([
      digimon.permanentId,
    ]);
  });

  it("marks nothing when the card has no base on the field", () => {
    expect(digivolveBasePermanentIds("BT17-012", [digimon, tamer], [])).toEqual([]);
  });

  it("adds the Digimon a DNA declaration would consume, and only those", () => {
    const purple = permOf("ST10-12");

    expect(digivolveBasePermanentIds("ST10-06", [digimon, purple, tamer], [])).toEqual([
      digimon.permanentId,
      purple.permanentId,
    ]);
  });

  it("keeps a base outside the battle area, such as the raised Digimon, off the field", () => {
    // The lone battle-area Digimon is no consolation prize: a DNA declaration needs
    // two materials, so dropping the breeding base leaves nothing to mark.
    expect(digivolveBasePermanentIds("ST10-06", [digimon], ["perm-breeding"])).toEqual([]);
  });
});

describe("decisionVisibleCards", () => {
  it("uses authoritative reveal identities when zone state has not indexed every card yet", () => {
    const staleIndex = new Map([["revealed-1", "ST12-10"]]);
    const cards = decisionVisibleCards(
      {
        candidateInstanceIds: ["revealed-1", "revealed-2"],
        visibleInstanceIds: ["revealed-1", "revealed-2", "revealed-3"],
        visibleCards: [
          { instanceId: "revealed-1", cardId: "ST12-10" },
          { instanceId: "revealed-2", cardId: "ST12-12" },
          { instanceId: "revealed-3", cardId: "BT1-001" },
        ],
      },
      staleIndex,
    );

    expect(cards).toEqual([
      { instanceId: "revealed-1", cardId: "ST12-10" },
      { instanceId: "revealed-2", cardId: "ST12-12" },
      { instanceId: "revealed-3", cardId: "BT1-001" },
    ]);
  });

  it("derives different-color legality from authoritative reveal cards while zone state lags", () => {
    const staleIndex = new Map<string, string>();
    const cards = decisionVisibleCards(
      {
        candidateInstanceIds: ["red-one", "red-two", "blue"],
        visibleCards: [
          { instanceId: "red-one", cardId: "BT1-009" },
          { instanceId: "red-two", cardId: "ST1-02" },
          { instanceId: "blue", cardId: "BT1-029" },
        ],
      },
      staleIndex,
    );

    const colors = decisionCardColors(cards);
    expect(colors).toEqual(
      new Map([
        ["red-one", ["Red"]],
        ["red-two", ["Red"]],
        ["blue", ["Blue"]],
      ]),
    );
    expect(differentColorsAllowCandidate("red-two", ["red-one"], colors, true)).toBe(false);
    expect(differentColorsAllowCandidate("blue", ["red-one"], colors, true)).toBe(true);
  });
});

describe("distinctCardIdsAllow", () => {
  it("keeps the selected copy interactive but disables another instance of the same card", () => {
    const cardIds = new Map([
      ["copy-a", "EX1-048"],
      ["copy-b", "EX1-048"],
      ["other", "EX1-049"],
    ]);

    expect(distinctCardIdsAllow("copy-a", ["copy-a"], cardIds, true)).toBe(true);
    expect(distinctCardIdsAllow("copy-b", ["copy-a"], cardIds, true)).toBe(false);
    expect(distinctCardIdsAllow("other", ["copy-a"], cardIds, true)).toBe(true);
    expect(distinctCardIdsAllow("copy-b", ["copy-a"], cardIds, false)).toBe(true);
  });
});

describe("decisionSourceCounts", () => {
  it("indexes a stack by permanentId and by its top-card instanceId", () => {
    const permanent = {
      permanentId: "machinedramon-with-stack",
      topCard: { instanceId: "machinedramon-top", cardId: "EX1-073" },
      stack: [
        { instanceId: "source-1", cardId: "EX1-048" },
        { instanceId: "source-2", cardId: "EX1-049" },
      ],
      linked: [],
    } as unknown as Permanent;

    const counts = decisionSourceCounts([permanent]);

    expect(counts.get("machinedramon-with-stack")).toBe(2);
    expect(counts.get("machinedramon-top")).toBe(2);
  });
});

describe("decisionPermanentDetails", () => {
  it("indexes live DP and suspension by permanent and top-card identity", () => {
    const permanent = {
      permanentId: "boosted-machinedramon",
      topCard: { instanceId: "machinedramon-top", cardId: "EX1-073" },
      stack: [],
      linked: [],
      currentDP: 14_000,
      isSuspended: true,
    } as unknown as Permanent;

    const details = decisionPermanentDetails([permanent]);

    expect(details.get("boosted-machinedramon")).toEqual({ currentDP: 14_000, isSuspended: true });
    expect(details.get("machinedramon-top")).toEqual({ currentDP: 14_000, isSuspended: true });
  });
});

function permOf(cardId: string): Permanent {
  return {
    permanentId: `perm-${cardId}`,
    controllerSeat: 0,
    topCard: { cardId, instanceId: `i-${cardId}` },
    stack: [{ cardId, instanceId: `i-${cardId}` }],
    suspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function permWithStack(cardId: string, under: string[]): Permanent {
  return {
    ...permOf(cardId),
    stack: [
      { cardId, instanceId: `i-${cardId}` },
      ...under.map((underCardId, index) => ({
        cardId: underCardId,
        instanceId: `under-${underCardId}-${index}`,
      })),
    ],
  } as unknown as Permanent;
}

describe("BT10-086 intrinsic digivolution cost reduction", () => {
  it("shows cost 1 for the alternate [Omnimon] path with X Antibody in the base stack", () => {
    const options = getDigivolveCostOptions("BT10-086", permWithStack("AD1-025", ["BT9-109"]));
    expect(options).toContainEqual(expect.objectContaining({ type: "alternate", cost: 1 }));
  });

  it("shows cost 5 for the regular red level-6 path with X Antibody in the base stack", () => {
    const options = getDigivolveCostOptions("BT10-086", permWithStack("BT1-025", ["BT9-109"]));
    expect(options).toContainEqual(expect.objectContaining({ type: "normal", cost: 5 }));
  });
});

describe("BT22-076 intrinsic Ver.1 digivolution cost reduction", () => {
  it("shows the reduced cost 3 for a legal yellow level-5 Ver.1 base", () => {
    const options = getDigivolveCostOptions("BT22-076", permOf("BT22-038"));
    expect(options).toContainEqual(expect.objectContaining({ type: "normal", cost: 3 }));
  });
});

describe("BT22-061 intrinsic face-down-source digivolution reduction", () => {
  it("shows cost 1 from a Ver.2 Vegiemon with two face-down sources", () => {
    const base = permOf("BT22-049");
    base.stack = [
      { cardId: "BT1-001", instanceId: "fd-1", faceUp: false },
      { cardId: "BT1-002", instanceId: "fd-2", faceUp: false },
    ] as typeof base.stack;
    const options = getDigivolveCostOptions("BT22-061", base);
    expect(options).toContainEqual(expect.objectContaining({ type: "alternate", cost: 1 }));
  });
});

describe("Tamer-onto digivolution cost paths (BT17-012 family)", () => {
  // Bug: BT17-012 prints SPECIFIC named requirements ([Takuya Kanbara]: Cost 2,
  // [Agunimon]: Cost 1) alongside a generic "onto any red Tamer as level 3" effect.
  // The client must offer the named cost onto a named base, and the derived generic
  // cost onto an unnamed same-color Tamer — never the stale compiled entry.
  it("offers cost 2 onto Takuya Kanbara (named Tamer path)", () => {
    const opts = getDigivolveCostOptions("BT17-012", permOf("BT7-085"));
    expect(opts.some((o) => o.type === "alternate" && o.cost === 2)).toBe(true);
  });

  it("offers cost 1 onto Agunimon (named slide-evolution onto a Digimon)", () => {
    const opts = getDigivolveCostOptions("BT17-012", permOf("BT4-011"));
    expect(opts.some((o) => o.type === "alternate" && o.cost === 1)).toBe(true);
    expect(getDigivolveCostOptions("BT17-012", permOf("BT4-011")).length > 0).toBe(true);
  });

  it("offers the derived generic cost onto an unnamed red Tamer, not cost 0", () => {
    // A red Tamer with no named requirement match uses the red Lv.3 EvoCost (memory 3).
    const opts = getDigivolveCostOptions("BT17-012", permOf("BT12-088"));
    expect(opts.length).toBeGreaterThan(0);
    expect(opts.every((o) => o.cost !== 0)).toBe(true);
    expect(opts.some((o) => o.cost === 3)).toBe(true);
  });

  it.each([
    ["BT4-011", "BT7-085", 2],
    ["BT4-013", "BT7-085", 3],
    ["BT4-025", "BT4-093", 2],
  ] as const)("Family-B %s onto %s uses derived cost %i", (cardId, tamerId, expectedCost) => {
    const opts = getDigivolveCostOptions(cardId, permOf(tamerId));
    expect(opts).toContainEqual(expect.objectContaining({ type: "alternate", cost: expectedCost }));
    expect(opts.every((o) => o.cost !== 0)).toBe(true);
  });

  it("uses BT7's canonical target filter for Tamer color and fixed cost", () => {
    const greenTamer = getDigivolveCostOptions("BT7-047", permOf("BT7-089"));
    expect(greenTamer).toContainEqual(expect.objectContaining({ type: "alternate", cost: 2 }));

    const redTamer = getDigivolveCostOptions("BT7-047", permOf("BT7-085"));
    expect(redTamer.some((option) => option.type === "alternate")).toBe(false);
  });
});

describe("AD1-002 onto a [Takuya Kanbara] Tamer w/2+ [Hybrid] cards under it", () => {
  // Bug: the client's name gate compared only the base's printed nameEn, while the server
  // compares its EFFECTIVE names. AD1-020 ("Tommy, Takuya, & Zoe") is also treated as
  // [Takuya Kanbara], so the server accepted the digivolve but the client never offered it.
  // The client also ignored the stack gate, so it offered the path with too few Hybrids.
  const HYBRID_UNDER = ["AD1-002", "BT12-009"];

  function tamerWithUnder(cardId: string, under: string[]): Permanent {
    return {
      ...permOf(cardId),
      stack: under.map((id, i) => ({ cardId: id, instanceId: `u-${id}-${i}` })),
    } as unknown as Permanent;
  }

  it("offers the cost-3 path onto AD1-020, whose effective names include [Takuya Kanbara]", () => {
    const base = tamerWithUnder("AD1-020", HYBRID_UNDER);
    expect(getDigivolveCostOptions("AD1-002", base).length > 0).toBe(true);
    expect(getDigivolveCostOptions("AD1-002", base).some((o) => o.cost === 3)).toBe(true);
  });

  it("offers the cost-3 path onto a printed [Takuya Kanbara] Tamer", () => {
    const base = tamerWithUnder("BT12-088", HYBRID_UNDER);
    expect(getDigivolveCostOptions("AD1-002", base).length > 0).toBe(true);
  });

  it("withholds the path when fewer than 2 [Hybrid] cards are under the Tamer", () => {
    const base = tamerWithUnder("AD1-020", ["AD1-002"]);
    expect(getDigivolveCostOptions("AD1-002", base).length > 0).toBe(false);
  });

  it("withholds the path onto an unrelated Tamer", () => {
    const base = tamerWithUnder("BT1-085", HYBRID_UNDER); // Tai Kamiya
    expect(getDigivolveCostOptions("AD1-002", base).length > 0).toBe(false);
  });
});

describe("EX3-018 Coredramon evolution choices", () => {
  it("offers distinct, friendly normal and Dracomon paths without duplicating the localized memory cost", () => {
    const options = getDigivolveCostOptions("EX3-018", permOf("EX3-037"));

    expect(options).toEqual([
      { type: "normal", label: "Blue Lv.3", cost: 3 },
      { type: "alternate", label: "Dracomon Lv.3", cost: 2 },
    ]);
    expect(options.every(({ label }) => !label.toLowerCase().includes("memory"))).toBe(true);
  });
});

describe("EX3-037 Dracomon evolution choices", () => {
  it("offers both the normal and 0-cost Bebydomon routes with friendly labels", () => {
    expect(getDigivolveCostOptions("EX3-037", permOf("EX3-001"))).toEqual([
      { type: "normal", label: "Blue Lv.2", cost: 1 },
      { type: "alternate", label: "Bebydomon Lv.2", cost: 0 },
    ]);
  });
});

describe("EX3-039 Coredramon evolution choices", () => {
  it("offers friendly normal and cheaper Dracomon routes without duplicate multicolor costs", () => {
    expect(getDigivolveCostOptions("EX3-039", permOf("EX3-037"))).toEqual([
      { type: "normal", label: "Green Lv.3", cost: 3 },
      { type: "alternate", label: "Dracomon Lv.3", cost: 2 },
    ]);
  });
});

describe("EX3-020 Wingdramon evolution choices", () => {
  it("shows friendly normal and Coredramon routes with their distinct costs", () => {
    expect(getDigivolveCostOptions("EX3-020", permOf("EX3-018"))).toEqual([
      { type: "normal", label: "Blue Lv.4", cost: 4 },
      { type: "alternate", label: "Coredramon Lv.4", cost: 3 },
    ]);
  });
});

describe("linkCardSlots (Comprehensive Rules 4-8-3: link cards plugged in sideways, link portion visible)", () => {
  it("returns no slots for an unlinked permanent", () => {
    expect(linkCardSlots(0, 92)).toEqual([]);
  });

  it("peeks a single link card's right edge past the host's own right edge", () => {
    const [slot] = linkCardSlots(1, 92);
    expect(slot).toBeDefined();
    expect(slot!.left + slot!.width).toBeGreaterThan(92);
  });

  it("staggers a 2nd link card downward so both link portions stay visible (4-8-3)", () => {
    const slots = linkCardSlots(2, 92);
    expect(slots).toHaveLength(2);
    expect(slots[1]!.top).toBeGreaterThan(slots[0]!.top);
    // Same horizontal placement: only the vertical stagger distinguishes them.
    expect(slots[1]!.left).toBe(slots[0]!.left);
  });

  it("scales with the host's mini width instead of a hard-coded pixel size", () => {
    const small = linkCardSlots(1, 60)[0]!;
    const large = linkCardSlots(1, 120)[0]!;
    expect(large.width).toBeGreaterThan(small.width);
  });

  it("anchors toward the host's bottom-right corner, not its vertical middle", () => {
    const hostWidth = 92;
    const hostHeight = Math.round(hostWidth * 1.4);
    const [slot] = linkCardSlots(1, hostWidth);
    expect(slot!.top).toBeGreaterThan(hostHeight / 2);
  });

  it("exposes at least 30% of the link card's long edge (TokenInfo's bottom name/DP band is ~23% of it)", () => {
    const [slot] = linkCardSlots(1, 92);
    const peek = slot!.left + slot!.width - 92;
    expect(peek / slot!.width).toBeGreaterThanOrEqual(0.3);
  });
});

const t = translator("en");

describe("playButtonLabel", () => {
  // Bug: the action-bar "play" button always read "Play Digimon", even for
  // Tamers and Options, because Tamers share the battleArea zone with Digimon
  // server-side (apps/api/src/engine/actions/playCard.ts) and the label only
  // special-cased Option vs "everything else". A player selecting a Tamer saw
  // a button that misdescribed what they were about to do.
  it('labels a Digimon exactly "Play Digimon" (pinned: scenario tests query this by accessible name)', () => {
    expect(playButtonLabel([CardKind.Digimon], t)).toBe("Play Digimon");
  });

  it('labels a Tamer "Play Tamer", not "Play Digimon"', () => {
    expect(playButtonLabel([CardKind.Tamer], t)).toBe("Play Tamer");
  });

  it('labels an Option "Play Option"', () => {
    expect(playButtonLabel([CardKind.Option], t)).toBe("Play Option");
  });

  it("labels a Digi-Egg as a hatch action", () => {
    expect(playButtonLabel([CardKind.DigiEgg], t)).toBe("Hatch egg");
    expect(playButtonLabel([CardKind.DigiEgg], translator("pt-BR"))).toBe("Chocar ovo");
  });
});

describe("triggerLabel / triggerLabels", () => {
  it("identifies the card represented by a pending trigger", () => {
    const key = buildTriggerKey("perm-1", "AD1-001/dp-plus-1000");
    expect(triggerCardId(key)).toBe("AD1-001");
  });

  // Bug: two permanents of the SAME card triggering simultaneously produced the
  // same effectKey (cardId/effect-index), so the orderTriggers decision carried
  // duplicate keys — React rendered duplicate keys and both order buttons
  // toggled the same entry, making the confirm button impossible to enable.
  // The fix threads the source permanent's instanceId into the key
  // (buildTriggerKey, packages/shared/src/protocol/triggerKey.ts); the client
  // must parse that composite key back out to render a label instead of
  // showing the raw instanceId-prefixed string.
  it("derives a label from a composite instanceId::effectKey trigger key", () => {
    const key = buildTriggerKey("perm-1", "AD1-001/dp-plus-1000");
    expect(triggerLabel(key)).not.toContain("perm-1");
    expect(triggerLabel(key)).not.toBe(key);
  });

  it("disambiguates two triggering permanents of the same card with a (copy N) suffix", () => {
    const keyA = buildTriggerKey("perm-A", "AD1-001/dp-plus-1000");
    const keyB = buildTriggerKey("perm-B", "AD1-001/dp-plus-1000");
    const [labelA, labelB] = triggerLabels([keyA, keyB], t);
    expect(labelA).not.toBe(labelB);
    expect(labelA).toContain("copy 1");
    expect(labelB).toContain("copy 2");
  });

  it("never numbers two effects of ONE permanent as copies", () => {
    const onPlay = buildTriggerKey("perm-A", "AD1-001/on-play");
    const whenDigivolving = buildTriggerKey("perm-A", "AD1-001/when-digivolving");
    expect(triggerLabels([onPlay, whenDigivolving], t)).toEqual(["Greymon", "Greymon"]);
  });

  it("numbers copies per permanent, so a permanent's two effects share one number", () => {
    const first = buildTriggerKey("perm-A", "AD1-001/on-play");
    const firstAgain = buildTriggerKey("perm-A", "AD1-001/when-digivolving");
    const second = buildTriggerKey("perm-B", "AD1-001/on-play");
    const [a, b, c] = triggerLabels([first, firstAgain, second], t);
    expect(a).toContain("copy 1");
    expect(b).toContain("copy 1");
    expect(c).toContain("copy 2");
  });

  it("leaves a single trigger's label undecorated", () => {
    const key = buildTriggerKey("perm-1", "AD1-001/dp-plus-1000");
    expect(triggerLabels([key], t)[0]).not.toContain("copy");
    expect(triggerLabels([key], t)[0]).toBe("Greymon");
  });

  it("never exposes an internal IR key for a single pending effect", () => {
    const key = buildTriggerKey("perm-1", "ST12-12/ir-6-0");
    expect(triggerLabels([key], t)[0]).not.toMatch(/ir|6|0/i);
  });

  it("never exposes action or IR slugs when several cards trigger", () => {
    const meiko = buildTriggerKey("meiko", "BT9-091/GainMemory");
    const blackGatomon = buildTriggerKey("gatomon", "BT8-077/ir-6-0");
    expect(triggerLabels([meiko, blackGatomon], t)).toEqual(["Meiko Mochizuki", "BlackGatomon"]);
  });

  it("prefers authoritative card ids when an effect key names a different card", () => {
    const staleKey = buildTriggerKey("garurumon-source", "P-008/ir-6-0");
    expect(triggerLabels([staleKey], t, ["P-007"])).toEqual(["Garurumon"]);
  });

  it("does not attribute a multi-trigger prompt to the last resolved card", () => {
    const request = {
      kind: "orderTriggers",
      seat: 0,
      options: { triggerKeys: ["a", "b"] },
    } as never;
    const staleEvents = [{ kind: "effectResolved", seat: 0, sourceCardId: "BT9-040" }] as never;
    expect(decisionEffectSource(request, staleEvents)).toBeUndefined();
  });
});

describe("canUseBreedingAction", () => {
  const base = { phase: Phase.Breeding, isMyTurn: true, canHatch: false, canMove: false };

  it("offers the hatch only when an egg is available", () => {
    expect(canUseBreedingAction({ ...base, canHatch: true })).toBe(true);
    expect(canUseBreedingAction({ ...base, canHatch: false })).toBe(false);
  });

  it("offers the move only when the raised Digimon can leave", () => {
    expect(canUseBreedingAction({ ...base, canMove: true })).toBe(true);
    expect(canUseBreedingAction({ ...base, canMove: false })).toBe(false);
  });

  it("offers neither outside the breeding phase", () => {
    // The server gates both verbs on the breeding phase and would answer
    // `wrong-phase`, so offering them anywhere else invites a rejected intent.
    for (const phase of [Phase.Main, Phase.Draw, Phase.Active, Phase.End]) {
      expect(canUseBreedingAction({ ...base, phase, canHatch: true })).toBe(false);
      expect(canUseBreedingAction({ ...base, phase, canMove: true })).toBe(false);
    }
  });

  it("never offers the action on the opponent's turn", () => {
    expect(canUseBreedingAction({ ...base, isMyTurn: false, canHatch: true })).toBe(false);
    expect(canUseBreedingAction({ ...base, isMyTurn: false, canMove: true })).toBe(false);
  });
});

describe("canMoveFromBreeding", () => {
  function breedingWith(cardId: string): Permanent {
    return { topCard: { cardId } } as unknown as Permanent;
  }

  it("keeps a freshly hatched Digi-Egg in the breeding area", () => {
    // Rules 4-16-2: a Lv.2 Digi-Egg has no DP and cannot move out.
    expect(canMoveFromBreeding(breedingWith("BT1-001"))).toBe(false);
  });

  it("lets a Digimon with DP move out", () => {
    expect(canMoveFromBreeding(breedingWith("BT1-009"))).toBe(true);
  });

  it("lets Mother D-Reaper move out because the Digi-Egg has DP", () => {
    // Official EX2-007 Q3276: Mother D-Reaper may move like any other Digimon;
    // the relevant distinction from a normal Lv.2 Digi-Egg is its printed DP.
    expect(canMoveFromBreeding(breedingWith("EX2-007"))).toBe(true);
  });

  it("treats an empty breeding area as nothing to move", () => {
    expect(canMoveFromBreeding(undefined)).toBe(false);
  });
});

describe("match log card identity", () => {
  const attack = (attackerCardId: string): ServerEvent => ({
    kind: "attackDeclared",
    seat: 0,
    attackerPermanentId: "attacker",
    attackerCardId,
    target: { kind: "player" },
  });

  it("keeps naming the attacker after the attacker has left the field", () => {
    // An empty index is the board as it looks once the attacker is deleted: the line has
    // to stay readable, so it reads the identity out of the event instead.
    const log = buildMatchLog([attack("BT1-010")], 0, new Map(), t);

    expect(log[0]?.text).toBe("Attack on security by Agumon");
    expect(log[0]?.cardIds).toEqual(["BT1-010"]);
  });

  it("names the attacked Digimon instead of calling it a Digimon", () => {
    const declared: ServerEvent = {
      kind: "attackDeclared",
      seat: 0,
      attackerPermanentId: "attacker",
      attackerCardId: "BT1-010",
      target: { kind: "permanent", permanentId: "victim" },
      targetCardId: "BT1-045",
    };

    const line = buildMatchLog([declared], 0, new Map(), t)[0];
    expect(line?.text).toBe("Attack on Tsukaimon by Agumon");
    // Ordered as the sentence names them, so each name links to its own card.
    expect(line?.cardIds).toEqual(["BT1-045", "BT1-010"]);
  });

  it("names the Digimon combat deleted", () => {
    const events: ServerEvent[] = [
      attack("BT1-010"),
      { kind: "combatResolved", seat: 0, attackerPermanentId: "attacker", deletedPermanentIds: ["attacker"] },
    ];

    const line = buildMatchLog(events, 0, new Map(), t)[0];
    expect(line?.text).toBe("Combat resolved. Agumon deleted");
    expect(line?.cardIds).toEqual(["BT1-010"]);
  });

  it("falls back to the count when a deleted permanent was never identified", () => {
    const events: ServerEvent[] = [
      { kind: "combatResolved", seat: 0, attackerPermanentId: "attacker", deletedPermanentIds: ["ghost"] },
    ];

    expect(buildMatchLog(events, 0, new Map(), t)[0]?.text).toBe("Combat resolved. 1 deleted");
  });

  it("names a single moved card when the board still identifies it", () => {
    const events: ServerEvent[] = [{ kind: "cardsMoved", instanceIds: ["c1"], from: "hand", to: "trash" }];

    const line = buildMatchLog(events, 0, new Map([["c1", "BT1-045"]]), t)[0];
    expect(line?.text).toBe("Tsukaimon moved: hand → trash");
    expect(line?.cardIds).toEqual(["BT1-045"]);
  });

  it("keeps counting when several cards move at once", () => {
    const events: ServerEvent[] = [{ kind: "cardsMoved", instanceIds: ["c1", "c2"], from: "deck", to: "trash" }];

    expect(buildMatchLog(events, 0, new Map([["c1", "BT1-045"]]), t)[0]?.text).toBe("2 cards moved: deck → trash");
  });

  it("lists a reveal's cards in the order the sentence names them", () => {
    // Both printings are called Agumon, so only the order tells the link apart.
    const revealed: ServerEvent = { kind: "cardRevealed", seat: 0, cardId: "ST1-03", sourceCardId: "BT1-010" };

    const line = describeEvent(revealed, 0, new Map(), t);
    expect(line?.text).toBe("You revealed Agumon with Agumon");
    expect(line?.cardIds).toEqual(["ST1-03", "BT1-010"]);
  });
});

describe("match log combat responses", () => {
  it("records that the defender fired a Counter effect", () => {
    const activated: ServerEvent = { kind: "counterResolved", attackerPermanentId: "attacker", activated: true };
    const passed: ServerEvent = { kind: "counterResolved", attackerPermanentId: "attacker", activated: false };

    expect(describeEvent(activated, 0, new Map(), t)?.text).toBe("The defender activated a [Counter] effect");
    expect(describeEvent(passed, 0, new Map(), t)).toBeNull();
  });

  it("records an accepted Evade and Barrier, naming the Digimon they saved", () => {
    const played: ServerEvent = { kind: "cardPlayed", seat: 1, cardId: "BT1-010", permanentId: "saved" };
    const evade: ServerEvent = { kind: "evadeResolved", permanentId: "saved", accepted: true };
    const barrier: ServerEvent = { kind: "barrierResolved", permanentId: "saved", accepted: true };

    const log = buildMatchLog([played, evade, barrier], 0, new Map(), t);
    expect(log.map((line) => line.text)).toEqual([
      "＜Barrier＞ trashed a security card to save Agumon",
      "＜Evade＞ suspended Agumon to avoid deletion",
      "Opponent played Agumon",
    ]);
    expect(log[0]?.cardIds).toEqual(["BT1-010"]);
  });

  it("stays quiet about a declined Evade or Barrier", () => {
    expect(describeEvent({ kind: "evadeResolved", permanentId: "p", accepted: false }, 0, new Map(), t)).toBeNull();
    expect(describeEvent({ kind: "barrierResolved", permanentId: "p", accepted: false }, 0, new Map(), t)).toBeNull();
  });

  it("closes the block window it opened", () => {
    expect(describeEvent({ kind: "blockDeclined", attackerPermanentId: "a" }, 0, new Map(), t)?.text).toBe(
      "No block was declared",
    );
  });

  it("keeps a permanent record of a triggered effect resolving", () => {
    const resolved: ServerEvent = {
      kind: "effectResolved",
      seat: 0,
      sourceCardId: "BT1-045",
      effectKey: "onPlay",
      description: "Draw 1 card.",
      timing: "OnPlay",
    };

    // The wording stays with the overlay: the log records that it resolved, not the clause.
    const line = describeEvent(resolved, 0, new Map(), t);
    expect(line?.text).toBe("Tsukaimon's effect resolved");
    expect(line?.cardIds).toEqual(["BT1-045"]);
  });
});
