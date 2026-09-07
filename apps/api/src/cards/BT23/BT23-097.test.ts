import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import "./BT23-070.js";
import { compiled } from "./BT23-097.js";

// Fixture cast (all legal main-deck cards; no Digi-Egg ever sits in security or deck):
//   BT23-070 Belphemon (X Antibody)  Purple Lv.6, digivolves from a Purple Lv.5 for 6.
//                                    Its [When Digivolving] deletes ALL of the opponent's
//                                    highest-level Digimon, so every fixture below keeps a
//                                    lower-level Digimon whose fate only BT23-097 can decide.
//   BT13-091 Belphemon: Rage Mode    Purple Lv.6 near-name control for the exact-name gate.
//   BT12-079 Jokermon               Purple Lv.5 vanilla — the digivolution source.
//   BT2-067  DemiDevimon            Purple Lv.3 vanilla — the color source for playing the Option.
//   BT1-020  Groundramon            Lv.5 vanilla — the opponent's highest-level Digimon.
//   BT1-014  Kokatorimon            Lv.4 vanilla — the mid-level target/survivor.
//   BT1-009  Monodramon             Lv.3 vanilla — the low-level survivor and hand/deck filler.
const BELPHEMON_X = "BT23-070";
const BELPHEMON_RAGE = "BT13-091";
const PURPLE_LV5 = "BT12-079";
const PURPLE_ANCHOR = "BT2-067";
const LV5 = "BT1-020";
const LV4 = "BT1-014";
const LV3 = "BT1-009";

/** Every optional prompt the engine has raised for BT23-097 so far. */
function optionPrompts(s: ReturnType<typeof setupEngine>): number {
  return s.decisions.filter((d) => d.req.kind === "optional" && d.req.sourceCardId === "BT23-097").length;
}

/** Card ids currently on a seat's battle area, in board order. */
function board(s: ReturnType<typeof setupEngine>, seat: 0 | 1): string[] {
  return s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard?.cardId ?? "?");
}

describe("BT23-097 Seventh Penetration", () => {
  it("matches every catalog field and compiles all three printed clauses", () => {
    expect(getCardDefinition("BT23-097")).toMatchObject({
      cardId: "BT23-097",
      nameEn: "Seventh Penetration",
      colors: ["Purple"],
      kinds: ["Option"],
      playCost: 7,
      types: ["Seven Great Demon Lords"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.map((effect) => effect.trigger)).toEqual(["YourTurn", "Main", "Security"]);
  });

  // ---------------------------------------------------------------------------
  // Clause 2 — "[Main] Delete 1 of your opponent's Digimon with a level as high
  // or higher as the number of cards in your hand."
  //
  // The Option leaves the hand as part of its own play, so the floor is the hand
  // size AFTER it is paid, not before.
  // ---------------------------------------------------------------------------

  it("deletes only an opponent Digimon whose level reaches the post-play hand size", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-097", as: "option" }, LV3, LV3, LV3, LV3],
          battleArea: [{ card: PURPLE_ANCHOR, as: "anchor" }],
        },
        1: {
          battleArea: [
            { card: LV4, as: "target" },
            { card: LV3, as: "survivor" },
          ],
          security: [LV3, LV3],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 7;
    const optionId = s.inst("option").instanceId;
    const targetId = s.perm("target").permanentId;
    const survivorId = s.perm("survivor").permanentId;
    const survivorTopId = s.perm("survivor").topCard!.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    // Four cards left in hand, so only the level 4 clears the floor.
    expect(s.state.players[0]!.hand).toHaveLength(4);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([survivorId]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual([LV4]);
    expect(targetId).not.toBe(survivorId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    // The level 3 was never offered as a target (a lone legal target is taken without a prompt).
    const offered = s.decisions.flatMap((d) => d.req.options?.candidateInstanceIds ?? []);
    expect(offered).not.toContain(survivorTopId);
    assertNoLoudGap(s);
  });

  it("deletes nothing when every opponent Digimon is below the hand size, and still pays for the Option", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-097", as: "option" }, LV3, LV3, LV3, LV3, LV3, LV3],
          battleArea: [{ card: PURPLE_ANCHOR, as: "anchor" }],
        },
        1: {
          battleArea: [
            { card: LV5, as: "high" },
            { card: LV3, as: "low" },
          ],
          security: [LV3, LV3],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 7;
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));

    // Six cards in hand, and the tallest opponent Digimon is level 5.
    expect(s.state.players[0]!.hand).toHaveLength(6);
    expect(s.state.memory).toBe(0);
    expect(board(s, 1)).toEqual([LV5, LV3]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.decisions.some((d) => d.req.kind === "chooseTargets")).toBe(false);
    assertNoLoudGap(s);
  });

  it("never reaches the controller's own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-097", as: "option" }, LV3],
          battleArea: [
            { card: PURPLE_ANCHOR, as: "anchor" },
            { card: LV5, as: "mine" },
          ],
        },
        1: { battleArea: [{ card: LV4, as: "theirs" }], security: [LV3, LV3] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(board(s, 0)).toEqual([PURPLE_ANCHOR, LV5]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual([LV4]);
    assertNoLoudGap(s);
  });

  // ---------------------------------------------------------------------------
  // Clause 1 — "[Trash] [Your Turn] When any of your Digimon digivolve into
  // [Belphemon (X Antibody)], by returning this card to the bottom of the deck,
  // activate this card's [Main] effects."
  //
  // The digivolution draw replaces the Belphemon card, so the hand size at
  // resolution equals the hand size before the intent (3 below).
  // ---------------------------------------------------------------------------

  it("returns itself under the deck and deletes a level 3 the Belphemon trigger cannot reach", async () => {
    const preferredTargets: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: PURPLE_LV5, as: "base" }],
          trash: [{ card: "BT23-097", as: "option" }],
          hand: [{ card: BELPHEMON_X, as: "belphemon" }, LV3, LV3],
          deck: [LV3, LV3, LV3],
        },
        1: {
          battleArea: [
            { card: LV5, as: "highest" },
            { card: LV3, as: "low" },
          ],
          security: [LV3, LV3],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredTargets },
    );
    await s.ready();
    const optionId = s.inst("option").instanceId;
    preferredTargets.push(s.perm("low").topCard!.instanceId);
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("belphemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    // The cost: this card leaves the trash for the BOTTOM of the deck (two cards
    // are left in the deck after the digivolution draw, so index 2 is the bottom).
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
    const deck = s.state.players[0]!.deck;
    expect(deck).toHaveLength(3);
    expect(deck[deck.length - 1]!.instanceId).toBe(optionId);
    // Three cards in hand, so the level 3 clears the floor. The level 5 fell to
    // Belphemon's own "delete all with the highest level" clause.
    expect(s.state.players[0]!.hand).toHaveLength(3);
    expect(board(s, 1)).toEqual([]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId).sort()).toEqual([LV3, LV5].sort());
    expect(board(s, 0)).toEqual([BELPHEMON_X]);
    assertNoLoudGap(s);
  });

  it("leaves the level 3 alive and the card in the trash when the return is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: PURPLE_LV5, as: "base" }],
          trash: [{ card: "BT23-097", as: "option" }],
          hand: [{ card: BELPHEMON_X, as: "belphemon" }, LV3, LV3],
          deck: [LV3, LV3, LV3],
        },
        1: {
          battleArea: [
            { card: LV5, as: "highest" },
            { card: LV3, as: "low" },
          ],
          security: [LV3, LV3],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const optionId = s.inst("option").instanceId;
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("belphemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(optionPrompts(s)).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === optionId)).toBe(false);
    // Only Belphemon's own clause resolved: the highest level died, the level 3 did not.
    expect(board(s, 1)).toEqual([LV3]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual([LV5]);
    assertNoLoudGap(s);
  });

  it("ignores an opponent's digivolution into Belphemon (X Antibody)", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [{ card: "BT23-097", as: "option" }],
          battleArea: [{ card: LV3, as: "bystander" }],
          security: [LV3, LV3],
        },
        1: {
          battleArea: [{ card: PURPLE_LV5, as: "base" }],
          hand: [{ card: BELPHEMON_X, as: "belphemon" }, LV3, LV3],
          deck: [LV3, LV3, LV3],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const optionId = s.inst("option").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("belphemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(optionPrompts(s)).toBe(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === optionId)).toBe(false);
    // The level 3 fell to the opponent's own Belphemon clause, not to this card.
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT23-097", LV3].sort());
    assertNoLoudGap(s);
  });

  // KB Q5385: a {Trash} effect can only be triggered or activated while the card is
  // in the trash. A copy sitting in hand must stay silent on the same digivolution.
  it("stays silent while the copy is in the hand, not the trash (Q5385)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: PURPLE_LV5, as: "base" }],
          hand: [{ card: BELPHEMON_X, as: "belphemon" }, { card: "BT23-097", as: "option" }, LV3],
          deck: [LV3, LV3, LV3],
        },
        1: {
          battleArea: [
            { card: LV5, as: "highest" },
            { card: LV3, as: "low" },
          ],
          security: [LV3, LV3],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const optionId = s.inst("option").instanceId;
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("belphemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(optionPrompts(s)).toBe(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(true);
    expect(board(s, 1)).toEqual([LV3]);
    assertNoLoudGap(s);
  });

  // The printed name is bracketed, so the condition is exact-name, not substring.
  it("does not trigger on a digivolution into Belphemon: Rage Mode", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: PURPLE_LV5, as: "base" }],
          trash: [{ card: "BT23-097", as: "option" }],
          hand: [{ card: BELPHEMON_RAGE, as: "rage" }, LV3, LV3],
          deck: [LV3, LV3, LV3],
        },
        1: { battleArea: [{ card: LV3, as: "low" }], security: [LV3, LV3] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const optionId = s.inst("option").instanceId;
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rage").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === BELPHEMON_RAGE);

    expect(optionPrompts(s)).toBe(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(board(s, 1)).toEqual([LV3]);
    assertNoLoudGap(s);
  });

  // KB Q5570: this card's {Trash} [Your Turn] effect and the effects that trigger on
  // digivolving into Belphemon (X Antibody) are simultaneous, so the player chooses the
  // activation order.
  it("offers the player the activation order against Belphemon's own trigger (Q5570)", async () => {
    const preferredTargets: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: PURPLE_LV5, as: "base" }],
          trash: [{ card: "BT23-097", as: "option" }],
          hand: [{ card: BELPHEMON_X, as: "belphemon" }, LV3, LV3],
          deck: [LV3, LV3, LV3],
        },
        1: {
          battleArea: [
            { card: LV5, as: "highest" },
            { card: LV3, as: "low" },
          ],
          security: [LV3, LV3],
        },
      },
      {
        autoOrderTriggers: false,
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferredTargets,
      },
    );
    await s.ready();
    preferredTargets.push(s.perm("low").topCard!.instanceId);
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("belphemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some((d) => d.req.kind === "orderTriggers"));

    const order = s.decisions.find((d) => d.req.kind === "orderTriggers")!;
    expect(order.seat).toBe(0);
    expect([...(order.req.options?.triggerCardIds ?? [])].sort()).toEqual([BELPHEMON_X, "BT23-097"].sort());

    // Resolve this card's effect first: it deletes the level 3, then Belphemon's own
    // clause deletes the remaining highest level.
    const keys = order.req.options?.triggerKeys ?? [];
    const mine = keys[(order.req.options?.triggerCardIds ?? []).indexOf("BT23-097")]!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.req.decisionId,
        response: { kind: "orderTriggers", order: [mine] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.trash.map((card) => card.cardId).sort()).toEqual([LV3, LV5].sort());
    assertNoLoudGap(s);
  });

  // ---------------------------------------------------------------------------
  // Clause 3 — "[Security] Activate this card's [Main] effects."
  // "Your opponent" is read from the security player's side: the attacker.
  // ---------------------------------------------------------------------------

  it("deletes an attacking-side Digimon that reaches the security player's hand size", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: LV3, as: "attacker", dp: 9000 },
            { card: LV4, as: "bystander" },
          ],
          deck: [LV3, LV3, LV3],
        },
        1: {
          security: [{ card: "BT23-097", as: "option" }],
          hand: [LV3, LV3, LV3, LV3],
          deck: [LV3, LV3, LV3],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    // Four cards in the security player's hand, so only the level 4 was reachable.
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([attackerId]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([LV4]);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    assertNoLoudGap(s);
  });

  // ---------------------------------------------------------------------------
  // IR shape — the clause-to-IR mapping the behavioral tests above exercise.
  // ---------------------------------------------------------------------------

  it("compiles the trash clause as an exact-name sub-trigger paying with a return to deck bottom", () => {
    const trash = compiled.effects.find((effect) => effect.trigger === "YourTurn") as never as {
      isFromTrash: boolean;
      actions: {
        kind: string;
        event: string;
        sourceFilter: { controllerDefault: string; nameOrTrait: unknown[] };
        actions: unknown[];
      }[];
    };
    expect(trash.isFromTrash).toBe(true);
    expect(trash.actions[0]!.kind).toBe("SubTrigger");
    expect(trash.actions[0]!.event).toBe("whenOneOfYoursDigivolves");
    expect(trash.actions[0]!.sourceFilter.controllerDefault).toBe("mine");
    expect(trash.actions[0]!.sourceFilter.nameOrTrait).toEqual([
      { tokens: ["Belphemon (X Antibody)"], match: "nameExact" },
    ]);
    expect(trash.actions[0]!.actions[0]).toMatchObject({
      kind: "ActivateMain",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "return", to: "deckBottom", target: { count: 1, isSelf: true } },
    });
  });

  it("compiles the Main deletion as an opponent-only level floor scaled by the controller's hand", () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main") as never as {
      actions: { kind: string; target: { count: number; filter: Record<string, unknown> } }[];
    };
    expect(main.actions[0]!.kind).toBe("Delete");
    expect(main.actions[0]!.target.count).toBe(1);
    expect(main.actions[0]!.target.filter).toMatchObject({
      controller: "opponent",
      kind: ["Digimon"],
      levelComparison: {
        op: "gte",
        value: 0,
        scaling: { per: 1, unit: "cards", filter: { controllerDefault: "mine", zone: "hand" } },
      },
    });
  });

  it("routes the Security clause through the same Main effect", () => {
    const security = compiled.effects.find((effect) => effect.trigger === "Security") as never as {
      isSecurity: boolean;
      actions: unknown[];
    };
    expect(security.isSecurity).toBe(true);
    expect(security.actions).toEqual([{ kind: "ActivateMain" }]);
  });
});
