import { getCardDefinition, type ServerEvent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-062.js";
import "../index.js";

const CARD_ID = "EX10-062";

/**
 * EX10-062 Yujin Ozora — Black Tamer, play cost 3, [App Driver]/[Appmon]/[Leviathan].
 *
 *   [Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.
 *   [All Turns] When effects trash any of your Digimon's link cards, by suspending this
 *     Tamer, ＜Draw 1＞
 *   [End of Your Turn] [Once Per Turn] 1 of your Digimon may app fuse into a Digimon card
 *     in the hand.
 *   [Security] Play this card without paying the cost.
 *
 * Every clause below is driven through public intents and the production turn loop:
 *   - start of main / end of turn: `advance(...).runTurn(seat)` (the real TurnStateMachine);
 *   - the link-card trash: seat plays BT25-073 Dragomon, whose [On Play] cost is
 *     "By trashing 1 of your Digimon's link cards" — a genuine effect trash;
 *   - Q5172 (a link REPLACE must not trigger): two `linkCard` intents onto a base-limit-1
 *     host, so the rule-check sweep (CR §17-1-3-2-5) trashes the old link;
 *   - [Security]: the opponent attacks the player and the security check plays the Tamer.
 * No injected timing (`advance.fire*`) and no engine internals are used anywhere.
 */

/** Count the one-memory gains in a slice of the event log; a turn-start reset is a larger jump. */
function singleMemoryGains(events: ServerEvent[]): number {
  return events.filter((event) => event.kind === "memoryChanged" && event.to - event.from === 1).length;
}

/**
 * Answer the optional ("use this effect?") prompts in order with a scripted yes/no list.
 * Needed where one flow raises two optional prompts that must be answered differently —
 * the driver card's own optional [On Play] and Yujin's suspend-to-draw — which the
 * harness's all-or-nothing `autoAcceptOptional` / `autoDeclineOptional` cannot express.
 */
async function answerOptionals(s: EngineSetup, plan: boolean[]): Promise<void> {
  let handled = 0;
  for (const accept of plan) {
    await settle(() => s.decisions.filter(({ req }) => req.kind === "optional").length > handled);
    const pending = s.decisions.filter(({ req }) => req.kind === "optional")[handled];
    if (pending === undefined) return;
    handled += 1;
    s.engine.applyIntent(pending.seat, {
      type: "respondDecision",
      decisionId: pending.req.decisionId,
      response: { kind: "optional", accept },
    });
  }
}

/**
 * Board for the link-trash clause: Yujin plus an inert host carrying one link card, and
 * BT25-073 Dragomon in hand as the public trasher.
 *   BT25-073: "[On Play] By trashing 1 of your Digimon's link cards, you may play or use 1
 *   [TS] trait card with a play or use cost of 5 or less from your hand without paying the
 *   cost." — the cost is the genuine link-card trash; no [TS] card is in hand, so the
 *   payload does nothing and only the trash is observable.
 */
function linkTrashBoard(tamerZone: "battleArea" | "trash" | "hand") {
  return {
    0: {
      battleArea: [
        ...(tamerZone === "battleArea" ? [{ card: CARD_ID, as: "tamer" }] : []),
        { card: "BT1-009", as: "host", linked: [{ card: "BT1-009", as: "linkCard" }] },
      ],
      hand: [{ card: "BT25-073", as: "dragomon" }, ...(tamerZone === "hand" ? [{ card: CARD_ID, as: "tamer" }] : [])],
      trash: tamerZone === "trash" ? [{ card: CARD_ID, as: "tamer" }] : [],
      deck: ["BT1-013", "BT1-014"],
    },
  };
}

describe("EX10-062 Yujin Ozora", () => {
  it("matches the catalog and compiles all four printed clauses", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      set: "EX10",
      nameEn: "Yujin Ozora",
      colors: ["Black"],
      kinds: ["Tamer"],
      playCost: 3,
      dp: 0,
      evoCosts: [],
      forms: ["-"],
      attributes: ["-"],
      types: ["App Driver", "Appmon", "Leviathan"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toHaveLength(4);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "StartOfYourMainPhase",
          actions: [expect.objectContaining({ kind: "GainMemory", amount: 1 })],
        }),
        expect.objectContaining({
          trigger: "AllTurns",
          actions: [
            expect.objectContaining({
              kind: "SubTrigger",
              event: "whenLinkTrashed",
              sourceFilter: { controller: "mine", kind: ["Digimon"] },
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "EndOfYourTurn",
          frequency: "OncePerTurn",
          actions: [expect.objectContaining({ kind: "AppFuse", from: ["hand"], optional: true })],
        }),
        expect.objectContaining({ trigger: "Security", isSecurity: true }),
      ]),
    );
  });

  // --- [Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory. ---

  it("gains exactly 1 memory at the start of its controller's Main phase while the opponent has a Digimon", async () => {
    // `autoDeclineOptional` answers the Tamer's own [End of Your Turn] app-fusion prompt,
    // which the same turn raises; without an answer the turn loop would never close.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "tamer" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-013", "BT1-014"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "enemy" }] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 0;
    const before = s.events.length;

    await advance(s.engine).runTurn(0);

    expect(singleMemoryGains(s.events.slice(before))).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("gains nothing when the opponent's only permanent is a Tamer, not a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "tamer" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-013", "BT1-014"],
        },
        1: { battleArea: [{ card: CARD_ID, as: "enemyTamer" }] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 0;
    const before = s.events.length;

    await advance(s.engine).runTurn(0);

    expect(singleMemoryGains(s.events.slice(before))).toBe(0);
  });

  it("stays silent at the start of the OPPONENT's Main phase", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "tamer" }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "enemy" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 0;
    const before = s.events.length;

    await advance(s.engine).runTurn(1);

    expect(singleMemoryGains(s.events.slice(before))).toBe(0);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID)).toBe(true);
  });

  // --- [All Turns] When effects trash any of your Digimon's link cards ... ---

  it("suspends the Tamer and draws 1 when an effect trashes one of your Digimon's link cards", async () => {
    const s = setupEngine(linkTrashBoard("battleArea"), { autoSelectCards: true, autoChooseOption: true });
    await s.ready();
    const p0 = s.state.players[0]!;
    s.state.memory = 10;
    const handBefore = p0.hand.length;
    const linkCardId = s.inst("linkCard").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragomon").instanceId })).toEqual({
      ok: true,
    });
    // Accept Dragomon's optional [On Play] (its cost trashes the link card), then accept
    // Yujin's optional suspend-to-draw.
    await answerOptionals(s, [true, true]);
    await settle(() => p0.hand.some(({ cardId }) => cardId === "BT1-013"));
    await s.ready();

    expect(s.perm("host").linked).toHaveLength(0);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(linkCardId);
    // Dragomon left the hand and the drawn card entered it: net hand size is unchanged,
    // and the drawn card is the exact top of deck.
    expect(p0.hand.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
    expect(p0.hand).toHaveLength(handBefore);
    expect(p0.deck.map(({ cardId }) => cardId)).toEqual(["BT1-014"]);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(3); // Dragomon's play cost 7; the draw costs no memory
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("draws nothing and leaves the Tamer unsuspended when the suspend cost is declined", async () => {
    const s = setupEngine(linkTrashBoard("battleArea"), { autoSelectCards: true, autoChooseOption: true });
    await s.ready();
    const p0 = s.state.players[0]!;
    s.state.memory = 10;
    const linkCardId = s.inst("linkCard").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragomon").instanceId })).toEqual({
      ok: true,
    });
    // Accept Dragomon's [On Play] (the link card is still trashed), decline Yujin's cost.
    await answerOptionals(s, [true, false]);
    await settle(() => p0.trash.some(({ instanceId }) => instanceId === linkCardId));
    await settle(() => false, 30);
    await s.ready();

    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(p0.hand).toHaveLength(0);
    expect(p0.deck.map(({ cardId }) => cardId)).toEqual(["BT1-013", "BT1-014"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not fire for an OPPONENT's Digimon's link card ('any of YOUR Digimon's')", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "tamer" }],
          deck: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "enemyHost", linked: [{ card: "BT1-009", as: "enemyLink" }] }],
          hand: [{ card: "BT25-073", as: "dragomon" }],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const p0 = s.state.players[0]!;
    s.state.turnSeat = 1;
    s.state.memory = 10; // the gauge is turn-relative: seat 1 is the turn player here

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("dragomon").instanceId })).toEqual({
      ok: true,
    });
    await answerOptionals(s, [true]);
    await settle(() => s.perm("enemyHost").linked.length === 0);
    await settle(() => false, 30);
    await s.ready();

    expect(s.perm("enemyHost").linked).toHaveLength(0);
    expect(p0.hand).toHaveLength(0);
    expect(p0.deck.map(({ cardId }) => cardId)).toEqual(["BT1-013", "BT1-014"]);
    expect(s.perm("tamer").isSuspended).toBe(false);
  });

  it("Q5172: a link card replaced by the link-limit rule sweep is not an effect trash", async () => {
    // CR §4-8-5 / §17-1-3-2-5: linking onto a Digimon already at its link limit is legal;
    // the excess link card is trashed by the rule-check sweep, not by an effect. Q5172 says
    // Yujin's [All Turns] clause must NOT trigger on that replacement.
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "tamer" },
          { card: "BT23-007", as: "host" },
        ],
        hand: [
          { card: "BT23-007", as: "firstLink" },
          { card: "BT24-053", as: "secondLink" },
        ],
        deck: ["BT1-013", "BT1-014"],
      },
    });
    await s.ready();
    const p0 = s.state.players[0]!;
    s.state.memory = 10;
    const firstLinkId = s.inst("firstLink").instanceId;
    const secondLinkId = s.inst("secondLink").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: firstLinkId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some(({ instanceId }) => instanceId === firstLinkId));
    expect(s.perm("host").linked.map(({ instanceId }) => instanceId)).toEqual([firstLinkId]);

    // Second link onto a base-limit-1 host: the first link card is trashed by the rule sweep.
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: secondLinkId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => p0.trash.some(({ instanceId }) => instanceId === firstLinkId));
    await settle(() => false, 30);
    await s.ready();

    expect(s.perm("host").linked.map(({ instanceId }) => instanceId)).toEqual([secondLinkId]);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(firstLinkId);
    // The rule trim is not an effect trash: no draw, no suspend, no prompt.
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(p0.hand).toHaveLength(0);
    expect(p0.deck.map(({ cardId }) => cardId)).toEqual(["BT1-013", "BT1-014"]);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
  });

  // --- A Tamer's effects are inert outside the battle area. ---

  it.each(["trash", "hand"] as const)(
    "is inert while it sits in the %s: no draw on a link trash and no start-of-main memory",
    async (zone) => {
      const s = setupEngine(linkTrashBoard(zone), { autoSelectCards: true, autoChooseOption: true });
      await s.ready();
      const p0 = s.state.players[0]!;
      s.state.memory = 10;
      const handBefore = p0.hand.length;

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragomon").instanceId })).toEqual({
        ok: true,
      });
      await answerOptionals(s, [true]);
      await settle(() => s.perm("host").linked.length === 0);
      await settle(() => false, 30);
      await s.ready();

      // Only Dragomon left the hand; nothing was drawn.
      expect(p0.hand).toHaveLength(handBefore - 1);
      expect(p0.deck.map(({ cardId }) => cardId)).toEqual(["BT1-013", "BT1-014"]);
      expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);

      // ... and its [Start of Your Main Phase] clause is silent too, with an opponent Digimon out.
      s.putOnBoard(1, { card: "BT1-009", as: "enemy" });
      await s.ready();
      s.state.memory = 0;
      const before = s.events.length;
      await advance(s.engine).runTurn(0);
      expect(singleMemoryGains(s.events.slice(before))).toBe(0);
    },
  );

  // --- [End of Your Turn] [Once Per Turn] app fusion ---

  it("app fuses one Digimon into a hand card at the end of its controller's turn, once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "tamer" },
            { card: "EX10-017", as: "firstHost", linked: [{ card: "EX10-043", as: "firstSakusimon" }] },
            { card: "EX10-017", as: "secondHost", linked: [{ card: "EX10-043", as: "secondSakusimon" }] },
          ],
          hand: [
            { card: "EX10-019", as: "firstWarudamon" },
            { card: "EX10-019", as: "secondWarudamon" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          hand: [{ card: "BT1-009", as: "theirSpare" }],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    // Pin the first pair so a broken once-per-turn gate cannot pass by fusing the same host twice.
    preferred.push(s.perm("firstHost").topCard!.instanceId, s.inst("firstWarudamon").instanceId);

    // The real turn loop: seat 0's end of turn, then seat 1's, then seat 0's again.
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.perm("firstHost").topCard?.cardId === "EX10-019");

    // Exactly one fusion at that end of turn: the second legal pair is untouched.
    expect(s.perm("firstHost").topCard?.instanceId).toBe(s.inst("firstWarudamon").instanceId);
    // The fusion stacked the prior top (EX10-017) and the consumed link card (EX10-043)
    // beneath Warudamon; Warudamon's own [When Digivolving] then re-linked EX10-017 out of
    // those digivolution cards, so the stack keeps only the consumed Sakusimon.
    expect(s.perm("firstHost").stack.map(({ cardId }) => cardId)).toEqual(["EX10-043"]);
    expect(s.perm("firstHost").linked.map(({ cardId }) => cardId)).toEqual(["EX10-017"]);
    expect(s.perm("secondHost").topCard?.cardId).toBe("EX10-017");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("secondWarudamon").instanceId,
    );

    // The opponent's end of turn is not "[End of Your Turn]": nothing fuses there.
    preferred.length = 0;
    preferred.push(s.perm("secondHost").topCard!.instanceId, s.inst("secondWarudamon").instanceId);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.turnSeat === 0);
    expect(s.perm("secondHost").topCard?.cardId).toBe("EX10-017");

    // Back on its controller's turn the [Once Per Turn] use has reset and the second pair fuses.
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.perm("secondHost").topCard?.cardId === "EX10-019");

    expect(s.perm("secondHost").topCard?.instanceId).toBe(s.inst("secondWarudamon").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(
      s.inst("secondWarudamon").instanceId,
    );

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // --- [Security] Play this card without paying the cost. ---

  it("[Security] plays itself into the battle area without paying its 3 cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: { security: [{ card: CARD_ID, as: "tamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const tamerId = s.inst("tamer").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.instanceId === tamerId));
    await s.ready();

    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.instanceId === tamerId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === tamerId)).toBe(false);
    // The security play pays nothing: only the attacker's own turn memory stands.
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
