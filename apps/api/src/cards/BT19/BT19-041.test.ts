import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT19-041.js";

// Inert main-deck Digimon (no printed or inherited text) for deck/security padding: no
// Digi-Egg may sit in either zone, and the numeric `security: n` form is forbidden.
const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-013", "BT1-009"];

function seat0(s: EngineSetup) {
  return s.state.players[0]!;
}

describe("BT19-041 Dynasmon", () => {
  it("matches the catalog print and both printed evolution costs", () => {
    expect(getCardDefinition("BT19-041")).toMatchObject({
      cardId: "BT19-041",
      nameEn: "Dynasmon",
      colors: ["Yellow", "Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Holy Warrior", "Royal Knight"],
      evoCosts: [
        { color: "Yellow", level: 5, memoryCost: 3 },
        { color: "Red", level: 5, memoryCost: 3 },
      ],
      maxCountInDeck: 4,
    });
    const printed = getCardDefinition("BT19-041")!.effectText!;
    expect(printed).toContain(
      "[On Play] [When Digivolving] By trashing the top card of your security stack, 1 of your Digimon gains ＜Blocker＞and gets +6000 DP until the end of your opponent's turn.",
    );
    expect(printed).toContain(
      "[All Turns] [Once Per Turn] When this Digimon would leave the battle area, if you have 2 or fewer security cards, ＜Recovery +1 (Deck)＞.",
    );
    expect(getCardDefinition("BT19-041")!.inheritedEffectText).toBeUndefined();
  });

  it("compiles the printed clauses to the intended IR shape", () => {
    // The card prints no [Digivolve] route, so it has no alternate requirement at all.
    expect(compiled.digivolutionRequirement).toBeUndefined();
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger);
      expect(effect).toMatchObject({
        actions: [
          {
            kind: "ModifyDP",
            amount: 6000,
            duration: "untilOpponentTurnEnd",
            optional: true,
            cost: {
              kind: "trash",
              target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
            },
          },
          {
            kind: "GainKeyword",
            keyword: { keyword: "Blocker" },
            duration: "untilOpponentTurnEnd",
            // One clause, one chosen Digimon: the keyword lands on the DP target.
            target: { sameTarget: true },
          },
        ],
      });
    }
    expect(compiled.effects.find((candidate) => candidate.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "addTop",
              controller: "mine",
              source: "deck",
              amount: 1,
              condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 2 },
            },
          ],
        },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it.each([
    ["BT1-059", "yellow"],
    ["BT1-024", "red"],
  ])("publicly digivolves from a %s Lv5 stack for 3 with the digivolution bonus draw", async (base) => {
    const s = setupEngine(
      {
        0: {
          // A realistic Lv5 stack: Lv3 -> Lv4 -> Lv5.
          battleArea: [{ card: base, as: "base", under: ["BT1-045", "BT1-051"] }],
          hand: [{ card: "BT19-041", as: "dynas" }],
          deck: [{ card: "BT19-030", as: "bonus" }, ...FILLER],
          security: [...SECURITY],
        },
        1: { deck: [...FILLER], security: [...SECURITY] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const dynasId = s.inst("dynas").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: dynasId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === dynasId);

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-045", "BT1-051", base]);
    expect(s.perm("base").stack.at(-1)!.instanceId).toBe(baseId);
    // Digivolution bonus: exactly one card drawn, and the Dynasmon left the hand.
    expect(seat0(s).hand.map((card) => card.instanceId)).toEqual([s.inst("bonus").instanceId]);
    expect(seat0(s).battleArea).toHaveLength(1);
  });

  it.each([
    ["BT19-020", "a blue/black Lv4 source misses both level and colour"],
    ["BT1-051", "a yellow Lv4 source is a level below the printed requirement"],
    ["BT3-038", "a yellow Lv5 Antylamon is legal only for the yellow route, not a colourless one"],
  ])("checks the printed requirement against %s (%s)", async (base, _why) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: base, as: "base" }],
        hand: [{ card: "BT19-041", as: "dynas" }],
        deck: [...FILLER],
        security: [...SECURITY],
      },
      1: { deck: [...FILLER], security: [...SECURITY] },
    });
    s.state.memory = 8;
    await s.ready();
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("dynas").instanceId,
    });
    // BT3-038 is a legal yellow Lv5 source; the other two are near-miss peers.
    const legal = base === "BT3-038";
    expect(result.ok).toBe(legal);
    await settle(() => s.perm("base").topCard?.cardId === (legal ? "BT19-041" : base));
    expect(s.state.memory).toBe(legal ? 5 : 8);
  });

  it("On Play trashes top security and gives ONE chosen Digimon Blocker and +6000 DP", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-059", as: "peer" }],
          hand: [{ card: "BT19-041", as: "dynas" }],
          deck: [...FILLER],
          security: [{ card: "BT1-009", as: "topSecurity" }, "BT1-013", "BT1-009"],
        },
        1: { deck: [...FILLER], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    // Pin the grant onto the peer so the near-miss is the Dynasmon itself, not chance.
    preferInstanceIds.push(s.perm("peer").topCard!.instanceId);
    s.state.memory = 10;
    await s.ready();
    const topSecurityId = s.inst("topSecurity").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dynas").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("peer").currentDP === 15000);

    expect(s.state.memory).toBe(-1);
    expect(seat0(s).security.map((card) => card.cardId)).toEqual(["BT1-013", "BT1-009"]);
    expect(seat0(s).trash.map((card) => card.instanceId)).toEqual([topSecurityId]);
    expect(s.perm("peer").currentDP).toBe(15000);
    expect(observe(s.engine).hasKeyword(s.perm("peer"), "Blocker")).toBe(true);
    // sameTarget: the Dynasmon itself got neither half of the clause.
    expect(s.perm("dynas").currentDP).toBe(11000);
    expect(observe(s.engine).hasKeyword(s.perm("dynas"), "Blocker")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("When Digivolving trashes top security and grants the same pair", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-059", as: "base", under: ["BT1-045", "BT1-051"] }],
          hand: [{ card: "BT19-041", as: "dynas" }],
          deck: [...FILLER],
          security: [{ card: "BT1-009", as: "topSecurity" }, "BT1-013"],
        },
        1: { deck: [...FILLER], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dynas").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").currentDP === 17000);

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard!.cardId).toBe("BT19-041");
    expect(seat0(s).security.map((card) => card.cardId)).toEqual(["BT1-013"]);
    expect(seat0(s).trash.map((card) => card.instanceId)).toEqual([s.inst("topSecurity").instanceId]);
    expect(s.perm("base").currentDP).toBe(17000);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
  });

  it("declines the security cost and grants neither half", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-041", as: "dynas" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { deck: [...FILLER], security: [...SECURITY] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dynas").instanceId })).toEqual({ ok: true });
    await settle(() => seat0(s).battleArea.length === 1);

    expect(seat0(s).security.map((card) => card.cardId)).toEqual(SECURITY);
    expect(seat0(s).trash).toHaveLength(0);
    expect(s.perm("dynas").currentDP).toBe(11000);
    expect(observe(s.engine).hasKeyword(s.perm("dynas"), "Blocker")).toBe(false);
  });

  it("cannot pay the cost with an empty security stack, so nothing is granted", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-041", as: "dynas" }], deck: [...FILLER] },
        1: { deck: [...FILLER], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dynas").instanceId })).toEqual({ ok: true });
    await settle(() => seat0(s).battleArea.length === 1);

    expect(seat0(s).security).toHaveLength(0);
    expect(seat0(s).trash).toHaveLength(0);
    expect(s.perm("dynas").currentDP).toBe(11000);
    expect(observe(s.engine).hasKeyword(s.perm("dynas"), "Blocker")).toBe(false);
  });

  it("keeps +6000 DP and Blocker through both turns, then expires at the opponent's turn end", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-041", as: "dynas" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dynas").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("dynas").currentDP === 17000);
    expect(observe(s.engine).hasKeyword(s.perm("dynas"), "Blocker")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);

    // Still live through the whole of the opponent's turn.
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.perm("dynas").currentDP).toBe(17000);
    expect(observe(s.engine).hasKeyword(s.perm("dynas"), "Blocker")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);

    // Gone by our next turn: it expired at the end of the opponent's turn.
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.perm("dynas").currentDP).toBe(11000);
    expect(observe(s.engine).hasKeyword(s.perm("dynas"), "Blocker")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each([
    [2, true],
    [3, false],
  ])(
    "recovers on would-leave only at 2 or fewer security (%i), and still leaves the battle area",
    async (securityCount, recovers) => {
      let afterLeave: { deck: string[]; security: string[] } | undefined;
      const s: EngineSetup = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT19-041", as: "dynas", under: ["BT1-045", "BT1-051", "BT1-059"] }],
            hand: [{ card: "BT1-009", as: "spare" }],
            deck: [...FILLER],
            security: Array.from({ length: securityCount }, () => "BT1-009"),
          },
          1: {
            // A red permanent so the opponent legally meets Magma Bomb's colour requirement.
            battleArea: [{ card: "BT1-024", as: "opponentRed" }],
            hand: [
              { card: "BT11-096", as: "magmaBomb" },
              { card: "BT1-009", as: "opponentSpare" },
            ],
            deck: [...FILLER],
            security: [...SECURITY],
          },
        },
        {
          autoAcceptOptional: true,
          autoSelectCards: true,
          onEvent() {
            // Paying for the deletion crosses the memory gauge, so the opponent's turn ends
            // and OUR next draw phase runs inside the same drain. Snapshot the zones at the
            // instant the Dynasmon leaves, before that draw can move the deck.
            if (afterLeave !== undefined) return;
            if (s === undefined || seat0(s).battleArea.length > 0) return;
            afterLeave = {
              deck: seat0(s).deck.map((card) => card.instanceId),
              security: seat0(s).security.map((card) => card.instanceId),
            };
          },
        },
      );
      s.state.memory = 3;
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      await s.ready();
      advance(s.engine).endMainPhaseIfOpen(0);

      // A real opponent effect deletes the Dynasmon: BT11-096 deletes the lowest-DP Digimon,
      // and the Dynasmon is the only one they can see.
      await advance(s.engine).waitForMainPhase(1);
      await s.ready();
      const deckBefore = seat0(s).deck.map((card) => card.instanceId);
      const securityBefore = seat0(s).security.map((card) => card.instanceId);
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("magmaBomb").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => seat0(s).battleArea.length === 0);

      // Not a prevention: the Digimon leaves either way, stack and all.
      expect(seat0(s).battleArea).toHaveLength(0);
      expect(seat0(s).trash.map((card) => card.cardId)).toEqual(["BT1-045", "BT1-051", "BT1-059", "BT19-041"]);
      // ＜Recovery +1 (Deck)＞ moves exactly the top deck card onto the security stack, and
      // only while the security stack holds 2 or fewer cards.
      expect(afterLeave).toBeDefined();
      expect(afterLeave!.security).toEqual(recovers ? [deckBefore[0], ...securityBefore] : securityBefore);
      expect(afterLeave!.deck).toEqual(recovers ? deckBefore.slice(1) : deckBefore);

      expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    },
  );

  it("uses the would-leave Recovery only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-041", as: "dynas", under: ["BT19-029"] }],
          deck: [{ card: "BT19-030", as: "firstRecovered" }, { card: "BT19-031", as: "secondRecovered" }, ...FILLER],
          security: ["BT1-009"],
        },
        1: { deck: [...FILLER], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferTriggerKeys: ["BT19-041"] },
    );
    await s.ready();
    const driver = advance(s.engine);

    // First opponent-effect leave: Tapirmon's inherited replacement prevents the leave after
    // Dynasmon's Recovery has already resolved, so the same turn can present a second one.
    driver.verb.enterEffectResolution(1, ["Digimon"]);
    await driver.verb.deletePermanent([s.perm("dynas").permanentId], "byEffect");
    driver.verb.leaveEffectResolution();
    // Ordered Dynasmon first: its Recovery moved BT19-030 onto security (1 -> 2 cards), then
    // Tapirmon's prevention paid that new top card to keep the Digimon on the board.
    expect(seat0(s).battleArea).toHaveLength(1);
    expect(seat0(s).trash.map((card) => card.instanceId)).toEqual([s.inst("firstRecovered").instanceId]);
    expect(seat0(s).security.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(seat0(s).deck.map((card) => card.cardId)[0]).toBe("BT19-031");
    const securityAfterFirst = seat0(s).security.map((card) => card.instanceId);
    const deckAfterFirst = seat0(s).deck.map((card) => card.instanceId);

    driver.verb.enterEffectResolution(1, ["Digimon"]);
    await driver.verb.deletePermanent([s.perm("dynas").permanentId], "byEffect");
    driver.verb.leaveEffectResolution();
    // [Once Per Turn] is spent on both clauses: no second Recovery, and nothing keeps it alive.
    expect(seat0(s).battleArea).toHaveLength(0);
    expect(seat0(s).security.map((card) => card.instanceId)).toEqual(securityAfterFirst);
    expect(seat0(s).deck.map((card) => card.instanceId)).toEqual(deckAfterFirst);
  });

  it("recovers again on the next turn once the [Once Per Turn] resets", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-041", as: "dynas", under: ["BT19-029"] }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: [...FILLER, ...FILLER],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "opponentRed" }],
          hand: [
            { card: "BT11-096", as: "firstBomb" },
            { card: "BT11-096", as: "secondBomb" },
            { card: "BT1-009", as: "opponentSpare" },
          ],
          deck: [...FILLER, ...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: ["BT19-041"] },
    );
    s.state.memory = 3;
    const loop = s.engine.startTurnLoop();

    for (const bomb of ["firstBomb", "secondBomb"] as const) {
      await advance(s.engine).waitForMainPhase(0);
      await s.ready();
      advance(s.engine).endMainPhaseIfOpen(0);

      await advance(s.engine).waitForMainPhase(1);
      await s.ready();
      const deckTop = seat0(s).deck[0]!.instanceId;
      const securityCount = seat0(s).security.length;
      expect(securityCount).toBe(2);
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst(bomb).instanceId })).toEqual({ ok: true });
      // Recovery first (2 -> 3 security), then Tapirmon pays that new top card to keep the
      // Digimon on the board — so each turn nets back to 2 security and one deck card spent.
      await settle(() => seat0(s).trash.some((card) => card.instanceId === deckTop));
      expect(seat0(s).battleArea).toHaveLength(1);
      expect(s.perm("dynas").topCard!.cardId).toBe("BT19-041");
      expect(seat0(s).security).toHaveLength(2);
      expect(seat0(s).deck.some((card) => card.instanceId === deckTop)).toBe(false);
    }

    expect(seat0(s).trash.map((card) => card.cardId)).toHaveLength(2);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("resolves its Recovery before Tapirmon's inherited prevention (Q3095)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-041", as: "dynas", under: ["BT19-029"] }],
          deck: [{ card: "BT19-030", as: "recovered" }, ...FILLER],
          security: [
            { card: "BT1-009", as: "topSecurity" },
            { card: "BT1-013", as: "bottomSecurity" },
          ],
        },
        1: { deck: [...FILLER], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferTriggerKeys: ["BT19-041"] },
    );
    await s.ready();
    const driver = advance(s.engine);
    driver.verb.enterEffectResolution(1, ["Digimon"]);
    await driver.verb.deletePermanent([s.perm("dynas").permanentId], "byEffect");
    driver.verb.leaveEffectResolution();

    // Dynasmon's Recovery went first (2 security -> 3), then Tapirmon's prevention paid the
    // new top card and kept the Digimon on the board.
    expect(seat0(s).battleArea).toHaveLength(1);
    expect(s.perm("dynas").topCard!.cardId).toBe("BT19-041");
    expect(seat0(s).trash.map((card) => card.instanceId)).toEqual([s.inst("recovered").instanceId]);
    expect(seat0(s).security.map((card) => card.instanceId)).toEqual([
      s.inst("topSecurity").instanceId,
      s.inst("bottomSecurity").instanceId,
    ]);
    expect(seat0(s).deck.map((card) => card.cardId)).toEqual(FILLER);
  });

  it("can order Tapirmon's inherited prevention before its own Recovery (Q3095, reverse)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-041", as: "dynas", under: ["BT19-029"] }],
          deck: [{ card: "BT19-030", as: "recovered" }, ...FILLER],
          security: [
            { card: "BT1-009", as: "topSecurity" },
            { card: "BT1-013", as: "bottomSecurity" },
          ],
        },
        1: { deck: [...FILLER], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    await s.ready();
    const driver = advance(s.engine);
    driver.verb.enterEffectResolution(1, ["Digimon"]);
    const deleting = driver.verb.deletePermanent([s.perm("dynas").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const pending = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;
    const keys = request.options?.triggerKeys ?? [];
    expect(keys).toHaveLength(2);
    const tapirmonKey = keys.find((key) => key.includes("BT19-029"));
    expect(tapirmonKey).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "orderTriggers", order: [tapirmonKey!] },
      }),
    ).toEqual({ ok: true });
    await deleting;
    driver.verb.leaveEffectResolution();

    // Tapirmon paid the ORIGINAL top security card first; the Recovery then refilled it.
    expect(seat0(s).battleArea).toHaveLength(1);
    expect(seat0(s).trash.map((card) => card.instanceId)).toEqual([s.inst("topSecurity").instanceId]);
    expect(seat0(s).security.map((card) => card.instanceId)).toEqual([
      s.inst("recovered").instanceId,
      s.inst("bottomSecurity").instanceId,
    ]);
    expect(seat0(s).deck.map((card) => card.cardId)).toEqual(FILLER);
  });
});
