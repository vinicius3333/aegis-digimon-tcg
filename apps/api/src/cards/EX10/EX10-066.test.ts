import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-066.js";
import "../index.js";

const CARD_ID = "EX10-066";
const RAGE = "EX10-022"; // Belphemon: Rage Mode (Lv.6)
const SLEEP = "EX10-021"; // Belphemon: Sleep Mode (Lv.6), [Digivolve] [Belphemon: Rage Mode]: Cost 1
const OTHER_RAGE = "BT13-091"; // Belphemon: Rage Mode with only the Purple Lv.5 requirement

/**
 * EX10-066 Akihiro Kurata (Purple Tamer, play cost 4).
 *
 * Every clause below is proved through the production turn loop and public intents:
 * `startTurnLoop` gives the real [Start of Your Turn] and [End of Your Turn] windows, and
 * the [Security] clause is proved through a real security check opened by an attack. No
 * injected timing (`advance.fire*`) is used anywhere in this file.
 */
describe("EX10-066 Akihiro Kurata", () => {
  it("matches the catalog and the compiled IR", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Akihiro Kurata",
      colors: ["Purple"],
      kinds: ["Tamer"],
      playCost: 4,
      dp: 0,
      evoCosts: [],
      maxCountInDeck: 4,
      effectText:
        "[Start of Your Turn] If you have 2 or less memory, set it to 3.\n[End of Your Turn] If you have 6 or fewer cards in your hand, " +
        // The catalog carries a non-breaking space after each "[Belphemon]".
        "by placing this Tamer as the bottom digivolution card of any of your Digimon with [Belphemon]\u00a0in their names, " +
        "that Digimon may digivolve into a Digimon card with [Belphemon]\u00a0in its name in the trash without paying the cost.",
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    const definition = getCardDefinition(CARD_ID)!;
    expect(definition.inheritedEffectText ?? "").toBe("");

    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find(({ trigger }) => trigger === "StartOfYourTurn")).toMatchObject({
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2, controller: "mine" } }],
    });
    expect(compiled.effects.find(({ trigger }) => trigger === "EndOfYourTurn")).toMatchObject({
      actions: [
        {
          kind: "Digivolve",
          target: { fromSelectionRef: "belphemonHost" },
          from: ["trash"],
          payCost: false,
          optional: true,
          condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 6 },
          cost: {
            kind: "place",
            targetIsPermanent: true,
            target: { filter: { isSelfRef: true }, isSelf: true },
            // "with [Belphemon] in their names" is a SUBSTRING name match (`match: "name"`),
            // not the exact-name `nameExact`.
            underFilter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Belphemon"], match: "name" }],
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "target",
            bindHostAs: "belphemonHost",
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Belphemon"], match: "name" }],
          },
        },
      ],
    });
    expect(compiled.effects.find(({ trigger }) => trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, isSelf: true }, payCost: false }],
    });
  });

  // --- [Start of Your Turn] If you have 2 or less memory, set it to 3 -------------------

  it("sets memory to 3 at the real start of my turn from 2 or less, and leaves 4 alone", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "kurata" }], hand: ["BT1-009"], deck: ["BT1-013", "BT1-014", "BT1-009"] },
      1: { hand: ["BT1-009"], deck: ["BT1-013", "BT1-014", "BT1-009"] },
    });
    const loop = s.engine.startTurnLoop();

    // Turn 1 opens with the gauge at 0, which is "2 or less": the Tamer sets it to 3.
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    // Arrange the gauge so my next turn STARTS above the threshold: the opponent moving it
    // 4 onto my side ends their turn and re-frames it as +4 for me.
    s.state.memory = -4;
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // --- [End of Your Turn] place as bottom digivolution card, digivolve from trash -------

  it("plays for 4, then at my real turn end places itself under Belphemon and digivolves it from the trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "kurata" }, "BT1-009"],
          battleArea: [{ card: RAGE, as: "rage", under: ["BT1-009", "BT1-013"] }],
          trash: [{ card: SLEEP, as: "sleep" }, "BT1-014"],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-013", "BT1-014", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const kurataInstanceId = s.inst("kurata").instanceId;
    const sleepInstanceId = s.inst("sleep").instanceId;
    const rageInstanceId = s.perm("rage").topCard!.instanceId;
    const hostPermanentId = s.perm("rage").permanentId;

    // Public play of the Tamer: 4 memory out of the 4 the start-of-turn clause is not
    // responsible for (the gauge opened at 0 and this Tamer set it to 3, so top it up).
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: kurataInstanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));
    expect(s.state.memory).toBe(0);
    const handBefore = s.state.players[0]!.hand.length;
    const deckBefore = s.state.players[0]!.deck.length;

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    const host = s.state.players[0]!.battleArea.find(({ permanentId }) => permanentId === hostPermanentId)!;
    expect(host.topCard!.instanceId).toBe(sleepInstanceId);
    // The Tamer is the BOTTOM digivolution card: below the two cards already under the host
    // and below the Rage Mode it digivolved from.
    expect(host.stack.map(({ instanceId }) => instanceId)).toEqual([
      kurataInstanceId,
      host.stack[1]!.instanceId,
      host.stack[2]!.instanceId,
      rageInstanceId,
    ]);
    expect(host.stack.map(({ cardId }) => cardId)).toEqual([CARD_ID, "BT1-009", "BT1-013", RAGE]);

    // The Tamer left the battle area to pay the cost, and Sleep Mode left the trash.
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-014"]);
    // Digivolving without paying the cost still draws the digivolution bonus card.
    expect(s.state.players[0]!.hand.length).toBe(handBefore + 1);
    expect(s.state.players[0]!.deck.length).toBe(deckBefore - 1);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("is optional: declining at my turn end leaves the Tamer on the board and the trash untouched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "kurata" },
            { card: RAGE, as: "rage" },
          ],
          hand: ["BT1-009"],
          trash: [{ card: SLEEP, as: "sleep" }],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-013", "BT1-014", "BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(s.perm("rage").topCard!.cardId).toBe(RAGE);
    expect(s.perm("rage").stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID)).toBe(true);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([SLEEP]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does nothing at turn end with 7 cards in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "kurata" },
            { card: RAGE, as: "rage" },
          ],
          hand: Array.from({ length: 7 }, () => "BT1-009"),
          trash: [{ card: SLEEP, as: "sleep" }],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-013", "BT1-014", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.hand).toHaveLength(7);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(s.perm("rage").topCard!.cardId).toBe(RAGE);
    expect(s.perm("rage").stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID)).toBe(true);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([SLEEP]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("refuses a non-Belphemon host and an empty trash: the Tamer is never placed", async () => {
    const noHost = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "kurata" },
            { card: "BT1-009", as: "bystander" },
          ],
          hand: ["BT1-009"],
          trash: [{ card: SLEEP, as: "sleep" }],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-013", "BT1-014", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const noHostLoop = noHost.engine.startTurnLoop();
    await advance(noHost.engine).waitForMainPhase(0);
    advance(noHost.engine).endMainPhaseIfOpen(0);
    await advance(noHost.engine).waitForMainPhase(1);

    expect(noHost.perm("bystander").stack).toHaveLength(0);
    expect(noHost.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID)).toBe(true);
    expect(noHost.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([SLEEP]);
    expect(noHost.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await noHostLoop;

    const noTarget = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "kurata" },
            { card: RAGE, as: "rage" },
          ],
          hand: ["BT1-009"],
          trash: ["BT1-014"],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-013", "BT1-014", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const noTargetLoop = noTarget.engine.startTurnLoop();
    await advance(noTarget.engine).waitForMainPhase(0);
    advance(noTarget.engine).endMainPhaseIfOpen(0);
    await advance(noTarget.engine).waitForMainPhase(1);

    expect(noTarget.perm("rage").topCard!.cardId).toBe(RAGE);
    expect(noTarget.perm("rage").stack).toHaveLength(0);
    expect(noTarget.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID)).toBe(true);
    expect(noTarget.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await noTargetLoop;
  });

  // The digivolution requirements still have to be met (Official Rule Manual §5: "without
  // paying the cost. (The digivolution requirements have to be met.)"). BT13-091 Belphemon:
  // Rage Mode only prints a Purple Lv.5 requirement, so a Lv.6 Rage Mode host cannot reach
  // it; EX10-021 Sleep Mode prints "[Digivolve] [Belphemon: Rage Mode]: Cost 1" and can.
  it("only digivolves into a trash Belphemon whose digivolution requirement the host meets", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "kurata" },
            { card: RAGE, as: "rage" },
          ],
          hand: ["BT1-009"],
          trash: [{ card: OTHER_RAGE, as: "otherRage" }],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-013", "BT1-014", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(s.perm("rage").topCard!.cardId).toBe(RAGE);
    expect(s.perm("rage").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([OTHER_RAGE]);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID)).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // --- The Tamer is inert outside the battle area ---------------------------------------

  it("is inert in the trash and in the hand: no memory set, no turn-end digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: RAGE, as: "rage" }],
          hand: [CARD_ID, "BT1-009"],
          trash: [CARD_ID, { card: SLEEP, as: "sleep" }],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-013", "BT1-014", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // [Start of Your Turn] belongs to a Tamer on the battle area only: the gauge stays at 0.
    expect(s.state.memory).toBe(0);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(s.perm("rage").topCard!.cardId).toBe(RAGE);
    expect(s.perm("rage").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain(CARD_ID);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([CARD_ID, SLEEP]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // --- [Security] Play this card without paying the cost ---------------------------------

  it("plays itself for free from a real security check opened by the opponent's attack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["BT1-009"],
          security: [{ card: CARD_ID, as: "kurata" }, "BT1-009"],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "attacker", dp: 20_000 }],
          hand: ["BT1-009"],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    const kurataInstanceId = s.inst("kurata").instanceId;
    const memoryBefore = s.state.memory;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));

    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === CARD_ID)!;
    expect(played.topCard!.instanceId).toBe(kurataInstanceId);
    expect(played.topCard!.faceUp).toBe(true);
    // Played from security, so it never went to the trash and its cost 4 was never paid.
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).not.toContain(CARD_ID);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
