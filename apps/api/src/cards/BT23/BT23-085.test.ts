import { EffectDuration, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-085.js";

// BT23-048 Gotsumon is a Lv.3 1000 DP [Hudie]/[CS] Digimon whose only clause is [On Play],
// so a seeded board copy stays inert and makes a clean grant/suspension subject.
const HUDIE = "BT23-048";
// BT23-006 Huckmon is a Lv.3 [CS] Digimon WITHOUT the [Hudie] trait ([On Play] only).
const CS_ONLY = "BT23-006";
// BT23-096 Comet Hammer: black, single-color, [CS] trait, play cost 5.
// [Main] ＜De-Digivolve 4＞ 1 of your opponent's Digimon. Then, place this card in the battle area.
const CS_OPTION = "BT23-096";
// BT2-103 Spiral Sword: black, single-color, play cost 1, NO [CS] trait — the eligibility negative.
const PLAIN_OPTION = "BT2-103";
// BT22-099 Kuremi Detective Agency: black AND yellow, [CS] trait — the single-color negative.
const DUAL_COLOR_CS_OPTION = "BT22-099";
// BT23-028 Coordemon: [On Play] 1 of your opponent's Digimon gets -3000 DP for the turn.
const DP_REDUCER = "BT23-028";
// A vanilla Lv.3 Digimon with no effects: neutral hand filler and legal security/deck bulk.
const NEUTRAL = "ST1-02";

const SECURITY = ["BT1-009", "BT1-010", "BT1-011"];
const DECK = ["BT1-012", "BT1-013", "BT1-014"];

describe("BT23-085 Ryuji Mishima", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-085")).toMatchObject({
      cardId: "BT23-085",
      nameEn: "Ryuji Mishima",
      colors: ["Black"],
      kinds: ["Tamer"],
      playCost: 4,
      dp: 0,
      types: ["Hudie", "CS"],
      rarity: "SR",
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    // The catalog text carries non-breaking spaces, so compare on normalized whitespace.
    expect(getCardDefinition("BT23-085")!.effectText!.replace(/\s+/g, " ").trim()).toBe(
      "[Start of Your Main Phase] If you have a [CS] trait Digimon, gain 1 memory. " +
        "[On Play] Until your opponent's turn ends, their effects can't reduce the DP of 1 of your [Hudie] trait " +
        "Digimon, and it gains ＜Reboot＞ and ＜Blocker＞ " +
        "[All Turns] When any of your [Hudie] trait Digimon suspend, by suspending this Tamer, you may use 1 " +
        "single-color [CS] trait Option card from your hand without paying the cost.",
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("carries the four printed clauses as IR", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "youHave",
            // `zone` is load-bearing: without it `countMatching` also scans the breeding area.
            filter: { controllerDefault: "mine", kind: ["Digimon"], zone: "battleArea" },
          },
        },
      ],
    });

    const onPlay = compiled.effects.find((entry) => entry.trigger === "OnPlay")!;
    expect(onPlay.actions[0]).toMatchObject({
      kind: "Restrict",
      restriction: "dpImmune",
      byOpponentEffectsOnly: true,
      duration: "untilOpponentTurnEnd",
      target: { count: 1, filter: { controller: "mine", kind: ["Digimon"], zone: "battleArea" } },
    });
    expect(onPlay.actions.slice(1)).toMatchObject([
      { kind: "GainKeyword", keyword: { keyword: "Reboot" }, duration: "untilOpponentTurnEnd" },
      { kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "untilOpponentTurnEnd" },
    ]);
    // "and IT gains": the two keyword grants reuse the Digimon the Restrict action chose.
    expect(
      onPlay.actions.slice(1).every((action) => (action as { target: { sameTarget?: boolean } }).target.sameTarget),
    ).toBe(true);

    const watcher = compiled.effects.find((entry) => entry.trigger === "AllTurns")!.actions[0] as never;
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { controller: "mine", kind: ["Digimon"], zone: "battleArea" },
      cost: { kind: "suspend", target: { isSelf: true, filter: { isSelfRef: true } } },
      actions: [
        {
          kind: "UseOptionWithoutCost",
          payCost: false,
          optional: true,
          from: ["hand"],
          filter: { controller: "mine", kind: ["Option"], singleColor: true },
        },
      ],
    });

    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    });
  });

  // --- Clause 1: [Start of Your Main Phase] -------------------------------------------

  it.each([
    ["a battle-area [CS] Digimon", CS_ONLY, 1],
    ["no [CS] Digimon at all", "BT1-009", 0],
  ])("gains start-of-main memory only with %s", async (_label, companion, expected) => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-085", as: "ryuji" },
          { card: companion, as: "companion" },
        ],
        hand: [{ card: NEUTRAL, as: "neutral" }],
        security: SECURITY,
        deck: DECK,
      },
      1: { hand: [NEUTRAL], security: SECURITY, deck: DECK },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(expected);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT23-085")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("ignores a [CS] Digimon that is only in the breeding area", async () => {
    // Comprehensive rules 3-4-5-8: information on breeding-area cards can't be referenced,
    // so a lone breeding [CS] Digimon does not satisfy "you have a [CS] trait Digimon".
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-085", as: "ryuji" }],
          breeding: { card: CS_ONLY, as: "breedingCs" },
          hand: [{ card: NEUTRAL, as: "neutral" }],
          security: SECURITY,
          deck: DECK,
        },
        1: { hand: [NEUTRAL], security: SECURITY, deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    // A seeded breeding permanent makes the Breeding phase interactive: it waits for the
    // turn player to hatch/move or pass before Main opens.
    await settle(() => s.state.phase === "Breeding");
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe(CS_ONLY);
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(["BT23-085"]);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("stays silent at the start of the opponent's main phase", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-085", as: "ryuji" },
          { card: CS_ONLY, as: "cs" },
        ],
        hand: [{ card: NEUTRAL, as: "neutral" }],
        security: SECURITY,
        deck: DECK,
      },
      1: { hand: [NEUTRAL], security: SECURITY, deck: DECK },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(1);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    // Seat 1 opened its main phase on the passed-turn memory only (seat 0's +1 handed over
    // as -1 from seat 1's view, plus the 3 turn-pass). Ryuji's clause is [Start of YOUR
    // Main Phase] and must not fire on the opponent's turn.
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // --- Clause 2: [On Play] -------------------------------------------------------------

  it("grants DP-reduction immunity, ＜Reboot＞ and ＜Blocker＞ to exactly one chosen [Hudie] Digimon", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: HUDIE, as: "chosen" },
            { card: HUDIE, as: "other" },
          ],
          hand: [
            { card: "BT23-085", as: "ryuji" },
            { card: NEUTRAL, as: "neutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: { hand: [NEUTRAL], security: SECURITY, deck: DECK },
      },
      { autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.perm("chosen").topCard!.instanceId);
    s.state.memory = 6;
    await s.ready();
    const ryujiId = s.inst("ryuji").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: ryujiId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("chosen"), "Blocker"));

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === ryujiId)).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("chosen"), "dpImmune")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("chosen"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("chosen"), "Blocker")).toBe(true);
    // "1 of your [Hudie] trait Digimon" — the second copy gains nothing.
    expect(observe(s.engine).isRestricted(s.perm("other"), "dpImmune")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Blocker")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("blocks the opponent's -3000 DP effect on the protected Digimon but not on its neighbour", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: HUDIE, as: "chosen", dp: 5000 },
            { card: HUDIE, as: "other", dp: 5000 },
          ],
          hand: [
            { card: "BT23-085", as: "ryuji" },
            { card: NEUTRAL, as: "neutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: {
          hand: [
            { card: DP_REDUCER, as: "reducer" },
            { card: NEUTRAL, as: "opponentNeutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.perm("chosen").topCard!.instanceId);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ryuji").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("chosen"), "dpImmune"));
    const protectedDp = s.perm("chosen").currentDP;
    const neighbourDp = s.perm("other").currentDP;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    // The opponent's -3000 DP effect resolves but cannot move the protected Digimon.
    prefer.length = 0;
    prefer.push(s.perm("chosen").topCard!.instanceId);
    // The shared gauge is relative to the turn player, so seat 1 needs a POSITIVE value.
    s.state.memory = 8;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("reducer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === DP_REDUCER));

    expect(s.perm("chosen").currentDP).toBe(protectedDp);
    expect(observe(s.engine).isRestricted(s.perm("chosen"), "dpImmune")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;

    // Control: the same effect aimed at an UNPROTECTED copy does reduce its DP, so the
    // assertion above proves the restriction, not an inert effect.
    const control = setupEngine(
      {
        0: { battleArea: [{ card: HUDIE, as: "other", dp: 5000 }], hand: [NEUTRAL], security: SECURITY, deck: DECK },
        1: { hand: [{ card: DP_REDUCER, as: "reducer" }, NEUTRAL], security: SECURITY, deck: DECK },
      },
      { autoSelectCards: true },
    );
    const controlLoop = control.engine.startTurnLoop();
    await advance(control.engine).waitForMainPhase(0);
    expect(control.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(control.engine).waitForMainPhase(1);
    control.state.memory = 8;
    expect(control.engine.applyIntent(1, { type: "playCard", instanceId: control.inst("reducer").instanceId })).toEqual(
      {
        ok: true,
      },
    );
    await settle(() => control.perm("other").currentDP < neighbourDp);

    expect(control.perm("other").currentDP).toBe(Math.max(0, neighbourDp - 3000));
    expect(control.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await controlLoop;
  });

  // The protection is scoped to "THEIR effects" (`byOpponentEffectsOnly: true`), so the
  // controller's own DP reduction still lands on the protected Digimon.
  it("does not stop the controller's own effect from reducing the protected Digimon's DP", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: HUDIE, as: "chosen", dp: 5000 }],
          hand: [
            { card: "BT23-085", as: "ryuji" },
            { card: NEUTRAL, as: "neutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: { hand: [{ card: NEUTRAL, as: "opponentNeutral" }], security: SECURITY, deck: DECK },
      },
      { autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.perm("chosen").topCard!.instanceId);
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ryuji").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("chosen"), "dpImmune"));
    expect(s.perm("chosen").currentDP).toBe(5000);

    await advance(s.engine).verb.modifyDP(s.perm("chosen").permanentId, -2000, EffectDuration.UntilOwnerTurnEnd);

    expect(s.perm("chosen").currentDP).toBe(3000);
  });

  it("lets the granted ＜Blocker＞ block a real attack", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: HUDIE, as: "chosen" }],
          hand: [
            { card: "BT23-085", as: "ryuji" },
            { card: NEUTRAL, as: "neutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: {
          // BT1-009 is a vanilla 3000 DP Lv.3 with no ＜Piercing＞, so a successful block
          // must leave the defender's security untouched.
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          hand: [{ card: NEUTRAL, as: "opponentNeutral" }],
          security: SECURITY,
          deck: DECK,
        },
      },
      // Decline Ryuji's own suspend watcher: this test is about the granted ＜Blocker＞.
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.perm("chosen").topCard!.instanceId);
    s.state.memory = 6;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ryuji").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("chosen"), "Blocker"));
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    // The grant is still live on the opponent's turn, so the Digimon can block.
    expect(observe(s.engine).hasKeyword(s.perm("chosen"), "Blocker")).toBe(true);
    const chosenCardId = s.perm("chosen").topCard!.instanceId;
    const securityBefore = s.state.players[0]!.security.length;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("chosen").permanentId })).toEqual(
      { ok: true },
    );
    await settle(() => !observe(s.engine).isAttacking());

    // The block redirected the attack: no security was checked, and the blocker took the hit.
    expect(s.state.players[0]!.security).toHaveLength(securityBefore);
    expect(s.events.some((event) => event.kind === "blocked")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === chosenCardId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("expires the ＜Reboot＞/＜Blocker＞ grants once the opponent's turn ends", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: HUDIE, as: "chosen" }],
          hand: [
            { card: "BT23-085", as: "ryuji" },
            { card: NEUTRAL, as: "neutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: { hand: [{ card: NEUTRAL, as: "opponentNeutral" }], security: SECURITY, deck: DECK },
      },
      { autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.perm("chosen").topCard!.instanceId);
    s.state.memory = 6;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ryuji").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("chosen"), "Blocker"));
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    // Still granted through the whole of the opponent's turn.
    expect(observe(s.engine).isRestricted(s.perm("chosen"), "dpImmune")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("chosen"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("chosen"), "Blocker")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(0);
    // The opponent's turn ended, so every grant is gone.
    expect(observe(s.engine).isRestricted(s.perm("chosen"), "dpImmune")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("chosen"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("chosen"), "Blocker")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // --- Clause 3: [All Turns] suspend watcher --------------------------------------------

  it("suspends Ryuji and uses a single-color [CS] Option for free when a [Hudie] Digimon attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-085", as: "ryuji" },
            { card: HUDIE, as: "hudie" },
          ],
          hand: [
            { card: CS_OPTION, as: "option" },
            { card: NEUTRAL, as: "neutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "victim", under: ["BT1-009", "BT1-010"] }],
          hand: [{ card: NEUTRAL, as: "opponentNeutral" }],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    const victimTopBefore = s.perm("victim").topCard!.instanceId;
    const victimStackBefore = s.perm("victim").stack.length;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hudie").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === optionId),
    );

    // Cost paid: Ryuji is suspended. Benefit: the Option resolved from hand for free.
    expect(s.perm("ryuji").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === optionId)).toBe(true);
    // ＜De-Digivolve 4＞ ran: the opponent's Digimon lost its top card and stack depth.
    expect(victimStackBefore).toBe(2);
    expect(s.perm("victim").topCard!.instanceId).not.toBe(victimTopBefore);
    expect(s.perm("victim").stack.length).toBeLessThan(victimStackBefore);
    // The Option's printed cost of 5 was never paid: the memory gauge did not move.
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("declining leaves Ryuji unsuspended and the Option in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-085", as: "ryuji" },
            { card: HUDIE, as: "hudie" },
          ],
          hand: [
            { card: CS_OPTION, as: "option" },
            { card: NEUTRAL, as: "neutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "victim", under: ["BT1-009", "BT1-010"] }],
          hand: [{ card: NEUTRAL, as: "opponentNeutral" }],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hudie").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("ryuji").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === optionId)).toBe(false);
    expect(s.perm("victim").stack).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("ignores the suspension of a Digimon without the [Hudie] trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-085", as: "ryuji" },
            { card: CS_ONLY, as: "csOnly" },
          ],
          hand: [
            { card: CS_OPTION, as: "option" },
            { card: NEUTRAL, as: "neutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "victim", under: ["BT1-009", "BT1-010"] }],
          hand: [{ card: NEUTRAL, as: "opponentNeutral" }],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("csOnly").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    // [CS] alone does not arm the watcher — the printed source is a [Hudie] trait Digimon.
    expect(s.perm("ryuji").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.perm("victim").stack).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("cannot activate while Ryuji is already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-085", as: "ryuji", suspended: true },
            { card: HUDIE, as: "hudie" },
          ],
          hand: [
            { card: CS_OPTION, as: "option" },
            { card: NEUTRAL, as: "neutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "victim", under: ["BT1-009", "BT1-010"] }],
          hand: [{ card: NEUTRAL, as: "opponentNeutral" }],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    // Seat 0's own Active phase unsuspends the board, so re-arm Ryuji after Main opens.
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.perm("ryuji").isSuspended = true;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hudie").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    // The suspend cost cannot be paid, so nothing is asked and nothing is used.
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.perm("victim").stack).toHaveLength(2);
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not use an Option without the [CS] trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-085", as: "ryuji" },
            { card: HUDIE, as: "hudie" },
          ],
          // BT2-103 is black and single-color like Comet Hammer; only the [CS] trait is missing.
          hand: [
            { card: PLAIN_OPTION, as: "option" },
            { card: NEUTRAL, as: "neutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "victim", under: ["BT1-009", "BT1-010"] }],
          hand: [{ card: NEUTRAL, as: "opponentNeutral" }],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hudie").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === optionId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not use a two-color [CS] Option: the clause says single-color", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-085", as: "ryuji" },
            { card: HUDIE, as: "hudie" },
          ],
          // BT22-099 Kuremi Detective Agency carries the [CS] trait but prints two colors.
          hand: [
            { card: DUAL_COLOR_CS_OPTION, as: "option" },
            { card: NEUTRAL, as: "neutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "victim", under: ["BT1-009", "BT1-010"] }],
          hand: [{ card: NEUTRAL, as: "opponentNeutral" }],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hudie").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    // The card stays in hand: the two-color Option never passes the single-color gate.
    // (The engine still offers, and here auto-accepts, the "by suspending this Tamer" cost
    // before it knows the body will find nothing to use; see the audit report.)
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === optionId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[All Turns]: fires when the [Hudie] Digimon suspends to block on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-085", as: "ryuji" },
            // BT23-051 Golemon is a [Hudie]/[CS] Lv.4 with printed ＜Blocker＞.
            { card: "BT23-051", as: "hudie" },
          ],
          hand: [
            { card: CS_OPTION, as: "option" },
            { card: NEUTRAL, as: "neutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "attacker", under: ["BT1-009", "BT1-010"] }],
          hand: [{ card: NEUTRAL, as: "opponentNeutral" }],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("hudie").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.events.some((event) => event.kind === "blocked")).toBe(true);
    expect(s.perm("ryuji").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // --- Clause 4: [Security] --------------------------------------------------------------

  it("finds exactly one eligible card in a four-way hand pool", async () => {
    // Pool: single-color [CS] Option (eligible), two-color [CS] Option, single-color Option
    // without [CS], and a [CS] card that is not an Option at all.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-085", as: "ryuji" },
            { card: HUDIE, as: "hudie" },
          ],
          hand: [
            { card: CS_OPTION, as: "eligible" },
            { card: DUAL_COLOR_CS_OPTION, as: "twoColor" },
            { card: PLAIN_OPTION, as: "noCsTrait" },
            { card: CS_ONLY, as: "csButNotAnOption" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "victim", under: ["BT1-009", "BT1-010"] }],
          hand: [{ card: NEUTRAL, as: "opponentNeutral" }],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const eligibleId = s.inst("eligible").instanceId;
    const twoColorId = s.inst("twoColor").instanceId;
    const noCsId = s.inst("noCsTrait").instanceId;
    const notAnOptionId = s.inst("csButNotAnOption").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hudie").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === eligibleId),
    );

    // Exactly the single-color [CS] Option left the hand; the three near-misses stayed.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual(
      [twoColorId, noCsId, notAnOptionId].sort(),
    );
    expect(s.perm("ryuji").isSuspended).toBe(true);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("protects a Digimon that digivolved this turn through the public digivolve intent", async () => {
    // The grant must follow the live permanent across a real evolution step, not a seeded one.
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: HUDIE, as: "stack" }],
          hand: [
            { card: "BT23-020", as: "seadramon" },
            { card: "BT23-085", as: "ryuji" },
            { card: NEUTRAL, as: "neutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
        1: {
          hand: [
            { card: DP_REDUCER, as: "reducer" },
            { card: NEUTRAL, as: "opponentNeutral" },
          ],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    const baseId = s.inst("stack").instanceId;
    const seadramonId = s.inst("seadramon").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 6;
    const permanentId = s.perm("stack").permanentId;

    // BT23-048 Gotsumon carries [CS], so BT23-020's "Lv.3 w/[CS] trait: Cost 2" route applies.
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: seadramonId })).toEqual({ ok: true });
    await settle(() => s.perm("stack").topCard?.instanceId === seadramonId && s.state.pendingDecision === undefined);
    expect(s.perm("stack").stack.map((card) => card.instanceId)).toEqual([baseId]);
    const evolvedDp = s.perm("stack").currentDP;

    prefer.push(seadramonId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ryuji").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("stack"), "dpImmune"));

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    prefer.length = 0;
    prefer.push(s.perm("stack").topCard!.instanceId);
    s.state.memory = 8;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("reducer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === DP_REDUCER));

    // The opponent's -3000 cannot move the DP of the Digimon that digivolved this turn.
    expect(s.perm("stack").topCard?.instanceId).toBe(seadramonId);
    expect(s.perm("stack").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.perm("stack").currentDP).toBe(evolvedDp);
    expect(observe(s.engine).isRestricted(s.perm("stack"), "dpImmune")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("plays itself from security without paying its 4 cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: NEUTRAL, as: "neutral" }],
          security: [{ card: "BT23-085", as: "securityRyuji" }, "BT1-009", "BT1-010"],
          deck: DECK,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          hand: [{ card: NEUTRAL, as: "opponentNeutral" }],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const ryujiId = s.inst("securityRyuji").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === ryujiId));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === ryujiId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === ryujiId)).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(2);
    // The 4 play cost was not paid: memory moved only by the attacker's own security check.
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
