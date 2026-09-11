import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, settleAcrossTimers, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-048.js";

const HAND_HUDIE = "BT23-037"; // Tentomon: Hudie, play cost 3, no On Play noise.
const HAND_HUDIE_TOO_EXPENSIVE = "BT23-055"; // Cyberdramon: Hudie, play cost 7.
const HAND_NON_HUDIE = "BT1-009"; // Kunemon: play cost 3, no Hudie trait.

/** End `seat`'s main phase; the turn loop auto-passes a seat with no legal main action left. */
function endMainPhase(s: ReturnType<typeof setupEngine>, seat: 0 | 1): void {
  const result = s.state.turnSeat === seat ? s.engine.applyIntent(seat, { type: "endPhase" }) : { ok: true };
  expect(result).toEqual({ ok: true });
}

function cardIds(cards: Iterable<{ cardId: string }>): string[] {
  return Array.from(cards, (card) => card.cardId);
}

describe("BT23-048 Gotsumon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-048")).toMatchObject({
      cardId: "BT23-048",
      nameEn: "Gotsumon",
      colors: ["Black", "Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Black", level: 2, memoryCost: 1 },
        { color: "Red", level: 2, memoryCost: 1 },
      ],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Rock", "Hudie", "CS"],
    });
    // The whole printed contract, clause for clause (catalog text carries U+00A0 separators).
    expect(getCardDefinition("BT23-048")?.effectText?.replace(/\u00a0/g, " ")).toBe(
      "[Digivolve] Lv.2 w/[CS] trait: Cost 0 \n\n" +
        "[On Play] Reveal the top 3 cards of your deck. Add 1 card with the [Hudie] trait and 1 Tamer " +
        "card or Option card with the [CS] trait among them to the hand. Return the rest to the bottom " +
        "of the deck.",
    );
    expect(getCardDefinition("BT23-048")?.inheritedEffectText?.replace(/\u00a0/g, " ")).toBe(
      "[When Attacking] [Once Per Turn] You may play 1 play cost 5 or lower Digimon card with the " +
        "[Hudie] trait from your hand without paying the cost. The Digimon this effect played can't " +
        "digivolve and is deleted at the end of your opponent's turn.",
    );
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["CS"], cost: 0, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("reveals 3 and adds one Hudie card plus one CS Tamer/Option, bottoming the rest", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "OnPlay") as any).actions[0];
    expect(action).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { filter: { nameOrTrait: [{ tokens: ["Hudie"], match: "trait" }] }, count: 1, to: "hand" },
        {
          filter: { kind: ["Tamer", "Option"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
          count: 1,
          to: "hand",
        },
      ],
      rest: "deckBottom",
    });
  });

  it("inherited effect optionally plays a Hudie Digimon up to play cost 5, then locks its digivolution and deletes it at opponent turn end", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenAttacking") as any;
    expect(effect).toMatchObject({ isInherited: true, frequency: "OncePerTurn" });
    const actions = effect.actions;
    expect(actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      optional: true,
      abortOnDecline: true,
      bindResultAs: "playedHudie",
      target: { filter: { playCostLte: 5, nameOrTrait: [{ tokens: ["Hudie"], match: "trait" }] } },
    });
    expect(actions[1]).toMatchObject({
      kind: "Restrict",
      restriction: "digivolve",
      duration: "permanent",
      target: { filter: { boundRef: "playedHudie" } },
    });
    expect(actions[2]).toMatchObject({ kind: "DelayedDelete", timing: "endOfOpponentTurn" });
  });

  it("publicly plays for 3 memory, adds one Hudie and one CS Tamer, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-048", as: "gotsu" }],
          deck: [
            { card: "BT23-050", as: "hudie" },
            { card: "BT22-083", as: "csTamer" },
            { card: "BT1-009", as: "remainder" },
            "BT1-010",
            "BT1-011",
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gotsu").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 3 && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(0);
    expect(cardIds(s.state.players[0]!.hand).sort()).toEqual(["BT22-083", "BT23-050"]);
    expect(cardIds(s.state.players[0]!.deck)).toEqual(["BT1-010", "BT1-011", "BT1-009"]);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-048")).toBe(true);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("bottoms all 3 when the reveal holds no Hudie card and no CS Tamer or Option", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-048", as: "gotsu" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gotsu").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck[0]?.cardId === "BT1-012");

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(cardIds(s.state.players[0]!.deck)).toEqual(["BT1-012", "BT1-013", "BT1-009", "BT1-010", "BT1-011"]);
  });

  it("publicly attacks and plays a Hudie Digimon free, leaving ineligible cards in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-050", as: "host", under: ["BT23-048"] }],
          hand: [
            { card: HAND_HUDIE, as: "eligible" },
            { card: HAND_HUDIE_TOO_EXPENSIVE, as: "tooExpensive" },
            { card: HAND_NON_HUDIE, as: "nonHudie" },
          ],
          deck: Array(6).fill("BT1-010"),
        },
        1: { security: ["BT1-009"], deck: Array(6).fill("BT1-011") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const eligibleId = s.inst("eligible").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === eligibleId) &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === eligibleId);
    expect(played).toBeDefined();
    expect(s.state.memory).toBe(3);
    expect(cardIds(s.state.players[0]!.hand).sort()).toEqual([HAND_NON_HUDIE, HAND_HUDIE_TOO_EXPENSIVE].sort());
    expect(observe(s.engine).isRestricted(played!, "digivolve")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("declines the inherited play and leaves the hand untouched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-050", as: "host", under: ["BT23-048"] }],
          hand: [{ card: HAND_HUDIE, as: "eligible" }],
          deck: Array(6).fill("BT1-010"),
        },
        1: { security: ["BT1-009"], deck: Array(6).fill("BT1-011") },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());

    expect(cardIds(s.state.players[0]!.hand)).toContain(HAND_HUDIE);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(3);
  });

  it("refuses a public digivolve onto the Digimon this effect played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-050", as: "host", under: ["BT23-048"] }],
          hand: [
            { card: HAND_HUDIE, as: "eligible" },
            { card: "BT23-041", as: "evolution" },
          ],
          deck: Array(6).fill("BT1-010"),
        },
        1: { security: ["BT1-009"], deck: Array(6).fill("BT1-011") },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] },
    );
    s.state.memory = 10;
    await s.ready();
    const eligibleId = s.inst("eligible").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === eligibleId) &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );
    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === eligibleId)!;

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: played.permanentId,
      instanceId: s.inst("evolution").instanceId,
    });
    expect(result.ok).toBe(false);
    expect(s.state.players[0]!.battleArea.find((p) => p.permanentId === played.permanentId)!.topCard!.instanceId).toBe(
      eligibleId,
    );
    expect(cardIds(s.state.players[0]!.hand)).toContain("BT23-041");
  });

  it("refuses a second inherited play in the same turn and allows it again on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-050", as: "host", under: ["BT23-048"] }],
          hand: [
            { card: HAND_HUDIE, as: "first" },
            { card: HAND_HUDIE, as: "second" },
            // Black Option matching the host's colour: the public route to a second attack in
            // the same turn.
            { card: "ST15-15", as: "unsuspender" },
          ],
          deck: Array(12).fill("BT1-010"),
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-009", "BT1-010", "BT1-011", "BT1-009"], deck: Array(12).fill("BT1-011") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;
    const firstId = s.inst("first").instanceId;
    const secondId = s.inst("second").instanceId;
    const hostId = s.perm("host").permanentId;

    const attack = (): void => {
      expect(
        s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
      ).toEqual({ ok: true });
    };

    attack();
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === firstId) &&
        !observe(s.engine).isAttacking(),
    );
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("host").isSuspended).toBe(true);

    // Unsuspend the host publicly and attack again in the SAME turn.
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended && s.state.pendingDecision === undefined);
    attack();
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === secondId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === secondId)).toBe(false);

    // A full turn cycle through the real loop: the host unsuspends in its own unsuspend phase and
    // the once-per-turn use resets.
    endMainPhase(s, 0);
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    endMainPhase(s, 1);
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.perm("host").isSuspended).toBe(false);

    attack();
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === secondId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === secondId)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps the played Digimon through the end of my turn and deletes it at the end of the opponent's turn (Q5567)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-050", as: "host", under: ["BT23-048"] }],
          hand: [{ card: HAND_HUDIE, as: "eligible" }],
          deck: Array(12).fill("BT1-010"),
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-009", "BT1-010", "BT1-011"], deck: Array(12).fill("BT1-011") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;
    const eligibleId = s.inst("eligible").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === eligibleId) &&
        !observe(s.engine).isAttacking(),
    );
    await settle(() => s.state.pendingDecision === undefined);

    // End of the CONTROLLER's turn: the played Digimon survives.
    endMainPhase(s, 0);
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === eligibleId)).toBe(true);

    // End of the OPPONENT's turn: it is deleted (Q5567).
    endMainPhase(s, 1);
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === eligibleId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === eligibleId)).toBe(true);
    // Only the Digimon this effect played is deleted; the host keeps its stack.
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT23-050"]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("uses Alliance on the Digimon the inherited effect just played (Q5316)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-020", as: "attacker", under: ["BT23-048"] }],
          hand: [{ card: HAND_HUDIE, as: "eligible" }],
          deck: Array(12).fill("BT1-010"),
        },
        1: { security: ["BT1-009", "BT1-010"], deck: Array(12).fill("BT1-011") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const eligibleId = s.inst("eligible").instanceId;
    const attackerId = s.perm("attacker").permanentId;
    const securityBefore = s.state.players[1]!.security.length;

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });

    // The inherited [When Attacking] play resolves inside the attacker's window; ＜Alliance＞
    // resolves after it and re-reads the board, so the Digimon just played is a legal ally.
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === eligibleId);
    expect(played).toBeDefined();
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: played!.permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    const ally = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === eligibleId)!;
    expect(ally.isSuspended).toBe(true);
    // ＜Alliance＞ adds its ally's DP and one extra security check to the attack.
    expect(securityBefore - s.state.players[1]!.security.length).toBe(2);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  // CR §15-4 and KB Q5257 make ＜Alliance＞ and every [When Attacking] effect on the attacker
  // simultaneous triggers that the controller orders — including a [When Attacking] effect the
  // attacker only has as an INHERITED effect from a digivolution card (BT23-048 under a
  // printed-＜Alliance＞ Seadramon). The window must name both.
  it("orders inherited [When Attacking] against Alliance in one window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-020", as: "attacker", under: ["BT23-048"] }],
          hand: [{ card: HAND_HUDIE, as: "eligible" }],
          deck: Array(12).fill("BT1-010"),
        },
        1: { security: ["BT1-009", "BT1-010"], deck: Array(12).fill("BT1-011") },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");

    const pending = s.state.pendingDecision!;
    expect(pending.kind).toBe("orderTriggers");
    expect(pending.seat).toBe(0);
    const keys = (JSON.parse(pending.payloadJson) as { triggerKeys?: string[] }).triggerKeys ?? [];
    expect(keys).toHaveLength(2);
    // One key is the printed ＜Alliance＞, the other the inherited BT23-048 play.
    expect(keys.some((key) => /Alliance/i.test(key))).toBe(true);
    expect(keys.some((key) => /Alliance/i.test(key) === false)).toBe(true);
  });

  // KB Q5568: an effect that triggers at the end of the turn and this card's end-of-opponent-turn
  // deletion are simultaneous pending processing, so the TURN PLAYER chooses the processing
  // order — here seat 1, who controls EX9-033 Kaguyamon's [End of Your Turn] effect, while the
  // deletion belongs to seat 0's Digimon. See docs/audits/BT23.md#end-turn-ordering.
  it("offers the turn player the order of the end-of-turn trigger and this deletion (Q5568)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-050", as: "host", under: ["BT23-048"] }],
          hand: [{ card: HAND_HUDIE, as: "eligible" }],
          deck: Array(12).fill("BT1-010"),
        },
        1: {
          battleArea: [{ card: "EX9-033", as: "kaguyamon" }],
          trash: ["EX9-027"],
          security: ["BT1-009"],
          deck: Array(12).fill("BT1-011"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;
    const eligibleId = s.inst("eligible").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === eligibleId) &&
        !observe(s.engine).isAttacking(),
    );
    await settle();

    endMainPhase(s, 0);
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    endMainPhase(s, 1);
    await settleAcrossTimers(() => s.state.pendingDecision?.kind === "orderTriggers");
    const pending = s.state.pendingDecision;
    expect(pending?.kind).toBe("orderTriggers");
    // The turn player orders, even though the deletion is the opponent's Digimon.
    expect(pending?.seat).toBe(1);
    const keys = (JSON.parse(pending!.payloadJson) as { triggerKeys?: string[] }).triggerKeys ?? [];
    expect(keys).toHaveLength(2);
    const deletionKey = keys.find((key) => /Delete this Digimon/i.test(key))!;
    expect(deletionKey).toBeDefined();
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: pending!.decisionId,
        response: { kind: "orderTriggers", order: [deletionKey] },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("digivolves for 0 from a Lv.2 CS Digi-Egg on both cost branches and rejects a non-CS egg", async () => {
    const implicit = setupEngine({
      0: {
        breeding: { card: "BT23-002", as: "csEgg" },
        hand: [{ card: "BT23-048", as: "gotsu" }],
        deck: ["BT1-009"],
      },
    });
    implicit.state.memory = 0;
    await implicit.ready();
    expect(
      implicit.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: implicit.perm("csEgg").permanentId,
        instanceId: implicit.inst("gotsu").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => implicit.perm("csEgg").topCard.instanceId === implicit.inst("gotsu").instanceId);
    expect(implicit.state.memory).toBe(0);

    const explicit = setupEngine({
      0: {
        breeding: { card: "BT23-002", as: "csEgg" },
        hand: [{ card: "BT23-048", as: "gotsu" }],
        deck: ["BT1-009"],
      },
    });
    explicit.state.memory = 0;
    await explicit.ready();
    expect(
      explicit.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: explicit.perm("csEgg").permanentId,
        instanceId: explicit.inst("gotsu").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => explicit.perm("csEgg").topCard.instanceId === explicit.inst("gotsu").instanceId);
    expect(explicit.state.memory).toBe(0);
    expect(explicit.perm("csEgg").stack.map((card) => card.cardId)).toEqual(["BT23-002"]);

    const illegal = setupEngine({
      0: {
        breeding: { card: "BT1-007", as: "nonCsEgg" },
        hand: [{ card: "BT23-048", as: "gotsu" }],
      },
    });
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("nonCsEgg").permanentId,
        instanceId: illegal.inst("gotsu").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
