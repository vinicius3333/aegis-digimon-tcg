import { type CardInstance, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT23-095.js";

/** The bottom card of a deck: `insertCard(..., "bottom")` pushes, so the bottom is the last entry. */
function deckBottomId(deck: readonly CardInstance[]): string | undefined {
  return deck.at(-1)?.instanceId;
}

describe("BT23-095 Crescent Leaf", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-095")).toMatchObject({
      cardId: "BT23-095",
      nameEn: "Crescent Leaf",
      colors: ["Green"],
      kinds: ["Option"],
      playCost: 5,
      types: ["CS"],
      securityEffectText:
        "[Security] Return 1 of your opponent's suspended Digimon to the bottom of the deck. Then, place this card in the battle area.",
    });
    // The committed catalog carries a non-breaking space inside "your [CS] trait"; normalize
    // it so this reads the printed wording rather than the source's whitespace encoding.
    expect(getCardDefinition("BT23-095")?.effectText?.replace(/[\u00a0]/g, " ")).toBe(
      "While you have a Digimon or Tamer with the [CS] trait on the field, you can ignore this card's color requirements.\n" +
        "[Main] Return 1 of your opponent's suspended Digimon to the bottom of the deck. Then, place this card in the battle area.\n" +
        "[Your Turn] When one of your [CS] trait Digimon attacks, ＜Delay＞ \n" +
        "・Return 1 of your opponent's suspended Digimon to the bottom of the deck.",
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);

    // Q5383: "on the field" is the battle area OR the breeding area (the CR 3-4-7-8
    // "explicitly references breeding areas" exception), and the printed "[CS] trait" is
    // exact trait matching (CR 2-3-2-3), not `traitContains`.
    const waiver = compiled.effects.find((effect) => effect.trigger === "Static") as any;
    expect(waiver.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      condition: {
        kind: "youHave",
        filter: {
          controllerDefault: "mine",
          kind: ["Digimon", "Tamer"],
          zone: ["battleArea", "breeding"],
          nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
        },
      },
    });
  });

  it("keeps return nested in Delay and Main/Security return-then-place", () => {
    const turn = compiled.effects.find((effect) => effect.trigger === "YourTurn") as any;
    expect(turn.keywords[0].keyword).toBe("Delay");
    expect(turn.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttacking",
      sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
    });
    expect(turn.actions[0].actions).toEqual([expect.objectContaining({ kind: "Return", to: "deckBottom" })]);
    for (const trigger of ["Main", "Security"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger) as any;
      expect(effect.actions).toMatchObject([
        {
          kind: "Return",
          to: "deckBottom",
          target: { count: 1, filter: { controller: "opponent", suspended: true, kind: ["Digimon"] } },
        },
        { kind: "PlaceInBattleAreaSelf" },
      ]);
    }
    expect((compiled.effects.find((entry) => entry.trigger === "Security") as any).isSecurity).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Clause 1 — static color waiver (Q5383)
  // ---------------------------------------------------------------------------

  it("waives the green color requirement from an off-color CS Digimon in the battle area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT22-008", as: "csDigimon" }],
        hand: [{ card: "BT23-095", as: "option" }],
      },
      1: { deck: ["BT1-012"] },
    });
    s.state.memory = 5;
    const optionId = s.inst("option").instanceId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  // Q5383, asked about this printed wording, answers that "on the field" is the battle area
  // OR the breeding area — the CR 3-4-7-8 "explicitly references breeding areas" exception.
  it("waives the green color requirement from an off-color CS Digimon in breeding (Q5383)", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT22-008", as: "csInBreeding" },
        hand: [{ card: "BT23-095", as: "option" }],
      },
      1: { deck: ["BT1-012"] },
    });
    s.state.memory = 5;
    const optionId = s.inst("option").instanceId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  // A Digimon's traits are its top card's: a [CS] card in the digivolution cards beneath a
  // non-[CS] top card is not a "[CS] trait Digimon".
  it("does not waive the color requirement from a CS card under a non-CS top card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "stack", under: ["BT22-008"] }],
        hand: [{ card: "BT23-095", as: "option" }],
      },
      1: { deck: ["BT1-012"] },
    });
    s.state.memory = 5;
    await s.ready();

    expect(s.perm("stack").stack.map((card) => card.cardId)).toEqual(["BT22-008"]);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.memory).toBe(5);
  });

  it("waives the green color requirement from an off-color CS Tamer in the battle area (Q5383)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT22-090", as: "csTamer" }],
        hand: [{ card: "BT23-095", as: "option" }],
      },
      1: { deck: ["BT1-012"] },
    });
    s.state.memory = 5;
    const optionId = s.inst("option").instanceId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("refuses the play when no [CS] Digimon or Tamer is on the field", async () => {
    const s = setupEngine({
      0: {
        // Red, no [CS] trait, in both zones the waiver reads.
        battleArea: [{ card: "BT1-009", as: "plainDigimon" }],
        breeding: { card: "BT1-010", as: "plainInBreeding" },
        hand: [{ card: "BT23-095", as: "option" }],
      },
      1: { deck: ["BT1-012"] },
    });
    s.state.memory = 5;
    const optionId = s.inst("option").instanceId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([optionId]);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(false);
  });

  it("does not accept a near-trait card: [Abadin Electronics] is not the [CS] trait", async () => {
    const s = setupEngine({
      0: {
        // Purple Tamer whose only trait ends in "cs"; a substring match would wrongly waive.
        battleArea: [{ card: "BT17-090", as: "nearTraitTamer" }],
        hand: [{ card: "BT23-095", as: "option" }],
      },
      1: { deck: ["BT1-012"] },
    });
    s.state.memory = 5;
    const optionId = s.inst("option").instanceId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([optionId]);
    expect(s.state.memory).toBe(5);
  });

  // ---------------------------------------------------------------------------
  // Clause 2 — [Main] return then place
  // ---------------------------------------------------------------------------

  it("returns the chosen suspended opposing Digimon to the deck bottom and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-006", as: "csEnabler" },
            { card: "ST1-02", as: "ownSuspended", suspended: true },
          ],
          hand: [{ card: "BT23-095", as: "option" }],
          deck: ["BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target", suspended: true, under: [{ card: "BT1-010", as: "underCard" }] },
            { card: "BT1-013", as: "activeBystander" },
          ],
          deck: ["BT1-012", "BT1-014"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const optionId = s.inst("option").instanceId;
    const targetId = s.perm("target").topCard!.instanceId;
    const underId = s.inst("underCard").instanceId;
    const bystanderId = s.perm("activeBystander").topCard!.instanceId;
    const ownSuspendedId = s.perm("ownSuspended").topCard!.instanceId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => deckBottomId(s.state.players[1]!.deck) === targetId);

    // The returned top card lands UNDER the whole deck, not on top of it.
    expect(s.state.players[1]!.deck.map((card) => card.instanceId).at(-1)).toBe(targetId);
    expect(s.state.players[1]!.deck).toHaveLength(3);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === targetId)).toBe(false);
    // Its digivolution card is trashed by its owner, not carried into the deck.
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([underId]);
    // Controller and suspension boundaries: only the opponent's suspended Digimon is legal.
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === bystanderId)).toBe(
      true,
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === ownSuspendedId)).toBe(
      true,
    );
    // "Then, place this card in the battle area" — the Option is a permanent, not trash.
    const placed = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === optionId);
    expect(placed).toBeDefined();
    expect(placed!.placedByEffect).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("still places itself when the opponent has no suspended Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-006", as: "csEnabler" }],
          hand: [{ card: "BT23-095", as: "option" }],
          deck: ["BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "activeOnly" }],
          deck: ["BT1-012", "BT1-014"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const optionId = s.inst("option").instanceId;
    const bystanderId = s.perm("activeOnly").topCard!.instanceId;
    const deckBefore = s.state.players[1]!.deck.map((card) => card.instanceId);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));

    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual(deckBefore);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === bystanderId)).toBe(
      true,
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Clause 3 — [Your Turn] When one of your [CS] Digimon attacks, <Delay>
  // ---------------------------------------------------------------------------

  it("pays Delay end-to-end: places itself on one turn, then returns on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-006", as: "csAttacker" }],
          hand: [
            { card: "BT23-095", as: "option" },
            { card: "ST1-02", as: "ownNeutral" },
          ],
          deck: ["BT1-012", "BT1-014"],
          security: ["ST1-02", "ST1-02"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "suspendedTarget", suspended: true },
            { card: "BT1-013", as: "activeBystander" },
          ],
          hand: [{ card: "ST1-02", as: "opponentNeutral" }],
          deck: ["BT1-012", "BT1-014"],
          security: ["ST1-02", "ST1-02"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const optionId = s.inst("option").instanceId;
    const targetId = s.perm("suspendedTarget").topCard!.instanceId;
    const bystanderId = s.perm("activeBystander").topCard!.instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // Turn 1: the [Main] clause places the Option in the battle area.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    // Its own return already consumed the only suspended target, so re-arm one for the Delay.
    s.perm("activeBystander").isSuspended = true;

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    // The Option survives the opponent's turn: it was placed by an effect (CR 17-1-3-2-2).
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    // Turn 3 (own): re-suspend the target the Active phase unsuspended, then attack with CS.
    s.perm("activeBystander").isSuspended = true;
    expect(s.perm("activeBystander").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("csAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => deckBottomId(s.state.players[1]!.deck) === bystanderId);

    expect(s.state.players[1]!.deck.map((card) => card.instanceId).at(-1)).toBe(bystanderId);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === bystanderId)).toBe(
      false,
    );
    // Delay is paid by trashing the Option.
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(false);
    // The already-returned first target never came back.
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === targetId)).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not pay Delay when a non-CS Digimon attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-095", as: "option" },
            { card: "BT1-009", as: "attacker" },
          ],
          deck: ["BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "target", suspended: true }],
          deck: ["BT1-012", "BT1-014"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    const targetId = s.perm("target").permanentId;
    const deckBefore = s.state.players[1]!.deck.map((card) => card.instanceId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(true);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual(deckBefore);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
  });

  it("does not pay Delay for a near-trait [Abadin Electronics] attacker", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-095", as: "option" },
            { card: "BT16-039", as: "nearTraitAttacker" },
          ],
          deck: ["BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "target", suspended: true }],
          deck: ["BT1-012", "BT1-014"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    const targetId = s.perm("target").topCard!.instanceId;
    const deckBefore = s.state.players[1]!.deck.map((card) => card.instanceId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("nearTraitAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("nearTraitAttacker").isSuspended);

    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual(deckBefore);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === targetId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
  });

  it("does not pay Delay on the opponent's turn when their [CS] Digimon attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-095", as: "option" },
            { card: "BT1-013", as: "ownSuspended", suspended: true },
          ],
          hand: [{ card: "ST1-02", as: "ownNeutral" }],
          deck: ["BT1-012", "BT1-014"],
          security: ["ST1-02", "ST1-02"],
        },
        1: {
          battleArea: [{ card: "BT23-006", as: "opponentCs" }],
          hand: [{ card: "ST1-02", as: "opponentNeutral" }],
          deck: ["BT1-012", "BT1-014"],
          security: ["ST1-02", "ST1-02"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    const ownSuspendedId = s.perm("ownSuspended").topCard!.instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    s.perm("ownSuspended").isSuspended = true;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponentCs").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponentCs").isSuspended);

    // The clause is [Your Turn] and its source filter is "your" Digimon: the opponent's own
    // [CS] attacker on the opponent's turn satisfies neither.
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === ownSuspendedId)).toBe(
      true,
    );
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === ownSuspendedId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps the Option in the battle area when the Delay activation is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-095", as: "option" },
            { card: "BT23-006", as: "csAttacker" },
          ],
          deck: ["BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "target", suspended: true }],
          deck: ["BT1-012", "BT1-014"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    const targetId = s.perm("target").topCard!.instanceId;
    const deckBefore = s.state.players[1]!.deck.map((card) => card.instanceId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("csAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("csAttacker").isSuspended);

    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual(deckBefore);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === targetId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Clause 4 — [Security]
  // ---------------------------------------------------------------------------

  it("returns the suspended attacker and places itself for the defending player from security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          deck: ["BT1-012", "BT1-014"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          security: [{ card: "BT23-095", as: "securityOption" }],
          deck: ["BT1-012", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("securityOption").instanceId;
    const attackerId = s.perm("attacker").topCard!.instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => deckBottomId(s.state.players[0]!.deck) === attackerId);

    // "your opponent's" binds to the security card's controller (seat 1): the attacker.
    expect(s.state.players[0]!.deck.map((card) => card.instanceId).at(-1)).toBe(attackerId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    // "Then, place this card in the battle area" — the DEFENDER's battle area.
    const placed = s.state.players[1]!.battleArea.find((permanent) => permanent.topCard?.instanceId === optionId);
    expect(placed).toBeDefined();
    expect(placed!.placedByEffect).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
