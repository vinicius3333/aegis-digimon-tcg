import { EffectDuration, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settleAcrossTimers, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-058.js";
import "../index.js";

const CARD_ID = "EX10-058";

it("rejects a third DigiXros material without spending memory or moving cards", async () => {
  const s = setupEngine({
    0: {
      hand: [
        { card: CARD_ID, as: "played" },
        { card: "EX10-026", as: "firstMaterial" },
        { card: "EX10-027", as: "secondMaterial" },
        { card: "EX10-045", as: "thirdMaterial" },
      ],
    },
  });
  s.state.memory = 9;
  await s.ready();
  const originalHand = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
  expect(
    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("played").instanceId,
      digiXros: {
        materialInstanceIds: ["firstMaterial", "secondMaterial", "thirdMaterial"].map(
          (alias) => s.inst(alias).instanceId,
        ),
      },
    }),
  ).toMatchObject({ ok: false, reason: "invalid-material" });
  expect(s.state.memory).toBe(9);
  expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(originalHand);
  expect(s.state.players[0]!.battleArea).toHaveLength(0);
});

describe("EX10-058 Lilithmon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Demon Lord", "Bagra Army"],
    });
  });

  it("proves the granted turn-end deletion, the shared once-per-turn watcher pair, and DigiXros", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    // The printed Purple/Lv.5/cost-3 EvoCost row is NOT restated here: every
    // `digivolutionRequirement` entry is read as an ALTERNATE route, and this card prints no
    // `[Digivolve]` header.
    expect(compiled.digivolutionRequirement).toBeUndefined();
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ traits: ["Bagra Army"] }], count: 2, costReduction: 2, maxMaterials: 2 },
    ]);

    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "GainTriggeredEffect",
            target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
            gainedTrigger: "EndOfYourTurn",
            gainedActions: [
              { kind: "Delete", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 } },
            ],
            duration: "untilOpponentTurnEnd",
          },
        ],
      });
    }

    const allTurns = compiled.effects?.find((effect) => effect.trigger === "AllTurns");
    expect(allTurns).toMatchObject({ frequency: "OncePerTurn" });
    expect(allTurns?.actions).toMatchObject([
      {
        kind: "SubTrigger",
        event: "whenPlayed",
        sourceFilter: { controller: "opponent", kind: ["Digimon"] },
        oncePerTurnKey: "EX10-058/all-turns",
      },
      {
        kind: "SubTrigger",
        event: "onDeletionOf",
        sourceFilter: { controller: "opponent", kind: ["Digimon"] },
        oncePerTurnKey: "EX10-058/all-turns",
      },
    ]);
  });

  it("Q5159 installs the granted turn-end deletion on an OPPOSING permanent, not on its own side", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "lilithmon" },
            { card: "EX10-040", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "AD1-001", as: "recipient" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("lilithmon"));
    await settle(() => s.state.pendingDecision === null);

    const watchers = observe(s.engine);
    expect(watchers.subscriptions("endOfTurn", s.perm("recipient").permanentId)).toHaveLength(1);
    expect(watchers.subscriptions("endOfTurn", s.perm("ally").permanentId)).toHaveLength(0);
    expect(watchers.subscriptions("endOfTurn", s.perm("lilithmon").permanentId)).toHaveLength(0);
  });

  it("Q5157 trashes exactly 2 of its own sources and plays a purple level 4 or lower Digimon from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "lilithmon",
              under: [
                { card: "BT1-009", as: "first" },
                { card: "BT1-045", as: "second" },
              ],
            },
          ],
          trash: [{ card: "BT10-071", as: "payoff" }],
        },
        1: { battleArea: [{ card: "EX10-040", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("payoff").instanceId),
    );

    expect(s.perm("lilithmon").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId]),
    );
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
      s.inst("payoff").instanceId,
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("payoff").instanceId);
  });

  it("Q5157 cannot pay with only 1 digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "lilithmon", under: [{ card: "BT1-009", as: "only" }] }],
          trash: [{ card: "BT10-071", as: "payoff" }],
        },
        1: { battleArea: [{ card: "EX10-040", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision === null);

    expect(s.perm("lilithmon").stack).toHaveLength(1);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("payoff").instanceId);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).not.toContain(
      s.inst("payoff").instanceId,
    );
  });

  it("Q5160 does not pay its optional two-source cost when the controller declines", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "lilithmon",
              under: [
                { card: "BT1-009", as: "first" },
                { card: "BT1-045", as: "second" },
              ],
            },
          ],
          trash: [{ card: "BT10-071", as: "payoff" }],
        },
        1: { battleArea: [{ card: "EX10-040", as: "victim" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision === null);

    expect(s.perm("lilithmon").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("payoff").instanceId]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).not.toContain(
      s.inst("payoff").instanceId,
    );
  });

  it("Q5160 can play a source trashed as the activation cost, without firing its inherited watcher", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "lilithmon",
              under: [
                { card: "EX10-044", as: "damemon" },
                { card: "BT1-009", as: "otherSource" },
              ],
            },
          ],
          deck: [{ card: "BT1-010", as: "draw" }],
        },
        1: { hand: [{ card: "EX10-040", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("victim").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX10-044"));

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX10-044")).toBe(true);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("otherSource").instanceId);
    // EX10-044's inherited Draw 1 is checked at the discard window. Because the card has already
    // moved from trash onto the battle area as Lilithmon's same effect resolves, Q5160 says it
    // cannot activate; the deck card therefore remains in the deck.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("draw").instanceId);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("draw").instanceId);
  });

  it("Q5160 still fires the inherited watcher for another qualifying source left in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "lilithmon",
              under: [
                { card: "EX10-044", as: "playedDamemon" },
                { card: "EX10-044", as: "remainingDamemon" },
              ],
            },
          ],
          deck: [
            { card: "BT1-010", as: "firstDraw" },
            { card: "BT1-011", as: "secondDraw" },
          ],
        },
        1: { hand: [{ card: "EX10-040", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("victim").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX10-044"));

    expect(s.state.players[0]!.trash.filter(({ cardId }) => cardId === "EX10-044")).toHaveLength(1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("firstDraw").instanceId);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("secondDraw").instanceId);
  });

  it("plays neither a level 5 purple nor a level 4 non-purple Digimon from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "lilithmon", under: ["BT1-009", "BT1-045"] }],
          trash: [
            { card: "EX10-047", as: "tooHigh" },
            { card: "AD1-001", as: "wrongColor" },
          ],
        },
        1: { battleArea: [{ card: "EX10-040", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision === null);

    const played = s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId);
    expect(played).not.toContain(s.inst("tooHigh").instanceId);
    expect(played).not.toContain(s.inst("wrongColor").instanceId);
    expect(s.perm("lilithmon").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-045"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX10-047", "AD1-001"]);
  });

  it("Q5160 does not pay when effect-play prohibition makes the post-cost target unavailable", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "lilithmon",
              under: [
                { card: "BT1-009", as: "first" },
                { card: "BT1-045", as: "second" },
              ],
            },
          ],
          trash: [{ card: "BT10-071", as: "payoff" }],
        },
        1: { battleArea: [{ card: "EX10-040", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    advance(s.engine).ledgers.continuous.addPlayProhibition(
      0,
      1,
      { kinds: ["Digimon"] },
      "play",
      EffectDuration.Permanent,
      { byEffectOnly: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision === null);

    expect(s.perm("lilithmon").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("payoff").instanceId]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).not.toContain(
      s.inst("payoff").instanceId,
    );
  });

  it("spends one shared use for 'played or deleted' in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "lilithmon", under: ["BT1-009", "BT1-045", "BT1-009", "BT1-045"] }],
          trash: [
            { card: "BT10-071", as: "first" },
            { card: "BT10-071", as: "second" },
          ],
        },
        1: {
          battleArea: [
            { card: "EX10-040", as: "victim" },
            { card: "EX10-043", as: "entrant" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    await settle(() => s.perm("lilithmon").stack.length === 2);
    expect(s.perm("lilithmon").stack).toHaveLength(2);

    // The second event this turn is the OTHER printed form ("are played"). It shares the same
    // once-per-turn key, so it must not pay a second time.
    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("entrant").permanentId,
      entryCause: "play",
    });
    await settle(() => s.state.pendingDecision === null);
    expect(s.perm("lilithmon").stack).toHaveLength(2);
  });

  it("[Once Per Turn] pays once per turn across the real turn loop and resets on the opponent's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "lilithmon", under: ["BT1-009", "BT1-045", "BT1-009", "BT1-045"] }],
          trash: [
            { card: "BT10-071", as: "firstPayoff" },
            { card: "BT10-071", as: "secondPayoff" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010", "BT1-011"],
          hand: ["BT1-013"],
          security: ["BT1-009", "BT1-014"],
        },
        1: {
          hand: [
            { card: "BT1-009", as: "firstEntrant" },
            { card: "BT1-009", as: "secondEntrant" },
            { card: "BT1-009", as: "thirdEntrant" },
            "BT1-013",
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    // First opponent play this turn: the shared use is spent, 2 sources pay, 1 card returns.
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("firstEntrant").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("lilithmon").stack.length === 2);
    expect(s.perm("lilithmon").stack).toHaveLength(2);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);

    // Second opponent play in the SAME turn: the once-per-turn use is gone, nothing is paid.
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("secondEntrant").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    expect(s.perm("lilithmon").stack).toHaveLength(2);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);

    // Round-trip through the real turn loop: seat 0's turn, then seat 1's next turn.
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("thirdEntrant").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("lilithmon").stack.length === 0);
    expect(s.perm("lilithmon").stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual(
      expect.arrayContaining([s.inst("firstPayoff").instanceId, s.inst("secondPayoff").instanceId]),
    );

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("DigiXroses with 2 Bagra Army Digimon for 4 less and rejects a non-Bagra-Army material", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "lilithmon" },
            { card: "EX10-026", as: "bagraFirst" },
            { card: "EX10-027", as: "bagraSecond" },
            { card: "EX10-040", as: "outsider" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 11;
    await s.ready();

    // EX10-040 DemiDevimon is purple but carries the [Evil] trait, not [Bagra Army].
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("lilithmon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("bagraFirst").instanceId, s.inst("outsider").instanceId] },
      }),
    ).toMatchObject({ ok: false, reason: "invalid-material" });
    // The refused declaration is inert: no memory spent, nothing left hand.
    expect(s.state.memory).toBe(11);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(4);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("lilithmon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("bagraFirst").instanceId, s.inst("bagraSecond").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));

    expect(s.state.memory).toBe(4);
    expect(s.perm("lilithmon").stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("bagraFirst").instanceId, s.inst("bagraSecond").instanceId]),
    );
  });

  it("Q5158 gives the turn-end deletion to a Digimon unaffected by effects, and it does not trigger", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "lilithmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "immune" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    // "Unaffected by your opponent's effects", arranged before the grant is given.
    await advance(s.engine).verb.restrict(s.perm("immune").permanentId, "beAffected", EffectDuration.Permanent);
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("lilithmon"));
    await settle(() => s.state.pendingDecision === null);

    // Q5158 first half: the grant CAN be given to such a Digimon.
    expect(observe(s.engine).subscriptions("endOfTurn", s.perm("immune").permanentId)).toHaveLength(1);

    // Q5158 second half: it is still unaffected at the trigger timing, so nothing is deleted.
    s.state.turnSeat = 1;
    await advance(s.engine).fireSubTrigger("endOfTurn");
    await settle(() => s.state.pendingDecision === null);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.trash).toHaveLength(0);

    // Control on the same driver: without the immunity the very same end-of-turn window
    // DOES delete, so the assertion above is about the immunity, not about a dead timing.
    const control = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "lilithmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "recipient" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await control.ready();
    await advance(control.engine).fireForPermanent(EffectTiming.OnPlay, control.perm("lilithmon"));
    await settle(() => control.state.pendingDecision === null);
    control.state.turnSeat = 1;
    await advance(control.engine).fireSubTrigger("endOfTurn");
    await settle(() => control.state.players[1]!.battleArea.length === 0);
    expect(control.state.players[1]!.battleArea).toHaveLength(0);
    expect(control.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
  });

  it("reduces the play cost by 2 PER material, so a single material pays 9 of the printed 11", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: CARD_ID, as: "lilithmon" }, { card: "EX10-026", as: "onlyMaterial" }, "BT1-013"] } },
      { autoSelectCards: true },
    );
    s.state.memory = 11;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("lilithmon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("onlyMaterial").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));

    // 11 printed - (1 material x 2) = 9. The two-material run above pays 7, so the discount
    // is per placed card (CR 7-2-2-1), not a flat reduction.
    expect(s.state.memory).toBe(2);
    expect(s.perm("lilithmon").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("onlyMaterial").instanceId]);
  });

  it("takes a DigiXros material from the battle area, shedding that permanent's own sources", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "lilithmon" }, "BT1-013"],
          battleArea: [{ card: "EX10-027", as: "fieldMaterial", under: [{ card: "BT1-009", as: "shed" }] }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 11;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("lilithmon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("fieldMaterial").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
    // CR 7-2-2-7: only the TOP card of the battle-area material is placed; its own
    // digivolution cards are trashed.
    expect(s.perm("lilithmon").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("fieldMaterial").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("shed").instanceId]);
  });

  it("refuses a trash material: this card unlocks no trash source and no expander Tamer is in play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "lilithmon" }, { card: "EX10-026", as: "bagraInHand" }, "BT1-013"],
          trash: [{ card: "EX10-027", as: "bagraInTrash" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 11;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("lilithmon").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("bagraInHand").instanceId, s.inst("bagraInTrash").instanceId],
        },
      }),
    ).toMatchObject({ ok: false, reason: "invalid-material" });
    expect(s.state.memory).toBe(11);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("bagraInTrash").instanceId]);
  });

  it("Q5158/Q5159 grants the turn-end deletion through a public DigiXros play and the opponent deletes at their own turn end", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "lilithmon" },
            { card: "EX10-026", as: "bagraFirst" },
            { card: "EX10-027", as: "bagraSecond" },
            "BT1-013",
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010"],
          security: ["BT1-009", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "recipient" },
            { card: "BT1-013", as: "bystander" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010"],
          hand: ["BT1-013"],
          security: ["BT1-009", "BT1-014"],
        },
      },
      // The granted deletion is mandatory; declining answers only the [All Turns] "you may
      // play" prompt, keeping this test on the [On Play] clause.
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    preferInstanceIds.push(s.perm("recipient").topCard.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("lilithmon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("bagraFirst").instanceId, s.inst("bagraSecond").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).subscriptions("endOfTurn", s.perm("recipient").permanentId).length === 1);

    // The grant lands on the OPPONENT's permanent, never on the caster's own board.
    expect(observe(s.engine).subscriptions("endOfTurn", s.perm("recipient").permanentId)).toHaveLength(1);
    expect(observe(s.engine).subscriptions("endOfTurn", s.perm("bystander").permanentId)).toHaveLength(0);

    // Paying 7 (11 - 2 x 2) from 3 memory drops the gauge below zero, so seat 0's turn ends
    // and seat 1's begins without any hand-laid turn state.
    await advance(s.engine).waitForMainPhase(1);
    const opponentBefore = s.state.players[1]!.battleArea.length;
    advance(s.engine).endMainPhaseIfOpen(1);
    await settleAcrossTimers(() => s.state.players[1]!.battleArea.length < opponentBefore);

    // Q5159: the granted effect resolves as the OPPONENT's own effect at the end of THEIR
    // turn, deleting one of their own Digimon.
    expect(s.state.players[1]!.battleArea).toHaveLength(opponentBefore - 1);
    expect(s.state.players[1]!.trash.filter(({ cardId }) => cardId === "BT1-009" || cardId === "BT1-013").length).toBe(
      1,
    );
    // The [All Turns] clause saw that deletion and offered its optional cost; declining leaves
    // both DigiXros materials under Lilithmon and nothing replayed from the trash.
    expect(s.perm("lilithmon").stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("bagraFirst").instanceId, s.inst("bagraSecond").instanceId]),
    );
    expect(s.perm("lilithmon").stack).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q5168 chains [All Turns] off a deletion its own [On Play] grant caused, replaying a material from the trash", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "lilithmon" },
            { card: "EX10-026", as: "bagraFirst" },
            { card: "EX10-027", as: "bagraSecond" },
            "BT1-013",
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010"],
          security: ["BT1-009", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "recipient" },
            { card: "BT1-013", as: "bystander" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010"],
          hand: ["BT1-013"],
          security: ["BT1-009", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    preferInstanceIds.push(s.perm("recipient").topCard.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("lilithmon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("bagraFirst").instanceId, s.inst("bagraSecond").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).subscriptions("endOfTurn", s.perm("recipient").permanentId).length === 1);

    // The grant lands on the OPPONENT's permanent, never on the caster's own board.
    expect(observe(s.engine).subscriptions("endOfTurn", s.perm("recipient").permanentId)).toHaveLength(1);
    expect(observe(s.engine).subscriptions("endOfTurn", s.perm("bystander").permanentId)).toHaveLength(0);

    // Paying 7 (11 - 2 x 2) from 3 memory drops the gauge below zero, so seat 0's turn ends
    // and seat 1's begins without any hand-laid turn state.
    await advance(s.engine).waitForMainPhase(1);
    const opponentBefore = s.state.players[1]!.battleArea.length;
    advance(s.engine).endMainPhaseIfOpen(1);
    await settleAcrossTimers(() => s.state.players[1]!.battleArea.length < opponentBefore);

    // Q5159: the granted effect resolves as the OPPONENT's own effect at the end of THEIR
    // turn, deleting one of their own Digimon.
    expect(s.state.players[1]!.battleArea).toHaveLength(opponentBefore - 1);
    expect(s.state.players[1]!.trash.filter(({ cardId }) => cardId === "BT1-009" || cardId === "BT1-013").length).toBe(
      1,
    );
    // Q5168: that deletion is itself "any of your opponent's Digimon are deleted", so the
    // [All Turns] clause triggers off the board change this card's own effect caused. It pays
    // by trashing BOTH DigiXros materials and replays one of them (EX10-027 DeadlyAxemon,
    // purple Lv.4) from the trash without paying its cost.
    expect(s.perm("lilithmon").stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual(["EX10-027", CARD_ID]);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
