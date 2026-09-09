import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { digiXrosMatches } from "../../engine/combat/keywords.js";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT19-012.js";

describe("BT19-012 OmniShoutmon", () => {
  it("matches the catalog printed text, DP and evolution costs", () => {
    expect(getCardDefinition("BT19-012")).toMatchObject({
      cardId: "BT19-012",
      nameEn: "OmniShoutmon",
      colors: ["Red", "Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Dragonkin", "Xros Heart"],
      evoCosts: [
        { color: "Red", level: 4, memoryCost: 4 },
        { color: "Yellow", level: 4, memoryCost: 4 },
      ],
      effectText:
        "[Digivolve][Shoutmon]: Cost 4\n[Digivolve]Lv.4 w/[Xros Heart]\u00A0trait: Cost 3 \n\nThis card is also treated as [Shoutmon] for a DigiXros.\n[On Play] [When Digivolving] 1 of your opponent's Digimon gets -3000 DP for the turn. Then, delete 1 of your opponent's Digimon with 3000 DP or less.\n[On Deletion] Place 1 Digimon card with the [Xros Heart]/[Blue Flare]\u00A0trait from your hand or trash under your Tamers.",
      inheritedEffectText: "[Your Turn] This Digimon with the [Xros Heart]\u00A0trait gains ＜Rush＞.",
    });
  });

  it("compiles every printed clause", () => {
    // "also treated as [Shoutmon] for a DigiXros" is a name grant confined to the DigiXros
    // ledger (Q3068), and prints no timing bracket — Static, not AllTurns.
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "GrantStatic",
          grant: "name",
          tokens: ["Shoutmon"],
          digiXrosOnly: true,
          target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
        },
      ],
    });
    for (const index of [1, 2] as const) {
      expect(compiled.effects?.[index]).toMatchObject({
        trigger: index === 1 ? "OnPlay" : "WhenDigivolving",
        actions: [
          {
            kind: "ModifyDP",
            amount: -3000,
            duration: "forTheTurn",
            target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
          },
          {
            kind: "Delete",
            target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } } },
          },
        ],
      });
    }
    // "with the [Xros Heart]/[Blue Flare] trait" is an EXACT trait test, never a substring,
    // and the cards come from the controller's own hand or trash.
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            count: 1,
            from: ["hand", "trash"],
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Xros Heart", "Blue Flare"], match: "trait" }],
            },
          },
          underFilter: { controllerDefault: "mine", kind: ["Tamer"] },
        },
      ],
    });
    // Printed "[Your Turn]" is the YourTurn trigger, not Static.
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Rush" },
          duration: "permanent",
          target: { count: 1, isSelf: true, filter: { isSelfRef: true, nameOrTrait: [{ match: "trait" }] } },
        },
      ],
    });
    expect(compiled.effects).toHaveLength(5);
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Shoutmon"], cost: 4, isAlternate: true },
      { level: 4, traits: ["Xros Heart"], cost: 3, isAlternate: true },
    ]);
  });

  // ---------------------------------------------------------------------------
  // [Digivolve][Shoutmon]: Cost 4 / [Digivolve] Lv.4 w/[Xros Heart]\u00A0trait: Cost 3
  // ---------------------------------------------------------------------------

  it("resolves each alternate requirement to its own cost and rejects a non-matching base", () => {
    // BT19-008 Shoutmon is the exact printed name; BT19-010 Shoutmon X4 is the near miss —
    // it carries "Shoutmon" as a substring, so only the Lv.4 [Xros Heart] route may match it.
    expect(matchingAlternateDigivolutionRequirement("BT19-012", "BT19-008")).toMatchObject({ cost: 4 });
    expect(matchingAlternateDigivolutionRequirement("BT19-012", "BT19-010")).toMatchObject({ cost: 3 });
    expect(matchingAlternateDigivolutionRequirement("BT19-012", "BT19-033")).toMatchObject({ cost: 3 });
    // Lv.3 Xros Heart (wrong level) and a Lv.2 with neither name nor trait.
    expect(matchingAlternateDigivolutionRequirement("BT19-012", "BT19-009")).toBeUndefined();
    expect(matchingAlternateDigivolutionRequirement("BT19-012", "BT19-005")).toBeUndefined();
  });

  it.each([
    ["named [Shoutmon] route for 4", "BT19-008", 0, 4],
    ["Lv.4 [Xros Heart] route for 3", "BT19-010", 1, 3],
  ])("digivolves through the %s", async (_label, baseCardId, alternateRequirementIndex, cost) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: "BT19-012", as: "omni" }],
          deck: [{ card: "BT1-014", as: "evoDraw" }, "BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }], security: [{ card: "BT1-009" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = cost;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("omni").instanceId,
        alternateRequirementIndex,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("base").topCard?.cardId).toBe("BT19-012");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([baseCardId]);
    // The gauge started at exactly the route's cost, so the reduced route is what was paid.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("evoDraw").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses an illegal source that matches neither the name nor the Lv.4 trait route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-005", as: "hopmon" }],
          hand: [{ card: "BT19-012", as: "omni" }],
          deck: ["BT1-014"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("hopmon").permanentId,
        instanceId: s.inst("omni").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-012"]);
  });

  // ---------------------------------------------------------------------------
  // [On Play] [When Digivolving] 1 of your opponent's Digimon gets -3000 DP for the turn.
  // Then, delete 1 of your opponent's Digimon with 3000 DP or less.
  // ---------------------------------------------------------------------------

  it("reduces one opposing Digimon by 3000 and then deletes it at the 3000 DP boundary", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-012", as: "omni" }, { card: "BT1-014" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "reduced", dp: 6000 },
            { card: "BT1-010", as: "untouched", dp: 4000 },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds },
    );
    s.state.memory = 10;
    preferInstanceIds.push(s.perm("reduced").topCard!.instanceId);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omni").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    // 6000 - 3000 = 3000 lands exactly on the printed maximum, so that Digimon is the one
    // deleted; the untouched 4000 DP peer keeps its DP and stays on the board.
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-010"]);
    expect(s.perm("untouched").currentDP).toBe(4000);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("deletes nothing when the reduced Digimon is still above 3000 DP", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-012", as: "omni" }, { card: "BT1-014" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 7000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omni").instanceId })).toEqual({ ok: true });
    await drainMicrotasks(30);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-009"]);
    // The -3000 still applied and lasts only for the turn.
    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.state.memory).toBe(3);
  });

  // ---------------------------------------------------------------------------
  // [On Deletion] Place 1 Digimon card with the [Xros Heart]/[Blue Flare] trait from your
  // hand or trash under your Tamers.
  // ---------------------------------------------------------------------------

  it("places a matching Digimon under its own Tamer when it dies in battle", async () => {
    // Deletion reached through a real attack into a bigger suspended Digimon, not a verb.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-012", as: "omni" },
            { card: "BT19-080", as: "tamer" },
          ],
          hand: [{ card: "BT19-009", as: "nonMatching" }],
          trash: [{ card: "BT19-016", as: "blueFlare" }],
          security: [{ card: "BT1-009" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "wall", dp: 20_000, suspended: true }],
          trash: [{ card: "BT19-013", as: "opponentXrosHeart" }],
          security: [{ card: "BT1-009" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("omni").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length === 1);

    // Only the [Blue Flare] card in the controller's own trash qualified: the [Dark Dragon]
    // card in hand and the opponent's [Xros Heart] card in THEIR trash are both near misses.
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT19-016"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-009"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-012"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT19-013"]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-080"]);
  });

  it("places nothing when the controller has no Tamer to place under", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-012", as: "omni" }],
          trash: [{ card: "BT19-016", as: "blueFlare" }],
          security: [{ card: "BT1-009" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "wall", dp: 20_000, suspended: true }],
          security: [{ card: "BT1-009" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("omni").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-016", "BT19-012"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Inherited [Your Turn] This Digimon with the [Xros Heart]\u00A0trait gains ＜Rush＞.
  // ---------------------------------------------------------------------------

  it("grants inherited Rush only to an Xros Heart host during its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-013", as: "xrosHost", under: ["BT19-012"] },
          { card: "BT19-015", as: "plainHost", under: ["BT19-012"] },
        ],
      },
    });
    await advance(s.engine).recompute();

    // BT19-015 Gallantmon ([Holy Warrior]/[Royal Knight]) is the near-miss trait host.
    expect(observe(s.engine).hasKeyword(s.perm("xrosHost"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plainHost"), "Rush")).toBe(false);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("xrosHost"), "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("plainHost"), "Rush")).toBe(false);
  });

  it("lets an Xros Heart host attack the turn it arrives on the inherited Rush", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-013", as: "host", under: ["BT19-012"], enteredThisTurn: true }],
          security: [{ card: "BT1-009" }],
        },
        1: { security: [{ card: "BT1-009" }, { card: "BT1-010" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    s.state.turnSeat = 0;
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

  // ---------------------------------------------------------------------------
  // "This card is also treated as [Shoutmon] for a DigiXros." — Q3068.
  // ---------------------------------------------------------------------------

  it("is a legal [Shoutmon] material for a DigiXros but keeps its printed name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT19-012", as: "omni" }],
        hand: [
          { card: "BT10-013", as: "x5" },
          { card: "BT10-049", as: "ballistamon" },
          { card: "BT10-034", as: "dorulumon" },
          { card: "BT10-029", as: "starmons" },
          { card: "BT10-060", as: "sparrowmon" },
        ],
      },
    });
    await s.ready();

    // The alias never reaches ordinary name matching.
    expect(observe(s.engine).effectiveNames(s.perm("omni"))).toEqual(["omnishoutmon"]);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("x5").instanceId,
        digiXros: {
          materialInstanceIds: [
            s.inst("omni").instanceId,
            s.inst("ballistamon").instanceId,
            s.inst("dorulumon").instanceId,
            s.inst("starmons").instanceId,
            s.inst("sparrowmon").instanceId,
          ],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT10-013"));

    expect(s.perm("x5").stack.map((card) => card.cardId)).toContain("BT19-012");
  });

  it("is not a ＜Material Save＞-eligible [Shoutmon] under a Tamer (Q3068)", async () => {
    // The DigiXros-only alias is invisible to the eligibility test ＜Material Save＞ uses.
    expect(digiXrosMatches("BT10-013", "BT19-012")).toBe(false);
    expect(digiXrosMatches("BT10-013", "BT19-008")).toBe(true);

    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-013", as: "x5", dp: 6000, under: ["BT19-012", "BT19-008", "BT10-049"] },
            { card: "BT19-080", as: "tamer" },
          ],
          security: [{ card: "BT1-009" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "wall", dp: 20_000, suspended: true }],
          security: [{ card: "BT1-009" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("x5").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length > 0);

    // ＜Material Save 3＞ moved the real [Shoutmon] and [Ballistamon]; OmniShoutmon was never
    // eligible and went to the trash with the rest of the stack.
    expect(
      s
        .perm("tamer")
        .stack.map((card) => card.cardId)
        .sort(),
    ).toEqual(["BT10-049", "BT19-008"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT19-012");
  });
});
