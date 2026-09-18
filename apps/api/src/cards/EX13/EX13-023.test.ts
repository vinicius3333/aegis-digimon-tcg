import {
  assemblyRequirementFor,
  digivolutionRequirementsFor,
  EffectDuration,
  EffectTiming,
  getCardDefinition,
} from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import {
  assertNoLoudGap,
  settle,
  setupEngine,
} from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX13-023.js";

const cardId = "EX13-023";

const SECURITY = ["BT1-012", "BT1-013"];
const DECK = ["BT1-011", "BT1-012", "BT1-013"];

describe("EX13-023 UlforceVeedramon", () => {
  it("matches the catalog identity and printed text", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      nameEn: "UlforceVeedramon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12_000,
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Holy Warrior", "Royal Knight", "CS"],
      evoCosts: [{ color: "Blue", level: 5, memoryCost: 3 }],
    });
    expect(getCardDefinition(cardId)?.inheritedEffectText ?? "").toBe("");

    const effectText = getCardDefinition(cardId)?.effectText ?? "";
    expect(effectText).toContain("[Digivolve] Lv.5 w/[CS] trait: Cost 3");
    expect(effectText).toContain(
      "[Assembly -5] Lv.5 × Lv.4 × Lv.3, all w/[Veemon]/[Veedramon] in name",
    );
    expect(effectText).toContain("＜Blocker＞");
    expect(effectText).toContain("＜Evade＞");
    expect(effectText).toContain(
      "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] 1 of your Digimon may change orientation.",
    );
    expect(effectText).toContain(
      "[On Play] [When Digivolving] You may return all of your opponent's Digimon with the fewest digivolution cards to the bottom of the deck.",
    );
    expect(effectText).toContain(
      "[All Turns] Your opponent's effects can't reduce this unsuspended Digimon's DP, return its stacked cards to the hand or deck, or trash them.",
    );
  });

  it("compiles both play-legality headers, both keywords, the shared once-per-turn body and the protection", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, traits: ["CS"], cost: 3, isAlternate: true },
    ]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(
      compiled.digivolutionRequirement,
    );
    expect(compiled.assemblyRequirement).toEqual([
      {
        reduceCost: 5,
        materials: [
          { level: 5, names: ["Veemon", "Veedramon"], count: 1 },
          { level: 4, names: ["Veemon", "Veedramon"], count: 1 },
          { level: 3, names: ["Veemon", "Veedramon"], count: 1 },
        ],
      },
    ]);
    expect(assemblyRequirementFor(cardId)).toEqual(
      compiled.assemblyRequirement,
    );

    expect(
      compiled.effects.find((effect) => effect.trigger === "Static"),
    ).toMatchObject({
      actions: [],
      keywords: [
        { keyword: "Blocker", raw: "＜Blocker＞" },
        { keyword: "Evade", raw: "＜Evade＞" },
      ],
    });

    for (const trigger of [
      "OnPlay",
      "WhenDigivolving",
      "WhenAttacking",
    ] as const) {
      const effect = compiled.effects.find(
        (candidate) =>
          candidate.trigger === trigger &&
          candidate.frequency === "OncePerTurn",
      )!;
      expect(effect).toMatchObject({ sharedUseKey: "ir-shared-orientation" });
      expect(effect.actions).toHaveLength(1);
      expect(effect.actions[0]).toMatchObject({
        kind: "Modal",
        choose: 1,
        optional: true,
        optionConditions: [
          {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              zone: "battleArea",
              unsuspended: true,
            },
          },
          {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              zone: "battleArea",
              suspended: true,
            },
          },
        ],
        options: [
          [
            {
              kind: "Suspend",
              target: {
                count: 1,
                filter: { controller: "mine", unsuspended: true },
              },
            },
          ],
          [
            {
              kind: "Unsuspend",
              target: {
                count: 1,
                filter: { controller: "mine", suspended: true },
              },
            },
          ],
        ],
      });
    }

    const returnWindows = compiled.effects.filter((effect) =>
      effect.actions.some((action) => action.kind === "Return"),
    );
    expect(returnWindows.map((effect) => effect.trigger)).toEqual([
      "OnPlay",
      "WhenDigivolving",
    ]);
    for (const effect of returnWindows) {
      expect(effect.frequency).toBeUndefined();
      expect(effect.actions[0]).toMatchObject({
        kind: "Return",
        to: "deckBottom",
        optional: true,
        target: {
          count: "all",
          filter: {
            controller: "opponent",
            kind: ["Digimon"],
            superlative: "lowestDigivolutionCards",
          },
        },
      });
    }

    expect(
      compiled.effects.find((effect) => effect.trigger === "AllTurns")!.actions,
    ).toMatchObject([
      {
        kind: "Restrict",
        restriction: "dpImmune",
        byOpponentEffectsOnly: true,
        while: { kind: "selfUnsuspended" },
        duration: "permanent",
        target: { isSelf: true, filter: { isSelfRef: true } },
      },
      {
        kind: "StackTrashLock",
        condition: { kind: "selfUnsuspended" },
        duration: "permanent",
        target: { isSelf: true, filter: { isSelfRef: true } },
      },
      {
        kind: "Restrict",
        restriction: "stackReturn",
        byOpponentEffectsOnly: true,
        while: { kind: "selfUnsuspended" },
        duration: "permanent",
        target: { isSelf: true, filter: { isSelfRef: true } },
      },
    ]);

    expect(compiled.effects.some((effect) => effect.isInherited === true)).toBe(
      false,
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("digivolves from a YELLOW Lv.5 [CS] Digimon for 3, which no printed EvoCost covers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-031", as: "angewomon" }],
          hand: [
            { card: cardId, as: "ulforce" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: [
            { card: "BT1-011", as: "evolutionDraw" },
            "BT1-012",
            "BT1-013",
          ],
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("angewomon").permanentId,
        instanceId: s.inst("ulforce").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("angewomon").topCard?.cardId === cardId);

    expect(s.perm("angewomon").topCard?.instanceId).toBe(
      s.inst("ulforce").instanceId,
    );
    expect(s.perm("angewomon").stack.map((card) => card.cardId)).toEqual([
      "BT23-031",
    ]);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      s.inst("evolutionDraw").instanceId,
    );
    expect(s.perm("angewomon").currentDP).toBe(12_000);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("digivolves from the Blue Lv.5 [CS] AeroVeedramon on both the printed EvoCost and the alternate route", async () => {
    for (const useAlternateCost of [false, true]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "EX13-022", as: "aero" }],
            hand: [
              { card: cardId, as: "ulforce" },
              { card: "BT1-010", as: "spare" },
            ],
            deck: DECK,
          },
          1: { security: SECURITY, deck: DECK },
        },
        { autoSelectCards: true, autoAcceptOptional: true },
      );
      s.state.memory = 5;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("aero").permanentId,
          instanceId: s.inst("ulforce").instanceId,
          ...(useAlternateCost ? { useAlternateCost: true } : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("aero").topCard?.cardId === cardId);

      expect(s.state.memory).toBe(2);
      expect(s.perm("aero").stack.map((card) => card.cardId)).toEqual([
        "EX13-022",
      ]);
      assertNoLoudGap(s);
    }
  });

  it("discriminates the route three ways: Lv.5 [CS] passes, Lv.5 without [CS] and Lv.4 [CS] are refused", async () => {
    const traitMiss = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-033", as: "yellowAero" }],
          hand: [
            { card: cardId, as: "ulforce" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: DECK,
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoSelectCards: true },
    );
    traitMiss.state.memory = 5;
    await traitMiss.ready();

    for (const useAlternateCost of [true, false]) {
      expect(
        traitMiss.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: traitMiss.perm("yellowAero").permanentId,
          instanceId: traitMiss.inst("ulforce").instanceId,
          ...(useAlternateCost ? { useAlternateCost: true } : {}),
        }).ok,
      ).toBe(false);
    }
    expect(traitMiss.perm("yellowAero").topCard?.cardId).toBe("EX3-033");
    expect(traitMiss.state.memory).toBe(5);

    const levelMiss = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX13-019", as: "veedramon" }],
          hand: [
            { card: cardId, as: "ulforce" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: DECK,
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoSelectCards: true },
    );
    levelMiss.state.memory = 5;
    await levelMiss.ready();

    for (const useAlternateCost of [true, false]) {
      expect(
        levelMiss.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: levelMiss.perm("veedramon").permanentId,
          instanceId: levelMiss.inst("ulforce").instanceId,
          ...(useAlternateCost ? { useAlternateCost: true } : {}),
        }).ok,
      ).toBe(false);
    }
    expect(levelMiss.perm("veedramon").topCard?.cardId).toBe("EX13-019");
    expect(levelMiss.state.memory).toBe(5);
  });

  it("plays by Assembly -5, placing the three trash materials under it for a play cost of 7", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "ulforce" },
            { card: "BT1-010", as: "spare" },
          ],
          trash: [
            { card: "EX13-022", as: "lv5" },
            { card: "ST8-05", as: "lv4" },
            { card: "BT2-021", as: "lv3" },
          ],
          deck: DECK,
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("ulforce").instanceId,
        assembly: {
          materialInstanceIds: [
            s.inst("lv5").instanceId,
            s.inst("lv4").instanceId,
            s.inst("lv3").instanceId,
          ],
        },
      } as never),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === cardId),
    );

    const played = s.state.players[0]!.battleArea.find(
      (p) => p.topCard?.cardId === cardId,
    )!;
    expect(played.stack.map((card) => card.cardId)).toEqual([
      "BT2-021",
      "ST8-05",
      "EX13-022",
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("rejects an Assembly whose levels do not match the printed Lv.5 × Lv.4 × Lv.3 recipe", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "ulforce" }],
          trash: [
            { card: "ST8-05", as: "lv4a" },
            { card: "EX13-019", as: "lv4b" },
            { card: "BT2-021", as: "lv3" },
          ],
          deck: DECK,
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("ulforce").instanceId,
        assembly: {
          materialInstanceIds: [
            s.inst("lv4a").instanceId,
            s.inst("lv4b").instanceId,
            s.inst("lv3").instanceId,
          ],
        },
      } as never).ok,
    ).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.state.memory).toBe(8);
  });

  it("rejects an Assembly material whose name carries neither [Veemon] nor [Veedramon]", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "ulforce" }],
          trash: [
            { card: "EX13-022", as: "lv5" },
            { card: "ST8-05", as: "lv4" },
            { card: "BT1-009", as: "wrongName" },
          ],
          deck: DECK,
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("ulforce").instanceId,
        assembly: {
          materialInstanceIds: [
            s.inst("lv5").instanceId,
            s.inst("lv4").instanceId,
            s.inst("wrongName").instanceId,
          ],
        },
      } as never).ok,
    ).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.state.memory).toBe(8);
  });

  it("suspends an unsuspended Digimon when that is the only direction available", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "ulforce" }],
          hand: [{ card: "BT1-010", as: "spare" }],
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("ulforce"));

    expect(s.perm("ulforce").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("unsuspends a suspended Digimon when that is the only direction available", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "ulforce", suspended: true },
            { card: "BT1-009", as: "ally", suspended: true },
          ],
          hand: [{ card: "BT1-010", as: "spare" }],
        },
        1: { security: SECURITY, deck: DECK },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    await s.ready();
    preferred.push(s.perm("ally").permanentId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("ulforce"));

    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.perm("ulforce").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("offers both directions when the board holds a suspended and an unsuspended Digimon", async () => {
    const unsuspendRun = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "ulforce" },
            { card: "BT1-009", as: "ally", suspended: true },
          ],
          hand: [{ card: "BT1-010", as: "spare" }],
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    await unsuspendRun.ready();

    await advance(unsuspendRun.engine).fire(
      EffectTiming.OnPlay,
      unsuspendRun.perm("ulforce"),
    );
    expect(unsuspendRun.perm("ally").isSuspended).toBe(false);
    expect(unsuspendRun.perm("ulforce").isSuspended).toBe(false);

    const suspendRun = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "ulforce" },
            { card: "BT1-009", as: "ally", suspended: true },
          ],
          hand: [{ card: "BT1-010", as: "spare" }],
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 0 },
    );
    await suspendRun.ready();

    await advance(suspendRun.engine).fire(
      EffectTiming.OnPlay,
      suspendRun.perm("ulforce"),
    );
    expect(suspendRun.perm("ulforce").isSuspended).toBe(true);
    expect(suspendRun.perm("ally").isSuspended).toBe(true);
  });

  it("never reaches the opponent's Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "ulforce" }],
          hand: [{ card: "BT1-010", as: "spare" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "theirs", suspended: true }],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("ulforce"));

    expect(s.perm("theirs").isSuspended).toBe(true);
    expect(s.perm("ulforce").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("leaves the board alone when the printed 'may' is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "ulforce" }],
          hand: [{ card: "BT1-010", as: "spare" }],
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("ulforce"));

    expect(s.perm("ulforce").isSuspended).toBe(false);
  });

  it("shares one [Once Per Turn] across all three orientation timings and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "ulforce" }],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: DECK,
        },
        1: {
          hand: [{ card: "BT1-011", as: "spareOpponent" }],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("ulforce"));
    expect(s.perm("ulforce").isSuspended).toBe(true);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("ulforce"));
    expect(s.perm("ulforce").isSuspended).toBe(true);
    await advance(s.engine).fire(
      EffectTiming.WhenDigivolving,
      s.perm("ulforce"),
    );
    expect(s.perm("ulforce").isSuspended).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 3;
    s.perm("ulforce").isSuspended = true;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("ulforce"));
    expect(s.perm("ulforce").isSuspended).toBe(false);
  });

  it("returns every tied-fewest opponent Digimon to the deck bottom and leaves the deeper stack alone", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "ulforce" }],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: DECK,
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "bareA" },
            { card: "BT1-010", as: "bareB" },
            { card: "BT1-014", as: "deep", under: ["BT1-011", "BT1-012"] },
          ],
          security: SECURITY,
          deck: [{ card: "BT1-013", as: "deckFloor" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const bareAId = s.perm("bareA").topCard!.instanceId;
    const bareBId = s.perm("bareB").topCard!.instanceId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("ulforce"));

    expect(
      s.state.players[1]!.battleArea.map(
        (permanent) => permanent.topCard?.cardId,
      ),
    ).toEqual(["BT1-014"]);
    const deck = s.state.players[1]!.deck.map((card) => card.instanceId);
    expect(deck.slice(-2)).toEqual([bareAId, bareBId]);
    expect(deck[0]).toBe(s.inst("deckFloor").instanceId);
    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("returns only the single fewest-stacked Digimon when there is no tie", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "ulforce" }],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: DECK,
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "oneCard", under: ["BT1-011"] },
            { card: "BT1-010", as: "twoCards", under: ["BT1-011", "BT1-012"] },
          ],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const returnedId = s.perm("oneCard").topCard!.instanceId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("ulforce"));

    expect(
      s.state.players[1]!.battleArea.map(
        (permanent) => permanent.topCard?.cardId,
      ),
    ).toEqual(["BT1-010"]);
    expect(
      s.state.players[1]!.deck.map((card) => card.instanceId).slice(-1),
    ).toEqual([returnedId]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual([
      "BT1-011",
    ]);
    assertNoLoudGap(s);
  });

  it("returns nothing when the printed 'may' is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "ulforce" }],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: DECK,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "bare" }],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("ulforce"));

    expect(
      s.state.players[1]!.battleArea.map(
        (permanent) => permanent.topCard?.cardId,
      ),
    ).toEqual(["BT1-009"]);
  });

  it("fires the return clause from the digivolve window too, and only from those two timings", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "ulforce" }],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: DECK,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "bare" }],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("ulforce"));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    await advance(s.engine).fire(
      EffectTiming.WhenDigivolving,
      s.perm("ulforce"),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("refuses the opponent's DP reduction while unsuspended and accepts it once suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "ulforce" }],
          hand: [{ card: "BT1-010", as: "spare" }],
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).isRestricted(s.perm("ulforce"), "dpImmune")).toBe(
      true,
    );
    advance(s.engine).verb.enterEffectResolution(1);
    await advance(s.engine).verb.modifyDP(
      s.perm("ulforce").permanentId,
      -3000,
      EffectDuration.UntilEachTurnEnd,
    );
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("ulforce").currentDP).toBe(12_000);

    await advance(s.engine).verb.suspend([s.perm("ulforce").permanentId], 0);
    expect(observe(s.engine).isRestricted(s.perm("ulforce"), "dpImmune")).toBe(
      false,
    );
    advance(s.engine).verb.enterEffectResolution(1);
    await advance(s.engine).verb.modifyDP(
      s.perm("ulforce").permanentId,
      -3000,
      EffectDuration.UntilEachTurnEnd,
    );
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("ulforce").currentDP).toBe(9000);

    await advance(s.engine).verb.unsuspend([s.perm("ulforce").permanentId]);
    expect(observe(s.engine).isRestricted(s.perm("ulforce"), "dpImmune")).toBe(
      true,
    );
  });

  it("refuses a real opponent card's -3000 DP effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "ulforce" }],
          hand: [{ card: "BT1-010", as: "spare" }],
          security: SECURITY,
          deck: DECK,
        },
        1: {
          hand: [
            { card: "BT23-028", as: "reducer" },
            { card: "BT1-011", as: "spareOpponent" },
          ],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "playCard",
        instanceId: s.inst("reducer").instanceId,
      }),
    ).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.topCard?.cardId === "BT23-028",
      ),
    );

    expect(s.perm("ulforce").currentDP).toBe(12_000);
    expect(observe(s.engine).isRestricted(s.perm("ulforce"), "dpImmune")).toBe(
      true,
    );
    assertNoLoudGap(s);
  });

  it("refuses the opponent's stacked-card trash and return while unsuspended, but never its own controller's", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: cardId,
              as: "ulforce",
              under: [{ card: "EX13-022", as: "beneath" }],
            },
          ],
          hand: [{ card: "BT1-010", as: "spare" }],
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("ulforce").permanentId;
    const beneathId = s.inst("beneath").instanceId;

    // The printed protection covers the stacked cards only: the Digimon itself can still be bounced.
    expect(
      observe(s.engine).isRestricted(s.perm("ulforce"), "stackReturn"),
    ).toBe(true);
    expect(
      observe(s.engine).isRestricted(s.perm("ulforce"), "beReturned"),
    ).toBe(false);

    await advance(s.engine).verb.trashDigivolutionCards(hostId, [beneathId], 1);
    expect(s.perm("ulforce").stack.map((card) => card.instanceId)).toEqual([
      beneathId,
    ]);

    advance(s.engine).verb.enterEffectResolution(1);
    await advance(s.engine).verb.returnToHand([beneathId]);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("ulforce").stack.map((card) => card.instanceId)).toEqual([
      beneathId,
    ]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain(
      "EX13-022",
    );

    await advance(s.engine).verb.trashDigivolutionCards(hostId, [beneathId], 0);
    expect(s.perm("ulforce").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([
      "EX13-022",
    ]);
  });

  it("lifts the stacked-card trash lock once the Digimon suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: cardId,
              as: "ulforce",
              suspended: true,
              under: [{ card: "EX13-022", as: "beneath" }],
            },
          ],
          hand: [{ card: "BT1-010", as: "spare" }],
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("ulforce").permanentId,
      [s.inst("beneath").instanceId],
      1,
    );
    expect(s.perm("ulforce").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([
      "EX13-022",
    ]);
  });

  it("opens a real block window and intercepts an attack with ＜Blocker＞", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      1: {
        battleArea: [{ card: cardId, as: "ulforce" }],
        security: ["BT1-011"],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("ulforce"), "Blocker")).toBe(
      true,
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.events.some((event) => event.kind === "blockWindowOpened"),
    );
    expect(
      s.events.find((event) => event.kind === "blockWindowOpened"),
    ).toMatchObject({
      eligibleBlockerIds: [s.perm("ulforce").permanentId],
    });

    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("ulforce").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.events.some((event) => event.kind === "combatResolved"),
    );

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(
      s.state.players[1]!.battleArea.map(
        (permanent) => permanent.topCard?.cardId,
      ),
    ).toEqual([cardId]);
  });

  it.each([true, false])(
    "survives a public opponent deletion with ＜Evade＞ when accept=%s",
    async (accept) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: cardId, as: "ulforce" }],
            security: SECURITY,
            deck: DECK,
          },
          1: {
            battleArea: [{ card: "BT1-020", as: "redSource" }],
            hand: [{ card: "BT6-095", as: "happyBullet" }],
            security: SECURITY,
            deck: DECK,
          },
        },
        { autoSelectCards: true },
      );
      const permanentId = s.perm("ulforce").permanentId;
      const optionId = s.inst("happyBullet").instanceId;
      s.state.turnSeat = 1;
      s.state.memory = 7;
      await s.ready();
      expect(observe(s.engine).hasKeyword(s.perm("ulforce"), "Evade")).toBe(
        true,
      );

      expect(
        s.engine.applyIntent(1, { type: "playCard", instanceId: optionId }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
      expect(
        s.engine.applyIntent(0, { type: "respondEvade", permanentId, accept }),
      ).toEqual({ ok: true });
      await settle(() =>
        s.events.some(
          (event) =>
            event.kind === "cardsMoved" && event.instanceIds.includes(optionId),
        ),
      );

      const remaining = s.state.players[0]!.battleArea.find(
        (permanent) => permanent.permanentId === permanentId,
      );
      expect(remaining !== undefined).toBe(accept);
      expect(remaining?.isSuspended ?? false).toBe(accept);
      expect(
        s.state.players[0]!.trash.map((card) => card.cardId).includes(cardId),
      ).toBe(!accept);
    },
  );
});
