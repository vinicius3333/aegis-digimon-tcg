import {
  type CardDefinition,
  CardColor,
  CardKind,
  type DecisionResponse,
  EffectTiming,
  getCardDefinition,
} from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, settleAcrossTimers, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-027.js";

/** A level 3 base whose name only CONTAINS the bracketed route name, and which has no [CS] trait. */
function nearName(nameEn: string): CardDefinition {
  return {
    cardId: `TEST-${nameEn}`,
    set: "TEST",
    nameEn,
    kinds: [CardKind.Digimon],
    colors: [CardColor.Yellow, CardColor.Black, CardColor.Blue],
    level: 3,
    playCost: 3,
    dp: 3000,
    evoCosts: [],
    forms: ["Rookie"],
    attributes: ["Free"],
    types: ["Mammal"],
    maxCountInDeck: 4,
  };
}

describe("BT23-027 Angemon", () => {
  it("draws first, then DNA evolves itself and another Digimon into an unsuspended Shakkoumon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-027", as: "angemon" },
            { card: "BT23-050", as: "other", suspended: true },
          ],
          hand: [{ card: "BT23-032", as: "shakkoumon" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const drawnId = s.inst("drawn").instanceId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("angemon"));

    const result = s.state.players[0]!.battleArea.find((card) => card.topCard?.cardId === "BT23-032");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawnId)).toBe(true);
    expect(result).toBeDefined();
    expect(result?.isSuspended).toBe(false);
    expect(result?.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT23-027", "BT23-050"]));
  });

  it("does not DNA digivolve an Angemon played under a digivolution restriction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-018", as: "host", under: ["BT23-017"] }],
          hand: [
            { card: "BT23-027", as: "angemon" },
            { card: "BT23-032", as: "shakkoumon" },
          ],
          deck: ["BT1-009"],
        },
      },
      // Betamon's inherited attack play offers an optional prompt, a card selection AND a
      // `chooseOption` branch. All three must be answered for Angemon to reach the field; the
      // previous all-automation-off fixture simply hung on them and never reached its endpoint.
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 4;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle();
    const angemon = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === s.inst("angemon").instanceId,
    );
    expect(angemon).toBeDefined();
    expect(observe(s.engine).isRestricted(angemon!, "digivolve")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("shakkoumon").instanceId);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("shakkoumon").instanceId,
      ),
    ).toBe(false);
  });

  it("publicly follows Betamon's inherited attack play and refuses DNA while restricted (Q5256)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-018", as: "host", under: ["BT23-017"] }],
          hand: [
            { card: "BT23-027", as: "angemon" },
            { card: "BT23-032", as: "shakkoumon" },
          ],
          deck: [{ card: "BT1-009", as: "effectDraw" }, { card: "BT1-010", as: "nextDeck" }, "BT1-011"],
        },
        1: { security: ["BT1-009"], deck: Array(8).fill("BT1-010") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    // The first player skips the initial Draw phase; only Angemon will draw here.
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("angemon").instanceId),
    );
    await settle(() => !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    const played = s.perm("angemon");
    expect(played.topCard.instanceId).toBe(s.inst("angemon").instanceId);
    expect(observe(s.engine).isRestricted(played, "digivolve")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("shakkoumon").instanceId, s.inst("effectDraw").instanceId]),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("shakkoumon").instanceId)).toBe(
      false,
    );
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("nextDeck").instanceId);
    expect(s.perm("host").topCard.cardId).toBe("BT23-018");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT23-017"]);
    // `setupEngine` lays a board without starting a turn loop, so seat 1's Main phase can
    // never open here. Assert instead that the attack's whole window closed cleanly on the
    // attacking seat, which is the property the old turn-handoff wait was reaching for.
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.turnSeat).toBe(0);
  });

  it.each([
    ["one own material", [], [], [], [], true],
    ["enemy-only second material", [], [{ card: "BT23-050", as: "enemyMaterial" }], [], [], true],
    [
      "Shakkoumon in trash",
      [{ card: "BT23-050", as: "material" }],
      [],
      [],
      [{ card: "BT23-032", as: "shakkoumon" }],
      false,
    ],
    [
      "Shakkoumon in opponent hand",
      [{ card: "BT23-050", as: "material" }],
      [],
      [{ card: "BT23-032", as: "shakkoumon" }],
      [],
      false,
    ],
    ["invalid level-3 Tentomon second material", [{ card: "BT23-037", as: "invalid" }], [], [], [], true],
  ])(
    "public On Play draws but refuses DNA with %s",
    async (_label, ownBattle, enemyBattle, enemyHand, ownTrash, resultInOwnHand) => {
      const s = setupEngine(
        {
          0: {
            battleArea: ownBattle,
            hand: [
              { card: "BT23-027", as: "angemon" },
              ...(resultInOwnHand ? [{ card: "BT23-032", as: "shakkoumon" }] : []),
            ],
            trash: ownTrash,
            deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010"],
          },
          1: { battleArea: enemyBattle, hand: enemyHand, deck: ["BT1-011", "BT1-012"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      const angemonId = s.inst("angemon").instanceId;
      const materialIds = ownBattle.map((entry) => s.inst(entry.as).instanceId);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: angemonId })).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
      expect(s.state.memory).toBe(5);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === angemonId)).toBe(true);
      for (const materialId of materialIds) {
        expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === materialId)).toBe(true);
      }
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
        ownTrash.map((entry) => s.inst(entry.as).instanceId),
      );
      expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual(
        enemyHand.map((entry) => s.inst(entry.as).instanceId),
      );
      expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard.instanceId)).toEqual(
        enemyBattle.map((entry) => s.inst(entry.as).instanceId),
      );
      expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT23-032")).toBe(resultInOwnHand);
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-032")).toBe(false);
      expect(observe(s.engine).isAttacking()).toBe(false);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("refuses the DNA option when the only Shakkoumon is in the deck", async () => {
    // The printed result zone is the HAND. A copy in the deck must not qualify, which is
    // what `into.zone: "hand"` pins (the module previously carried an ignored top-level
    // `from: ["hand"]` that the DnaDigivolve action type does not define).
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-050", as: "material" }],
          hand: [{ card: "BT23-027", as: "angemon" }],
          deck: [{ card: "BT1-009", as: "drawn" }, { card: "BT23-032", as: "shakkoumon" }, "BT1-010"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const angemonId = s.inst("angemon").instanceId;
    const materialId = s.inst("material").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: angemonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    await settle();
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === angemonId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === materialId)).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("shakkoumon").instanceId);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-032")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("publicly declines an otherwise legal DNA option without moving either material", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-050", as: "first" },
            { card: "BT23-050", as: "second" },
          ],
          hand: [
            { card: "BT23-027", as: "angemon" },
            { card: "BT23-032", as: "shakkoumon" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010"],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 10;
    const angemonId = s.inst("angemon").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: angemonId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.state.pendingDecision).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === angemonId)).toBe(true);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT23-050")).toHaveLength(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("shakkoumon").instanceId);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("reproduces Q5257 through two public Alliance triggers and derived DNA evolution", async () => {
    // Q5257 end to end: Hudiemon with Erika Mishima underneath carries TWO ＜Alliance＞
    // instances, which trigger simultaneously with its [When Attacking] effect. Order:
    // 1st Alliance suspends Ankylomon, [When Attacking] replays Hudiemon's [On Play] to
    // play this Angemon for free, Angemon's derived [On Play] draws and DNA digivolves
    // Angemon + the suspended Ankylomon into Shakkoumon, and the 2nd Alliance can then
    // suspend that Shakkoumon because it arrives unsuspended. The DP from the 1st
    // Alliance stays on Hudiemon even though its ally became a digivolution card.
    let attackerDpDuringBattle = 0;
    let attackerPermanentId = "";
    const prefer: string[] = [];
    const s: ReturnType<typeof setupEngine> = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-101", as: "hudiemon", under: ["BT23-084"] },
            { card: "BT23-050", as: "ally" },
            { card: "BT23-082", as: "tamer" },
          ],
          hand: [
            { card: "BT23-027", as: "angemon" },
            { card: "BT23-032", as: "shakkoumon" },
          ],
          security: ["BT1-009", "BT1-010"],
          deck: [{ card: "BT1-011", as: "playDraw" }, { card: "BT1-012", as: "dnaDraw" }, "BT1-013", "BT1-014"],
        },
        1: {
          security: [
            { card: "BT1-009", as: "sec0" },
            { card: "BT1-010", as: "sec1" },
            { card: "BT1-011", as: "sec2" },
            { card: "BT1-012", as: "sec3" },
            { card: "BT1-013", as: "sec4" },
          ],
          deck: Array(8).fill("BT1-011"),
        },
      },
      {
        autoOrderTriggers: false,
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: prefer,
        onEvent: () => {
          const attacker = s?.state.players[0]?.battleArea.find(
            ({ permanentId }) => permanentId === attackerPermanentId,
          );
          if (attacker !== undefined) attackerDpDuringBattle = Math.max(attackerDpDuringBattle, attacker.currentDP);
        },
      },
    );
    await s.ready();
    s.state.memory = 10;
    attackerPermanentId = s.perm("hudiemon").permanentId;
    const angemonId = s.inst("angemon").instanceId;
    const allyCardId = s.perm("ally").topCard.instanceId;
    const shakkoumonId = s.inst("shakkoumon").instanceId;
    // Hudiemon + Ankylomon is also a legal Shakkoumon recipe; bias the material pick to the
    // pair the ruling describes so the attacker itself is never consumed.
    prefer.push(angemonId, allyCardId);
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
    const takeTrigger = async (match: (key: string) => boolean): Promise<string[]> => {
      await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
      const decision = s.state.pendingDecision!;
      const keys = (JSON.parse(decision.payloadJson) as { triggerKeys: string[] }).triggerKeys;
      const chosen = keys.find(match);
      expect(chosen).toBeDefined();
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "orderTriggers", order: [chosen!] },
        }),
      ).toEqual({ ok: true });
      return keys;
    };
    const answerAlliance = async (allyPermanentId: string): Promise<void> => {
      await settle(() => combat.hasOpenAllianceDecision);
      expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId } as never)).toEqual({ ok: true });
    };
    const shakkoumonPermanent = () =>
      s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.instanceId === shakkoumonId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    // Both ＜Alliance＞ instances and the [When Attacking] effect are offered in one window.
    const keys = await takeTrigger((key) => key.includes("/alliance/"));
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.filter((key) => key.includes("/alliance/"))).toHaveLength(2);
    expect(keys.filter((key) => !key.includes("/alliance/"))).toHaveLength(1);

    // 1st ＜Alliance＞: suspend Ankylomon for +5000 DP and an extra security check.
    await answerAlliance(s.perm("ally").permanentId);
    await settle(() => s.perm("ally").isSuspended);
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.perm("hudiemon").currentDP).toBe(12000);

    // [When Attacking]: return the CS Tamer, replay [On Play], play Angemon for free.
    // Angemon's own [On Play] then draws and DNA digivolves before the 2nd ＜Alliance＞.
    await takeTrigger((key) => !key.includes("/alliance/"));
    await settle(() => shakkoumonPermanent() !== undefined);
    const merged = shakkoumonPermanent();
    expect(merged).toBeDefined();
    expect(merged!.stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining([angemonId, allyCardId]));
    // The ruling's core claim: the DNA result arrives UNSUSPENDED, so it is still a legal
    // ally for the remaining ＜Alliance＞ instance.
    expect(merged!.isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("playDraw").instanceId, s.inst("dnaDraw").instanceId, s.inst("tamer").instanceId]),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("tamer").instanceId)).toBe(
      false,
    );
    // The 1st Alliance's DP survives its ally becoming a digivolution card.
    expect(s.perm("hudiemon").currentDP).toBe(12000);

    // 2nd ＜Alliance＞ suspends the new Shakkoumon for a further +8000 DP.
    await answerAlliance(merged!.permanentId);
    await settle(() => shakkoumonPermanent()?.isSuspended === true);
    expect(shakkoumonPermanent()!.isSuspended).toBe(true);

    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    // 7000 printed + 5000 (Ankylomon) + 8000 (Shakkoumon) from the two Alliance bonuses.
    expect(attackerDpDuringBattle).toBe(20000);
    // One base security check plus one per Alliance instance: 5 - 3 = 2.
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("sec3").instanceId,
      s.inst("sec4").instanceId,
    ]);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // Q6250 (was the `barrier-then-source-play` seam, now fixed — see
  // docs/audits/BT23-reaudit/BARRIER-SOURCE-PLAY-MECHANISM.md). With Angemon among
  // Shakkoumon's digivolution cards, the controller may activate ＜Barrier＞ to prevent the
  // battle deletion FIRST and still use Shakkoumon's [All Turns] effect to play a Digimon —
  // including that Angemon — from its digivolution cards. `consultLeavePrevention` now runs
  // the sibling "instead" replacement for exactly the permanents Barrier saved.
  it("publicly accepts Barrier before playing the Angemon source from Shakkoumon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-032", as: "host", under: ["BT23-027"], suspended: true }],
          security: ["BT1-009"],
          deck: Array(6).fill("BT1-010"),
        },
        1: { battleArea: [{ card: "BT23-025", as: "attacker" }], deck: Array(6).fill("BT1-011") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const sourceId = s.perm("host").stack[0]!.instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(s.events.some((event) => event.kind === "barrierPrompt")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: hostId, accept: true })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === sourceId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declares Barrier", () => {
    expect(getCardDefinition("BT23-027")).toMatchObject({
      cardId: "BT23-027",
      nameEn: "Angemon",
      colors: ["Yellow", "Blue"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [
        { color: "Yellow", level: 3, memoryCost: 3 },
        { color: "Black", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Angel", "Hudie", "CS"],
    });
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static")!;
    expect(staticEffect.keywords).toEqual([{ keyword: "Barrier", raw: "＜Barrier＞" }]);
  });

  it("draws one, then may DNA digivolve two of your Digimon into Shakkoumon on your turn", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects.find((entry) => entry.trigger === trigger)!.actions;
      expect(actions[0]).toEqual({ kind: "Draw", controller: "mine", amount: 1 });
      expect(actions[1]).toMatchObject({
        kind: "DnaDigivolve",
        materials: { filter: { controller: "mine", kind: ["Digimon"] }, count: 2 },
        into: {
          controllerDefault: "mine",
          zone: "hand",
          nameOrTrait: [{ tokens: ["Shakkoumon"], match: "nameExact" }],
        },
        payCost: true,
        condition: { kind: "isYourTurn" },
        optional: true,
      });
    }
  });

  it("publicly plays Angemon, draws, and DNA digivolves with a legal second material", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-050", as: "material", suspended: true }],
          hand: [
            { card: "BT23-027", as: "angemon" },
            { card: "BT23-032", as: "shakkoumon" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }, { card: "BT1-010", as: "dnaDraw" }, "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const angemonId = s.inst("angemon").instanceId;
    const materialId = s.inst("material").instanceId;
    const drawnId = s.inst("drawn").instanceId;
    const dnaDrawId = s.inst("dnaDraw").instanceId;
    const shakkoumonId = s.inst("shakkoumon").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: angemonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === shakkoumonId));
    const result = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === shakkoumonId);
    expect(result?.topCard?.instanceId).toBe(shakkoumonId);
    expect(result?.stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining([angemonId, materialId]));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawnId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(dnaDrawId);
    expect(s.state.memory).toBe(5);
  });

  it.each([
    ["Patamon", "BT1-048", 0],
    ["level-3 CS", "BT23-037", 1],
  ])("publicly evolves from the %s alternate source for 2", async (_label, sourceCard, requirementIndex) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: sourceCard, as: "source" }],
        hand: [{ card: "BT23-027", as: "angemon" }],
        deck: [
          { card: "BT1-009", as: "drawn" },
          { card: "BT1-010", as: "effectDraw" },
        ],
      },
    });
    s.state.memory = 2;
    const sourceId = s.inst("source").instanceId;
    const angemonId = s.inst("angemon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: angemonId,
        useAlternateCost: true,
        alternateRequirementIndex: requirementIndex,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.instanceId === angemonId);
    expect(s.perm("source").topCard.instanceId).toBe(angemonId);
    expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("drawn").instanceId,
      s.inst("effectDraw").instanceId,
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.gameOver).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it.each([
    ["yellow", "BT1-048"],
    ["black", "BT10-058"],
  ])(
    "publicly normal-evolves from a level-3 %s source for 3 and draws its bonus and effect cards",
    async (_label, sourceCard) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: sourceCard, as: "source" }],
            hand: [{ card: "BT23-027", as: "evolved" }],
            deck: [
              { card: "BT1-009", as: "playDraw" },
              { card: "BT1-010", as: "evoDraw" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 3;
      const sourceId = s.inst("source").instanceId;
      const evolvedId = s.inst("evolved").instanceId;
      const playDrawId = s.inst("playDraw").instanceId;
      const evoDrawId = s.inst("evoDraw").instanceId;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("source").permanentId,
          instanceId: evolvedId,
        }),
      ).toEqual({
        ok: true,
      });
      await settle(() => s.perm("source").topCard.instanceId === evolvedId);
      expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([sourceId]);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
        expect.arrayContaining([playDrawId, evoDrawId]),
      );
      expect(s.state.players[0]!.hand).toHaveLength(2);
      expect(s.state.players[0]!.deck).toHaveLength(0);
      expect(s.state.memory).toBe(0);
      expect(s.state.gameOver).toBe(false);
    },
  );

  it.each([
    ["non-CS yellow", "BT1-045"],
    ["wrong-color red", "BT1-009"],
    ["wrong-level", "BT23-050"],
  ])("rejects the CS alternate source when it is %s", async (_label, sourceCard) => {
    const s = setupEngine({
      0: { battleArea: [{ card: sourceCard, as: "source" }], hand: [{ card: "BT23-027", as: "angemon" }] },
    });
    s.state.memory = 2;
    const sourceId = s.inst("source").instanceId;
    const angemonId = s.inst("angemon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: angemonId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("source").topCard.instanceId).toBe(sourceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(angemonId);
    expect(s.state.memory).toBe(2);
  });

  it.each([
    ["a level-3 yellow non-Patamon", "BT1-045"],
    ["a level-3 CS card that is not named Patamon", "BT23-037"],
  ])("rejects the cost-2 [Patamon] route from %s", async (_label, sourceCard) => {
    const s = setupEngine({
      0: { battleArea: [{ card: sourceCard, as: "source" }], hand: [{ card: "BT23-027", as: "angemon" }] },
    });
    s.state.memory = 2;
    const sourceId = s.inst("source").instanceId;
    const angemonId = s.inst("angemon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: angemonId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("source").topCard.instanceId).toBe(sourceId);
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([angemonId]);
    expect(s.state.memory).toBe(2);
  });

  it("declares inherited Barrier", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Barrier" }],
    });
  });

  it("exposes Barrier both directly and from a realistic evolution stack", async () => {
    const direct = setupEngine({ 0: { battleArea: [{ card: "BT23-027", as: "angemon" }] } });
    await direct.ready();
    expect(observe(direct.engine).hasKeyword(direct.perm("angemon"), "Barrier")).toBe(true);

    const inherited = setupEngine({ 0: { battleArea: [{ card: "BT23-032", as: "host", under: ["BT23-027"] }] } });
    await inherited.ready();
    expect(observe(inherited.engine).hasKeyword(inherited.perm("host"), "Barrier")).toBe(true);
  });

  it("draws but does not offer DNA digivolution on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-027", as: "angemon" },
            { card: "BT23-050", as: "other" },
          ],
          hand: [{ card: "BT23-032", as: "shakkoumon" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("angemon"));
    await settle();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("shakkoumon").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("publicly enters play on the opponent's turn, draws, and never offers the DNA option", async () => {
    // The only public way onto the board during the opponent's turn is a [Counter]:
    // ＜Blast Digivolve＞ Cherubimon over Antylamon while the opponent attacks, whose
    // [When Digivolving] plays this level-4 yellow Angemon for free. Angemon and the
    // waiting Ankylomon are a legal Shakkoumon recipe (yellow Lv.4 + black Lv.4) and the
    // [Shakkoumon] card is in hand, so "it's your turn" is the only failing condition.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-029", as: "base" },
            { card: "BT23-050", as: "ally" },
          ],
          hand: [
            { card: "EX6-035", as: "counter" },
            { card: "BT23-027", as: "angemon" },
            { card: "BT23-032", as: "shakkoumon" },
          ],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: [{ card: "BT1-012", as: "evoDraw" }, { card: "BT1-013", as: "playDraw" }, "BT1-014", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT23-025", as: "attacker" }],
          hand: ["BT1-009"],
          security: ["BT1-010", "BT1-011"],
          deck: Array(8).fill("BT1-012"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 5;
    const angemonId = s.inst("angemon").instanceId;
    const allyCardId = s.perm("ally").topCard.instanceId;
    const shakkoumonId = s.inst("shakkoumon").instanceId;
    const deckBefore = s.state.players[0]!.deck.length;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isAttacking());
    // ＜Blast Digivolve＞ is answered through the open [Counter] window, not as a bare
    // `digivolve` intent: only `respondCounter` closes the window and lets the attack finish.
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: s.inst("counter").instanceId,
        effectKey: `blast-digivolve:${s.perm("base").permanentId}`,
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === angemonId));
    // The new arrivals make a block window open; decline it so the attack resolves normally.
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.turnSeat).toBe(1);
    expect(observe(s.engine).isAttacking()).toBe(false);
    // The unblocked attack still checked one security card.
    expect(s.state.players[0]!.security).toHaveLength(2);
    // Angemon is on the board and drew, so its [On Play] resolved on the opponent's turn.
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === angemonId)).toBe(true);
    // Two draws: the ＜Blast Digivolve＞ evolution bonus, then Angemon's own [On Play].
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("evoDraw").instanceId, s.inst("playDraw").instanceId]),
    );
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 2);
    // The DNA half was skipped: both materials are untouched and Shakkoumon stays in hand.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(shakkoumonId);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === allyCardId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-032")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each([
    ["direct", false],
    ["inherited", true],
  ])("public Barrier combat can be accepted or refused (%s)", async (_label, inherited) => {
    for (const accept of [true, false]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              inherited
                ? { card: "BT23-032", as: "target", under: ["BT23-027"], suspended: true }
                : { card: "BT23-027", as: "target", suspended: true },
            ],
            security: [{ card: "BT1-009", as: "payment" }],
            deck: Array(8).fill("BT1-010"),
          },
          1: { battleArea: [{ card: "BT23-025", as: "attacker" }], deck: Array(8).fill("BT1-009") },
        },
        { autoAcceptOptional: false, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      const targetId = s.perm("target").permanentId;
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: targetId },
        }),
      ).toEqual({ ok: true });
      const combat = (s.engine as unknown as { combat: { hasOpenBarrierDecision: boolean } }).combat;
      await settle(() => combat.hasOpenBarrierDecision);
      expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: targetId, accept })).toEqual({ ok: true });
      await settleAcrossTimers(() => !observe(s.engine).isAttacking());
      await settle();
      let replacementResponse = { ok: true };
      // Accepting ＜Barrier＞ prevents the deletion but does NOT cancel Shakkoumon's sibling
      // "play 1 Digimon from this Digimon's digivolution cards" replacement on the same event
      // (KB Q6250), so a decision is offered on BOTH branches here and both must decline it.
      while (s.state.pendingDecision) {
        const response: DecisionResponse =
          s.state.pendingDecision.kind === "selectCards"
            ? { kind: "selectCards", instanceIds: [] }
            : { kind: "optional", accept: false };
        replacementResponse = s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision.decisionId,
          response,
        });
        await settle(() => !observe(s.engine).isAttacking());
      }
      expect(replacementResponse).toMatchObject({ ok: true });
      expect(observe(s.engine).isAttacking()).toBe(false);
      expect(s.state.pendingDecision).toBeUndefined();
      const remains = s.state.players[0]!.battleArea.some((p) => p.permanentId === targetId);
      expect(remains).toBe(accept);
      expect(s.state.players[0]!.security).toHaveLength(accept ? 0 : 1);
    }
  });

  // Exact-name sweep (session 2). The printed route brackets the base name
  // ("[Patamon]/Lv.3 w/[CS] trait: Cost 2"), so it is an equality gate. `names` is a
  // SUBSTRING gate in engine/cards/cardData.ts matchGatedRequirement; no released card's name
  // merely contains "Patamon" today, so the negative uses a synthetic near-name base.
  it("gates the printed route on the exact base name, not a substring", () => {
    expect(matchingAlternateDigivolutionRequirement("BT23-027", "BT1-048")).toMatchObject({
      namesExact: ["Patamon"],
      cost: 2,
    });
    expect(matchingAlternateDigivolutionRequirement("BT23-027", nearName("BlackPatamon"))).toBeUndefined();
  });
});
