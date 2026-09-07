import { EffectTiming, getCardDefinition, type Permanent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-054.js";

/** A card with no [Digivolve] alternate route and no CS trait — a neutral spare Main-phase play. */
const NEUTRAL = "BT1-010";
/** Lv.3 Blue [CS] [Veemon] — satisfies BOTH the printed Blue Lv.3 EvoCost and the [Veemon] route. */
const VEEMON_CS = "BT22-019";
/** Lv.3 Blue, no [CS], not named Veemon — printed EvoCost only. */
const PLAIN_BLUE_LV3 = "BT2-022";
/** Lv.3 Green/Yellow [CS] with no digivolution-cost reduction — the alternate trait route only. */
const CS_LV3 = "BT22-043";
/** Lv.3 Green/Yellow [CS] that reduces the cost of digivolving into a [CS] card by 1. */
const CS_LV3_DISCOUNTER = "BT23-037";
/** Lv.4 Blue, name CONTAINS "Veemon" but is not [Veemon]. */
const EXVEEMON = "BT3-025";

/** The permanent a decision candidate id names, whether it is a permanent id or a top-card id. */
function permanentForCandidate(s: EngineSetup, id: string): Permanent | undefined {
  for (const player of s.state.players) {
    const found = player.battleArea.find((p) => p.permanentId === id || p.topCard?.instanceId === id);
    if (found !== undefined) return found;
    const breeding = player.breeding;
    if (breeding !== undefined && (breeding.permanentId === id || breeding.topCard?.instanceId === id)) {
      return breeding;
    }
  }
  return undefined;
}

/** Every permanent the last target/selection decision offered, as a set of permanent ids. */
function offeredPermanentIds(s: EngineSetup): Set<string> {
  const request = s.decisions.filter(({ req }) => req.kind === "chooseTargets" || req.kind === "selectCards").at(-1);
  expect(request, "no target decision was raised").toBeDefined();
  const ids = new Set<string>();
  for (const candidate of request!.req.options?.candidateInstanceIds ?? []) {
    const permanent = permanentForCandidate(s, candidate);
    if (permanent !== undefined) ids.add(permanent.permanentId);
  }
  return ids;
}

describe("BT23-054 Magnamon", () => {
  it("matches every catalog field, the printed text and the compiled shape", () => {
    const definition = getCardDefinition("BT23-054");
    expect(definition).toMatchObject({
      cardId: "BT23-054",
      nameEn: "Magnamon",
      colors: ["Black", "Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Black", level: 3, memoryCost: 4 },
        { color: "Blue", level: 3, memoryCost: 4 },
      ],
      forms: ["Armor Form"],
      attributes: ["Free"],
      types: ["Holy Warrior", "Royal Knight", "CS"],
    });
    // The catalog stores non-breaking spaces and trailing blanks; compare on normalized text.
    const printed = (definition?.effectText ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    expect(printed).toBe(
      "[Digivolve] [Veemon]/Lv.3 w/[CS] trait: Cost 3 ＜Blocker＞ ＜Armor Purge＞ " +
        "[On Play] [When Digivolving] ＜Draw 1＞ Then, 1 of your Digimon with the [Royal Knight] or [CS] " +
        "trait can't be returned to hands or decks by your opponent's effects until their turn ends.",
    );
    // The printed name is bracketed, so the route is an EXACT-name gate. `names` is a substring
    // gate in cardData.matchGatedRequirement and let ExVeemon/DemiVeemon take this route.
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Veemon"], cost: 3, isAlternate: true },
      { level: 3, traits: ["CS"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("declares the same Draw-then-protect body on both [On Play] and [When Digivolving]", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect, `no ${trigger} effect`).toBeDefined();
      expect(effect!.actions[0]).toMatchObject({ kind: "Draw", controller: "mine", amount: 1 });
      expect(effect!.actions[1]).toMatchObject({
        kind: "Restrict",
        restriction: "beReturned",
        duration: "untilOpponentTurnEnd",
        byOpponentEffectsOnly: true,
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Royal Knight", "CS"], match: "trait" }],
          },
          count: 1,
        },
      });
    }
    expect(
      compiled.effects
        .filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords?.map((keyword) => keyword.keyword) ?? []),
    ).toEqual(["Blocker", "Armor Purge"]);
  });

  it("publicly plays for exactly 7, draws 1 and protects exactly one eligible Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CS_LV3, as: "ally" },
            { card: NEUTRAL, as: "plainAlly" },
          ],
          hand: [
            { card: "BT23-054", as: "magna" },
            { card: NEUTRAL, as: "spare" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }, "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: CS_LV3, as: "opponentCs" }],
          hand: [{ card: NEUTRAL, as: "opponentSpare" }],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: [] },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    const allyId = s.perm("ally").permanentId;
    const magnaInstanceId = s.inst("magna").instanceId;
    const drawnInstanceId = s.inst("drawn").instanceId;
    const handSizeBefore = s.state.players[0]!.hand.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: magnaInstanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.memory === 3);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === magnaInstanceId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === magnaInstanceId)).toBe(
      true,
    );
    // ＜Draw 1＞: the exact top-of-deck card is now in hand, and hand size is net -1 (played -1, drew +1).
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawnInstanceId)).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(handSizeBefore);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === drawnInstanceId)).toBe(false);

    // Exactly one of the two eligible own Digimon (Magnamon itself and the CS ally) is protected.
    const protectedOwn = s.state.players[0]!.battleArea.filter((permanent) =>
      observe(s.engine).isRestricted(permanent, "beReturned"),
    );
    expect(protectedOwn).toHaveLength(1);
    expect(observe(s.engine).isRestricted(s.perm("plainAlly"), "beReturned")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("opponentCs"), "beReturned")).toBe(false);

    // Only own battle-area [Royal Knight]/[CS] Digimon were ever offered.
    const offered = offeredPermanentIds(s);
    const magnamonPermanentId = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === magnaInstanceId,
    )!.permanentId;
    expect([...offered].sort()).toEqual([allyId, magnamonPermanentId].sort());
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not offer a breeding-area [CS] Digimon as the protection target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-054", as: "magna" }],
          breeding: { card: CS_LV3, as: "hatched" },
          deck: ["BT1-009", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("magna"));
    await settle(() => s.state.pendingDecision === undefined);

    // Magnamon is the only candidate, so the engine resolves the target without a decision;
    // the breeding [CS] Digimon is never reachable.
    expect(observe(s.engine).isRestricted(s.perm("magna"), "beReturned")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("hatched"), "beReturned")).toBe(false);
  });

  it("blocks an opponent effect returning the protected Digimon to hand or to deck", async () => {
    for (const route of ["hand", "deck"] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT23-054", as: "magna" }],
            deck: ["BT1-009", "BT1-011"],
          },
        },
        { autoSelectCards: true },
      );
      await s.ready();
      await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("magna"));
      await settle(() => s.state.pendingDecision === undefined);
      const magnaPermanentId = s.perm("magna").permanentId;
      const magnaCardId = s.perm("magna").topCard!.instanceId;
      expect(observe(s.engine).isRestricted(s.perm("magna"), "beReturned")).toBe(true);

      // The opponent (seat 1) is the effect owner: the restriction must hold.
      advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
      if (route === "hand") await advance(s.engine).verb.returnToHand([magnaCardId]);
      else await advance(s.engine).verb.returnToDeck([magnaCardId]);
      advance(s.engine).verb.leaveEffectResolution();

      expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === magnaPermanentId)).toBe(true);
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === magnaCardId)).toBe(false);
      expect(s.state.players[0]!.deck.some((card) => card.instanceId === magnaCardId)).toBe(false);
    }
  });

  it("still lets the controller's own effect return the protected Digimon", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT23-054", as: "magna" }], deck: ["BT1-009", "BT1-011"] } },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("magna"));
    await settle(() => s.state.pendingDecision === undefined);
    const magnaPermanentId = s.perm("magna").permanentId;
    const magnaCardId = s.perm("magna").topCard!.instanceId;

    advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
    await advance(s.engine).verb.returnToHand([magnaCardId]);
    advance(s.engine).verb.leaveEffectResolution();

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === magnaPermanentId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === magnaCardId)).toBe(true);
  });

  it("keeps the protection through the opponent's whole turn and drops it once that turn ends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-054", as: "magna" }],
          hand: [{ card: NEUTRAL, as: "spare" }],
          deck: [{ card: "BT1-009", as: "drawn" }, "BT1-011", "BT1-012"],
        },
        1: { hand: [{ card: NEUTRAL, as: "opponentSpare" }], deck: ["BT1-013", "BT1-014"] },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("magna"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(observe(s.engine).isRestricted(s.perm("magna"), "beReturned")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    // Still armed for the whole of the opponent's turn.
    expect(observe(s.engine).isRestricted(s.perm("magna"), "beReturned")).toBe(true);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestricted(s.perm("magna"), "beReturned")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("digivolves from [Veemon] for exactly 3 on the alternate route, drawing and protecting", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: VEEMON_CS, as: "base" }],
          hand: [{ card: "BT23-054", as: "magna" }],
          deck: [{ card: "BT1-009", as: "drawn" }, "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    const baseCardId = s.perm("base").topCard!.instanceId;
    const magnaInstanceId = s.inst("magna").instanceId;
    const drawnInstanceId = s.inst("drawn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: magnaInstanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.memory === 1);

    expect(s.state.memory).toBe(1);
    expect(s.perm("base").topCard!.instanceId).toBe(magnaInstanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseCardId]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawnInstanceId)).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("base"), "beReturned")).toBe(true);
  });

  it("pays the printed 4 from the same [Veemon] base when the alternate route is not requested", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: VEEMON_CS, as: "base" }],
          hand: [{ card: "BT23-054", as: "magna" }],
          deck: ["BT1-009", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("magna").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.memory === 0);

    expect(s.state.memory).toBe(0);
  });

  it("digivolves from a Lv.3 [CS] base for exactly 3 even though its colors miss the printed EvoCost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CS_LV3, as: "base" }],
          hand: [{ card: "BT23-054", as: "magna" }],
          deck: [{ card: "BT1-009", as: "drawn" }, "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    const baseCardId = s.perm("base").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("magna").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.memory === 1);

    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseCardId]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("lets a base's own cost reduction stack onto the Cost 3 route (BT23-037 reduces it to 2)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CS_LV3_DISCOUNTER, as: "base" }],
          hand: [{ card: "BT23-054", as: "magna" }],
          deck: ["BT1-009", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("magna").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.memory === 2);

    expect(s.state.memory).toBe(2);
  });

  it("pays the printed 4 from a plain Blue Lv.3 base even when the alternate flag is set", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: PLAIN_BLUE_LV3, as: "base" }],
          hand: [{ card: "BT23-054", as: "magna" }],
          deck: ["BT1-009", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("magna").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.memory === 0);

    expect(s.state.memory).toBe(0);
  });

  it.each([
    ["ExVeemon, a Lv.4 whose name only CONTAINS Veemon", EXVEEMON],
    ["a Red Lv.3 with neither the name nor the [CS] trait", NEUTRAL],
  ])("refuses an illegal source: %s", async (_label, base) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: base, as: "base" }],
        hand: [{ card: "BT23-054", as: "magna" }],
        deck: ["BT1-009", "BT1-011"],
      },
    });
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("magna").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("magna").instanceId)).toBe(true);
  });

  it("exposes ＜Blocker＞ and ＜Armor Purge＞ through the live keyword seam", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-054", as: "magna" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("magna"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("magna"), "Armor Purge")).toBe(true);
  });

  it("＜Blocker＞ switches a declared player attack onto Magnamon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-054", as: "magna" }], security: 2 },
      1: { battleArea: [{ card: "BT1-014", as: "attacker", dp: 12000 }] },
    });
    await s.ready();
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"), 5000);
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("magna").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"), 5000);

    // The attack never reached the player: no security check, and the battle happened on Magnamon.
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(2);
  });

  it("＜Armor Purge＞ spares Magnamon from a lost battle by trashing its own top card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-054", as: "magna", suspended: true, under: [{ card: VEEMON_CS, as: "under" }] }],
        },
        1: { battleArea: [{ card: "BT1-014", as: "attacker", dp: 12000 }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    const magnaPermanentId = s.perm("magna").permanentId;
    const underInstanceId = s.inst("under").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: magnaPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT23-054"), 5000);
    await settle(() => false, 50);

    const survivor = s.state.players[0]!.battleArea.find((p) => p.permanentId === magnaPermanentId);
    expect(survivor).toBeDefined();
    expect(survivor!.topCard?.instanceId).toBe(underInstanceId);
    expect(survivor!.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT23-054")).toBe(true);
  });
});
