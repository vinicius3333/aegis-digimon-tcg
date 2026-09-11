import {
  assemblyRequirementFor,
  digivolutionRequirementsFor,
  EffectDuration,
  EffectTiming,
  getCardDefinition,
} from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX13-023.js";

const cardId = "EX13-023";

// Fixtures, and why each one is here:
//   BT1-009 Monodramon     Red Lv.3 3000 DP, no printed text — neutral board filler
//   BT1-010 .. BT1-014     inert red main-deck Digimon — spare hand cards, deck and security bulk
//   EX13-022 AeroVeedramon Blue Lv.5 [Holy Dragon]/[CS] — the only catalog card that satisfies
//                          the printed Blue Lv.5 EvoCost AND the alternate [CS] route at the same
//                          cost. It is only ever a digivolution/Assembly card here and nothing in
//                          these tests suspends it or plays a Tamer, so none of its own windows
//                          can open whether or not its module is registered
//   BT23-031 Angewomon     YELLOW Lv.5 [Archangel]/[CS] — reaches the alternate route although no
//                          printed EvoCost covers yellow, proving the route is wider than the
//                          catalog EvoCost
//   EX3-033 AeroVeedramon  YELLOW Lv.5 [Holy Dragon], no [CS] — the trait negative, matched to
//                          BT23-031 on color and level so only the trait differs
//   EX13-019 Veedramon     Blue Lv.4 [Mythical Dragon]/[CS] — the level negative: right trait,
//                          wrong level
//   ST8-05 Veedramon       Blue Lv.4, no printed main text — Assembly Lv.4 slot
//   BT2-021 Veemon         Blue Lv.3, no printed main text — Assembly Lv.3 slot
//   BT23-028 Coordemon     [On Play] 1 of your opponent's Digimon gets -3000 DP for the turn —
//                          the opponent DP-reduction effect the [All Turns] clause must refuse
//   BT6-095 Happy Bullet Showering  [Main] Delete all of your opponent's Digimon with the lowest
//                          DP — a public opponent deletion that opens the ＜Evade＞ prompt
//   BT1-020 Groundramon    Red Lv.5, no text — the red Digimon BT6-095's color requirement needs
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
    // No printed inherited effect.
    expect(getCardDefinition(cardId)?.inheritedEffectText ?? "").toBe("");

    const effectText = getCardDefinition(cardId)?.effectText ?? "";
    expect(effectText).toContain("[Digivolve] Lv.5 w/[CS] trait: Cost 3");
    expect(effectText).toContain("[Assembly -5] Lv.5 × Lv.4 × Lv.3, all w/[Veemon]/[Veedramon] in name");
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
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["CS"], cost: 3, isAlternate: true }]);
    // `digivolutionRequirementsFor` reports only the printed ALTERNATE paths; the catalog Blue
    // Lv.5 EvoCost stays on the card definition and is proven separately below by cost.
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
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
    expect(assemblyRequirementFor(cardId)).toEqual(compiled.assemblyRequirement);

    expect(compiled.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      actions: [],
      keywords: [
        { keyword: "Blocker", raw: "＜Blocker＞" },
        { keyword: "Evade", raw: "＜Evade＞" },
      ],
    });

    // One printed [Once Per Turn] covers all three orientation timings, so all three share one
    // per-turn ledger key.
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"] as const) {
      const effect = compiled.effects.find(
        (candidate) => candidate.trigger === trigger && candidate.frequency === "OncePerTurn",
      )!;
      expect(effect).toMatchObject({ sharedUseKey: "ir-shared-orientation" });
      expect(effect.actions).toHaveLength(1);
      expect(effect.actions[0]).toMatchObject({
        kind: "Modal",
        choose: 1,
        optional: true,
        // Each bullet is gated on a Digimon in the battle area facing that way, so the engine
        // never offers the impossible direction (the breeding area is excluded by `zone`).
        optionConditions: [
          { kind: "youHave", filter: { controllerDefault: "mine", zone: "battleArea", unsuspended: true } },
          { kind: "youHave", filter: { controllerDefault: "mine", zone: "battleArea", suspended: true } },
        ],
        options: [
          [{ kind: "Suspend", target: { count: 1, filter: { controller: "mine", unsuspended: true } } }],
          [{ kind: "Unsuspend", target: { count: 1, filter: { controller: "mine", suspended: true } } }],
        ],
      });
    }

    // The return clause has only the two entry timings and no [Once Per Turn].
    const returnWindows = compiled.effects.filter((effect) =>
      effect.actions.some((action) => action.kind === "Return"),
    );
    expect(returnWindows.map((effect) => effect.trigger)).toEqual(["OnPlay", "WhenDigivolving"]);
    for (const effect of returnWindows) {
      expect(effect.frequency).toBeUndefined();
      expect(effect.actions[0]).toMatchObject({
        kind: "Return",
        to: "deckBottom",
        optional: true,
        target: {
          count: "all",
          filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDigivolutionCards" },
        },
      });
    }

    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")!.actions).toMatchObject([
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
        restriction: "returnToHandOrDeck",
        byOpponentEffectsOnly: true,
        while: { kind: "selfUnsuspended" },
        duration: "permanent",
        target: { isSelf: true, filter: { isSelfRef: true } },
      },
    ]);

    // Nothing is printed below the line, so no effect may be inherited.
    expect(compiled.effects.some((effect) => effect.isInherited === true)).toBe(false);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // [Digivolve] Lv.5 w/[CS] trait: Cost 3 — beside the catalog Blue Lv.5 EvoCost
  // ---------------------------------------------------------------------------

  it("digivolves from a YELLOW Lv.5 [CS] Digimon for 3, which no printed EvoCost covers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-031", as: "angewomon" }],
          hand: [
            { card: cardId, as: "ulforce" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: [{ card: "BT1-011", as: "evolutionDraw" }, "BT1-012", "BT1-013"],
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

    // Source-stack identity: Angewomon is the sole digivolution card beneath UlforceVeedramon.
    expect(s.perm("angewomon").topCard?.instanceId).toBe(s.inst("ulforce").instanceId);
    expect(s.perm("angewomon").stack.map((card) => card.cardId)).toEqual(["BT23-031"]);
    // Cost 3 off a gauge of 5, plus the bonus draw.
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolutionDraw").instanceId);
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

      // Both routes cost 3 here: the printed Blue Lv.5 EvoCost and the [CS] alternate agree.
      expect(s.state.memory).toBe(2);
      expect(s.perm("aero").stack.map((card) => card.cardId)).toEqual(["EX13-022"]);
      assertNoLoudGap(s);
    }
  });

  it("discriminates the route three ways: Lv.5 [CS] passes, Lv.5 without [CS] and Lv.4 [CS] are refused", async () => {
    // The trait negative: EX3-033 matches BT23-031 on color (yellow) and level (5), so the only
    // difference is the missing [CS] trait. "w/[CS] trait" is exact trait equality.
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

    // The level negative: EX13-019 carries [CS] but is level 4, which neither route accepts.
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

  // ---------------------------------------------------------------------------
  // [Assembly -5] Lv.5 × Lv.4 × Lv.3, all w/[Veemon]/[Veedramon] in name
  // ---------------------------------------------------------------------------

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
          materialInstanceIds: [s.inst("lv5").instanceId, s.inst("lv4").instanceId, s.inst("lv3").instanceId],
        },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === cardId));

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === cardId)!;
    // All three materials left the trash and now sit beneath the played card (§7-3-2-6 puts the
    // leftmost listed material, the Lv.5, on top of the stack — so it is last in `stack`).
    expect(played.stack.map((card) => card.cardId)).toEqual(["BT2-021", "ST8-05", "EX13-022"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    // Printed play cost 12 reduced by the flat Assembly -5: 8 memory - 7 = 1.
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("rejects an Assembly whose levels do not match the printed Lv.5 × Lv.4 × Lv.3 recipe", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "ulforce" }],
          // Two Lv.4 Veedramon and one Lv.3: the Lv.5 slot has nothing to fill it.
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
          materialInstanceIds: [s.inst("lv4a").instanceId, s.inst("lv4b").instanceId, s.inst("lv3").instanceId],
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
          // Right levels, but Monodramon's name contains neither printed token.
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
          materialInstanceIds: [s.inst("lv5").instanceId, s.inst("lv4").instanceId, s.inst("wrongName").instanceId],
        },
      } as never).ok,
    ).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.state.memory).toBe(8);
  });

  // ---------------------------------------------------------------------------
  // [On Play] [When Digivolving] [When Attacking] [Once Per Turn]
  // 1 of your Digimon may change orientation.
  // ---------------------------------------------------------------------------

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

    // The only own Digimon is unsuspended, so the unsuspend bullet is unavailable and the modal
    // resolves the suspend direction without a prompt.
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
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("ally").permanentId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("ulforce"));

    // Both own Digimon are suspended, so only the unsuspend bullet is available; the chosen ally
    // flips and the host stays suspended.
    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.perm("ulforce").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("offers both directions when the board holds a suspended and an unsuspended Digimon", async () => {
    // preferOptionIndex 1 takes the unsuspend bullet; the suspend bullet is index 0.
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

    await advance(unsuspendRun.engine).fire(EffectTiming.OnPlay, unsuspendRun.perm("ulforce"));
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

    await advance(suspendRun.engine).fire(EffectTiming.OnPlay, suspendRun.perm("ulforce"));
    // The suspend bullet's pool is the unsuspended Digimon alone, which is the host.
    expect(suspendRun.perm("ulforce").isSuspended).toBe(true);
    expect(suspendRun.perm("ally").isSuspended).toBe(true);
  });

  it("never reaches the opponent's Digimon", async () => {
    // Fired from the attack window, which carries no return clause, so the opponent's board is
    // untouched by anything else on the card.
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "ulforce" }], hand: [{ card: "BT1-010", as: "spare" }] },
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

    // Only the host could be chosen, so it suspended itself; the opponent's suspended Digimon is
    // not a candidate for the unsuspend bullet.
    expect(s.perm("theirs").isSuspended).toBe(true);
    expect(s.perm("ulforce").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("leaves the board alone when the printed 'may' is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "ulforce" }], hand: [{ card: "BT1-010", as: "spare" }] },
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
        1: { hand: [{ card: "BT1-011", as: "spareOpponent" }], security: SECURITY, deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("ulforce"));
    expect(s.perm("ulforce").isSuspended).toBe(true);

    // Same per-turn use: the attack and digivolve windows refuse, so the host stays suspended
    // even though the unsuspend bullet would now be the available direction.
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("ulforce"));
    expect(s.perm("ulforce").isSuspended).toBe(true);
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("ulforce"));
    expect(s.perm("ulforce").isSuspended).toBe(true);

    // Through the real turn loop: the opponent's turn clears the use.
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 3;
    s.perm("ulforce").isSuspended = true;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("ulforce"));
    expect(s.perm("ulforce").isSuspended).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // [On Play] [When Digivolving] You may return all of your opponent's Digimon with the fewest
  // digivolution cards to the bottom of the deck.
  // ---------------------------------------------------------------------------

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

    // Both stackless Digimon tie at zero digivolution cards, so "all ... with the fewest" takes
    // both; the two-card stack survives.
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-014"]);
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

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId).slice(-1)).toEqual([returnedId]);
    // The returned Digimon's own digivolution card goes to the trash with the ordinary leave
    // handling, not to the deck.
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-011"]);
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
        1: { battleArea: [{ card: "BT1-009", as: "bare" }], security: SECURITY, deck: DECK },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("ulforce"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-009"]);
  });

  it("fires the return clause from the digivolve window too, and only from those two timings", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "ulforce" }],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: DECK,
        },
        1: { battleArea: [{ card: "BT1-009", as: "bare" }], security: SECURITY, deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    // [When Attacking] carries the orientation clause only, so the opponent's Digimon stays.
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("ulforce"));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("ulforce"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    assertNoLoudGap(s);
  });

  // ---------------------------------------------------------------------------
  // [All Turns] Your opponent's effects can't reduce this unsuspended Digimon's DP, return its
  // stacked cards to the hand or deck, or trash them.
  // ---------------------------------------------------------------------------

  it("refuses the opponent's DP reduction while unsuspended and accepts it once suspended", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "ulforce" }], hand: [{ card: "BT1-010", as: "spare" }] },
        1: { security: SECURITY, deck: DECK },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).isRestricted(s.perm("ulforce"), "dpImmune")).toBe(true);
    advance(s.engine).verb.enterEffectResolution(1);
    await advance(s.engine).verb.modifyDP(s.perm("ulforce").permanentId, -3000, EffectDuration.UntilEachTurnEnd);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("ulforce").currentDP).toBe(12_000);

    // "this UNSUSPENDED Digimon": suspending it lifts the protection on the next continuous pass.
    await advance(s.engine).verb.suspend([s.perm("ulforce").permanentId], 0);
    expect(observe(s.engine).isRestricted(s.perm("ulforce"), "dpImmune")).toBe(false);
    advance(s.engine).verb.enterEffectResolution(1);
    await advance(s.engine).verb.modifyDP(s.perm("ulforce").permanentId, -3000, EffectDuration.UntilEachTurnEnd);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("ulforce").currentDP).toBe(9000);

    // Unsuspending restores it.
    await advance(s.engine).verb.unsuspend([s.perm("ulforce").permanentId]);
    expect(observe(s.engine).isRestricted(s.perm("ulforce"), "dpImmune")).toBe(true);
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

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("reducer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-028"));

    expect(s.perm("ulforce").currentDP).toBe(12_000);
    expect(observe(s.engine).isRestricted(s.perm("ulforce"), "dpImmune")).toBe(true);
    assertNoLoudGap(s);
  });

  it("refuses the opponent's stacked-card trash and return while unsuspended, but never its own controller's", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "ulforce", under: [{ card: "EX13-022", as: "beneath" }] }],
          hand: [{ card: "BT1-010", as: "spare" }],
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("ulforce").permanentId;
    const beneathId = s.inst("beneath").instanceId;

    expect(observe(s.engine).isRestricted(s.perm("ulforce"), "beReturned")).toBe(true);

    // The opponent's effect cannot trash the stacked card.
    await advance(s.engine).verb.trashDigivolutionCards(hostId, [beneathId], 1);
    expect(s.perm("ulforce").stack.map((card) => card.instanceId)).toEqual([beneathId]);

    // Nor return the permanent (the wording's "return its stacked cards to the hand or deck"
    // half, recorded as `beReturned` + byOpponentEffectsOnly — BT26-029's shape).
    advance(s.engine).verb.enterEffectResolution(1);
    await advance(s.engine).verb.returnToHand([s.perm("ulforce").topCard!.instanceId]);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(hostId);

    // The controller's OWN effect is untouched by the clause.
    await advance(s.engine).verb.trashDigivolutionCards(hostId, [beneathId], 0);
    expect(s.perm("ulforce").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX13-022"]);
  });

  it("lifts the stacked-card trash lock once the Digimon suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "ulforce", suspended: true, under: [{ card: "EX13-022", as: "beneath" }] }],
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
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX13-022"]);
  });

  // ---------------------------------------------------------------------------
  // ＜Blocker＞ and ＜Evade＞
  // ---------------------------------------------------------------------------

  it("opens a real block window and intercepts an attack with ＜Blocker＞", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      1: { battleArea: [{ card: cardId, as: "ulforce" }], security: ["BT1-011"] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("ulforce"), "Blocker")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.events.find((event) => event.kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [s.perm("ulforce").permanentId],
    });

    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("ulforce").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));

    // The 2000 DP attacker loses to 12000 DP and the security stack is untouched.
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([cardId]);
  });

  it.each([true, false])("survives a public opponent deletion with ＜Evade＞ when accept=%s", async (accept) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "ulforce" }], security: SECURITY, deck: DECK },
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
    expect(observe(s.engine).hasKeyword(s.perm("ulforce"), "Evade")).toBe(true);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondEvade", permanentId, accept })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "cardsMoved" && event.instanceIds.includes(optionId)));

    // Accepting ＜Evade＞ keeps the Digimon in play, suspended; declining trashes it.
    const remaining = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === permanentId);
    expect(remaining !== undefined).toBe(accept);
    expect(remaining?.isSuspended ?? false).toBe(accept);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).includes(cardId)).toBe(!accept);
  });
});
