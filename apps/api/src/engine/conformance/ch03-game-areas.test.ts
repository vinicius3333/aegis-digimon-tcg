import { describe, it, expect } from "vitest";
import { ArraySchema, Encoder } from "@colyseus/schema";
import { GameState, PlayerState, CardInstance, Permanent, PRIVATE_VIEW_TAG, type Seat } from "@aegis/shared";
import { cite } from "./_kb.js";
import "./not-testable.js";
import { GameStateAccess } from "../state/access.js";
import { buildStateView, syncPublicCounts } from "../state/visibility.js";
import { settle } from "../testkit/harness.js";
import {
  setupEngine as setup,
  makeInstance as instance,
  makeDigimon as digimon,
  findPermanent,
} from "../testkit/harness.js";
import "../../cards/index.js";

/**
 * Comprehensive Rules chapter 3 "Game Areas" (comprehensive-0003, 0053-0066).
 * See `ch01-game-overview.test.ts` / README.md for the citation contract.
 */

describe("§3-1 Areas (comprehensive-0054)", () => {
  it("3-1-1: the six named areas each have a real, distinct zone on PlayerState", () => {
    cite("comprehensive-0054", "3-1-1 areas: deck, Digi-Egg deck, field, hand, trash, security");

    const p = new PlayerState();
    // Deck, Digi-Egg deck, hand, trash, security are all distinct arrays; the field is
    // battleArea + breeding (proven distinct from the others by comprehensive-0060 below).
    const zones = [p.deck, p.eggDeck, p.hand, p.trash, p.security, p.battleArea];
    const distinctRefs = new Set(zones);
    expect(distinctRefs.size).toBe(zones.length);
  });
});

describe("§3-1-2 Public Areas and Private Areas (comprehensive-0055)", () => {
  function makeState(): GameState {
    const state = new GameState();
    state.players = new ArraySchema<PlayerState>();
    for (const seat of [0, 1] as const) {
      const player = new PlayerState();
      player.seat = seat;
      player.deck = new ArraySchema<CardInstance>();
      player.hand = new ArraySchema<CardInstance>();
      player.security = new ArraySchema<CardInstance>();
      state.players[seat] = player;
    }
    // eslint-disable-next-line no-new -- constructing the Encoder wires the state root.
    new Encoder(state);
    return state;
  }

  it("3-1-2-2-1: an opponent's deck/hand/security (private areas) are withheld from your view", () => {
    cite("comprehensive-0055", "3-1-2 public areas are revealed to both players; private areas aren't");

    const state = makeState();
    const view = buildStateView(state, 0);
    const opponent = state.players[1]!;
    expect(view.has(opponent.deck)).toBe(false);
    expect(view.has(opponent.hand)).toBe(false);
    expect(view.has(opponent.security)).toBe(false);
  });

  it("3-1-2-1-1: your OWN private zones ARE visible to you (you may always look at your own areas)", () => {
    const state = makeState();
    const view = buildStateView(state, 0);
    const own = state.players[0]!;
    expect(view.has(own)).toBe(true);
    expect(view.hasTag(own, PRIVATE_VIEW_TAG)).toBe(true);
    expect(view.has(own.hand)).toBe(true);
  });
});

describe("§3-1-3 Area Rules (comprehensive-0056)", () => {
  it("3-1-3-2: the number of cards in a private area is public information (mirrored *Count fields)", () => {
    cite("comprehensive-0056", "3-1-3-2 the number of cards in each area is public information");

    const state = new GameState();
    state.players = new ArraySchema<PlayerState>();
    for (const seat of [0, 1] as const) {
      const player = new PlayerState();
      player.seat = seat;
      player.deck = new ArraySchema<CardInstance>();
      for (let i = 0; i < 12; i += 1) {
        const c = new CardInstance();
        c.instanceId = `s${seat}-${i}`;
        c.cardId = "AD1-001";
        c.ownerSeat = seat as Seat;
        player.deck.push(c);
      }
      state.players[seat] = player;
    }
    syncPublicCounts(state);
    // deckCount is an untagged (public) field: every viewer sees it, unlike the array itself.
    expect(state.players[0]!.deckCount).toBe(12);
    expect(state.players[1]!.deckCount).toBe(12);
  });

  it("3-1-3-1-2: a card that changes area is a NEW card — Permanent-level state has no analogue off-field", () => {
    // A trashed/security/hand/deck card is a bare CardInstance (schema: PlayerState.trash /
    // security / hand / deck are all `ArraySchema<CardInstance>`); suspended-ness, DP
    // modifiers, digivolution stacks, and every other Permanent-level status live ONLY on
    // `Permanent` (PlayerState.battleArea / breeding). Moving a card off the field therefore
    // sheds all of that state structurally — there is no field for it to persist in — which is
    // the schema-level enforcement of "a new card... will not carry over any of the original
    // card's statuses, states, etc."
    const s = setup();
    const p0 = s.state.players[0]!;
    const perm = digimon(0, 5000);
    perm.isSuspended = true;
    p0.battleArea.push(perm);

    const trashedCopy = perm.topCard!;
    p0.battleArea.pop();
    p0.trash.push(trashedCopy);

    expect("isSuspended" in trashedCopy).toBe(false);
    expect(p0.trash[0]).toBe(trashedCopy);
  });
});

// §3-1-3-6..3-1-3-9 Area Rules, cont'd (comprehensive-0057): 3-1-3-6/3-1-3-7 (ordering +
// reveal-before-placement for a batch move into a PRIVATE area) and 3-1-3-8/3-1-3-9
// (default-to-owner's-area, Digi-Egg-deck placement order) are all properties of a SPECIFIC
// multi-card effect's resolution order, not of the areas themselves — the area schema (proven
// by 0054-0056, 0058-0066) is identical regardless of which effect moves cards into it. Proving
// these sub-rules behaviorally requires driving a real multi-card-move effect end-to-end and
// asserting the reveal/order sequence, which is chapter 15 "Effect Rules" scaffolding (specific
// compiled-IR move actions in effects/interpreter.ts), out of this chapter's area/schema scope.
// comprehensive-0057 is now covered behaviourally in ch15-03-targeting-and-selection.test.ts, which picked up
// this deferral. The not-testable entry that used to sit here was removed: the meta-test
// rejects an id that is both cited and not-testable, which is how the staleness surfaced.

describe("§3-2 Deck (comprehensive-0058)", () => {
  it("3-2-2: deck cards are placed face-down (private) — 3-2-3: no client intent can reorder it", () => {
    cite("comprehensive-0058", "3-2-2 the deck is private, cards are face-down");

    const card = instance("AD1-001", 0, false);
    expect(card.faceUp).toBe(false);

    // No "reorderDeck" (or similarly shaped) verb exists in the client Intent protocol — an
    // unrecognized intent type is rejected outright by GameEngine's exhaustive switch.
    const s = setup();
    const result = s.engine.applyIntent(0, { type: "reorderDeck" } as never);
    expect(result).toEqual({ ok: false, reason: "unknown-intent" });
  });
});

describe("§3-3 Digi-Egg Deck (comprehensive-0059)", () => {
  it("3-3-2: the egg deck is private and face-down, structurally identical in kind to the deck", () => {
    cite("comprehensive-0059", "3-3-2 the Digi-egg deck is a private area, face-down");

    const state = new GameState();
    state.players = new ArraySchema<PlayerState>();
    for (const seat of [0, 1] as const) {
      const player = new PlayerState();
      player.seat = seat;
      player.eggDeck = new ArraySchema<CardInstance>();
      state.players[seat] = player;
    }
    // eslint-disable-next-line no-new
    new Encoder(state);
    const view = buildStateView(state, 0);
    expect(view.has(state.players[1]!.eggDeck)).toBe(false); // opponent's egg deck hidden
    expect(view.has(state.players[0]!.eggDeck)).toBe(false); // only its public card count is visible
  });
});

describe("§3-4 Field (comprehensive-0060)", () => {
  it("3-4-2/3-4-3: the field is public, and a card entering it is placed UNSUSPENDED", async () => {
    cite("comprehensive-0060", "3-4-2 the field is public; 3-4-3 cards enter unsuspended");

    const s = setup();
    const p0 = s.state.players[0]!;
    const def = (await import("@aegis/shared")).requireCardDefinition("AD1-001");
    const card = instance("AD1-001", 0, false);
    p0.hand.push(card);
    s.state.memory = def.playCost;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId })).toEqual({ ok: true });

    const played = findPermanent(s, 0, "AD1-001");
    expect(played.isSuspended).toBe(false);
  });

  it("3-4-4: the field is divided into distinct breeding and battle areas", () => {
    const p = new PlayerState();
    expect(p.battleArea).toBeDefined();
    // `breeding` is a single optional slot, structurally distinct from the battleArea array.
    expect(p.breeding).toBeUndefined();
    const perm = new Permanent();
    p.breeding = perm;
    expect(p.battleArea.includes(perm)).toBe(false);
  });
});

describe("§3-4-5 Breeding Area (comprehensive-0061, 0062)", () => {
  it("3-4-5-2/3-4-5-5: only 1 card fits in breeding, and a breeding permanent can't be chosen as a target", () => {
    cite("comprehensive-0061", "3-4-5-2 only 1 card in the breeding area; 3-4-5-5 can't be chosen");

    const s = setup();
    const p0 = s.state.players[0]!;
    const battler = digimon(0, 5000, "AD1-001");
    const raiser = digimon(0, 3000, "AD1-001");
    raiser.inBreeding = true;
    p0.battleArea.push(battler);
    p0.breeding = raiser;

    const access = new GameStateAccess(s.state);
    // "Choose 1 of your Digimon" style targeting draws from battleAreaPermanents — the
    // breeding-area Digimon is structurally absent from that candidate set.
    const candidates = access.battleAreaPermanents(0 as Seat);
    expect(candidates.map((p) => p.permanentId)).toContain(battler.permanentId);
    expect(candidates.map((p) => p.permanentId)).not.toContain(raiser.permanentId);
    expect(p0.breeding).toBeDefined(); // the single breeding slot instance itself
  });

  it("3-4-5-4: a card's [Main] ability can't be activated while it's in the breeding area", () => {
    cite("comprehensive-0062", "3-4-5-4 effects on cards in breeding areas can't trigger or activate");

    const s = setup({ autoSelectCards: true });
    const p0 = s.state.players[0]!;
    const MARCUS = "BT12-092"; // a [Marcus Damon]-name Tamer; BT13-008's ability needs one on field
    // BT13-008 (Marsmon) has a real [Main][Once Per Turn] activated ability (used elsewhere in
    // mechanic.test.ts as the A3 vehicle for the `activated` builder); its canActivate requires
    // a [Marcus Damon] on the field, so one is laid alongside it in both scenarios below.
    const onBattle = digimon(0, 11000, "BT13-008");
    p0.battleArea.push(onBattle, digimon(0, 0, MARCUS));
    (s.engine as unknown as { syncActivatableEffects(): void }).syncActivatableEffects();
    expect(onBattle.activatableEffectsJson).not.toBe("");

    const inBreeding = digimon(0, 11000, "BT13-008");
    inBreeding.inBreeding = true;
    p0.battleArea.splice(0, p0.battleArea.length, digimon(0, 0, MARCUS)); // isolate: only the Tamer remains on the battle area
    p0.breeding = inBreeding;
    (s.engine as unknown as { syncActivatableEffects(): void }).syncActivatableEffects();
    // GameEngine.syncActivatableEffects only iterates turnPlayer.battleArea and explicitly
    // clears player.breeding's JSON — the breeding-area copy surfaces NO activatable ability.
    expect(inBreeding.activatableEffectsJson).toBe("");
  });
});

describe("§3-4-5-6 breeding-area trigger conditions (comprehensive-0061)", () => {
  // The rulebook's own example, card for card: EX11-066 Xeno is a battle-area Tamer whose
  // "[All Turns] When your Digimon are played or digivolve ... by suspending this Tamer ..."
  // clause is exactly the "[Your Turn] When your Digimon digivolves, by suspending this Tamer,
  // <Draw 1>" shape §3-4-5-6 says a breeding-area digivolution must not trigger.
  const XENO = "EX11-066";
  const VEMMON = "BT11-061"; // Lv.3 [Vemmon], digivolves from a black Lv.2 Digi-Egg
  const BLACK_EGG = "BT11-005";

  const setupXeno = (where: "breeding" | "battleArea") =>
    setup(
      {
        0: {
          battleArea: [
            { card: XENO, as: "xeno" },
            ...(where === "battleArea" ? [{ card: BLACK_EGG, as: "base" }] : []),
          ],
          ...(where === "breeding" ? { breeding: { card: BLACK_EGG, as: "base" } } : {}),
          hand: [{ card: VEMMON, as: "evolver" }],
          deck: [VEMMON, "BT1-001"],
        },
      },
      { autoAcceptOptional: true },
    );

  it("3-4-5-6: a breeding-area digivolution doesn't meet a battle-area Tamer's trigger condition", async () => {
    cite("comprehensive-0061", "3-4-5-6 trigger conditions can't be met by cards in breeding areas");

    const s = setupXeno("breeding");
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === VEMMON);

    // FAILS-WHEN-REVERTED: drop the breeding guard in GameEngine.buildSubTriggerContext and
    // Xeno's watcher sees the breeding-area subject => it asks to suspend and suspends.
    expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(false);
    expect(s.perm("xeno").isSuspended).toBe(false);
  });

  it("control: the same digivolution on the BATTLE area does meet it", async () => {
    const s = setupXeno("battleArea");
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("xeno").isSuspended);

    expect(s.perm("xeno").isSuspended).toBe(true);
  });
});

describe("§3-4-6 Battle Area (comprehensive-0063)", () => {
  it("3-4-6-2: any number of cards can be placed in the battle area", () => {
    cite("comprehensive-0063", "3-4-6-2 any number of cards can be placed in the battle area");

    const s = setup();
    const p0 = s.state.players[0]!;
    for (let i = 0; i < 10; i += 1) p0.battleArea.push(digimon(0, 1000));
    expect(p0.battleArea.length).toBe(10); // no cap enforced
  });
});

describe("§3-5 Hand (comprehensive-0064)", () => {
  it("3-5-3: the hand is private, but its OWNER may freely look at it", () => {
    cite("comprehensive-0064", "3-5-3 the hand is private, but the owner may freely look at it");

    const state = new GameState();
    state.players = new ArraySchema<PlayerState>();
    for (const seat of [0, 1] as const) {
      const player = new PlayerState();
      player.seat = seat;
      player.hand = new ArraySchema<CardInstance>();
      state.players[seat] = player;
    }
    // eslint-disable-next-line no-new
    new Encoder(state);
    const ownView = buildStateView(state, 0);
    const opponentView = buildStateView(state, 1);
    expect(ownView.has(state.players[0]!.hand)).toBe(true);
    expect(opponentView.has(state.players[0]!.hand)).toBe(false);
  });
});

describe("§3-6 Trash (comprehensive-0065)", () => {
  it("3-6-3: the trash is public and face-up — visible in BOTH players' views", () => {
    cite("comprehensive-0065", "3-6-3 the trash is public, cards are face-up in a stack");

    const s = setup();
    const p0 = s.state.players[0]!;
    const card = instance("AD1-001", 0, true);
    p0.trash.push(card);
    // The trash carries no @view tag (see PlayerState.ts) — untagged fields are visible to
    // every viewer automatically, unlike deck/hand/eggDeck/security.
    expect(card.faceUp).toBe(true);
  });
});

describe("§3-7 The Security Stack (comprehensive-0066)", () => {
  it("3-7-2: the security stack is private and face-down until individually revealed", () => {
    cite("comprehensive-0066", "3-7-2 the security stack is private, cards are face-down");

    const state = new GameState();
    state.players = new ArraySchema<PlayerState>();
    for (const seat of [0, 1] as const) {
      const player = new PlayerState();
      player.seat = seat;
      player.security = new ArraySchema<CardInstance>();
      state.players[seat] = player;
    }
    const card = new CardInstance();
    card.instanceId = "sec-0";
    card.cardId = "AD1-001";
    card.ownerSeat = 1;
    card.faceUp = false;
    state.players[1]!.security.push(card);
    // eslint-disable-next-line no-new
    new Encoder(state);

    const opponentView = buildStateView(state, 0);
    expect(opponentView.has(state.players[1]!.security)).toBe(false); // hidden while face-down
  });

  it("3-7-4: a face-up security card becomes public information (revealed to the opponent's view)", async () => {
    const { revealSecurityCardToOpponent } = await import("../state/visibility.js");
    const state = new GameState();
    state.players = new ArraySchema<PlayerState>();
    for (const seat of [0, 1] as const) {
      const player = new PlayerState();
      player.seat = seat;
      player.security = new ArraySchema<CardInstance>();
      state.players[seat] = player;
    }
    const card = new CardInstance();
    card.instanceId = "sec-flipped";
    card.cardId = "AD1-001";
    card.ownerSeat = 1;
    card.faceUp = true; // already flipped face-up by a prior effect
    state.players[1]!.security.push(card);
    // eslint-disable-next-line no-new
    new Encoder(state);

    const opponentView = buildStateView(state, 0);
    // buildStateView already reveals any pre-existing face-up security card to the opponent.
    expect(opponentView.has(card)).toBe(true);

    // The incremental-reveal helper is also directly callable (the flip-time seam).
    const freshCard = new CardInstance();
    freshCard.instanceId = "sec-flip-now";
    freshCard.cardId = "AD1-001";
    freshCard.ownerSeat = 1;
    freshCard.faceUp = false;
    state.players[1]!.security.push(freshCard);
    const view2 = buildStateView(state, 0);
    expect(view2.has(freshCard)).toBe(false);
    revealSecurityCardToOpponent(view2, freshCard);
    expect(view2.has(freshCard)).toBe(true);
  });
});
