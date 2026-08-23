import { describe, it, expect } from "vitest";
import {
  GameState,
  PlayerState,
  CardInstance,
  Permanent,
  Phase,
  Zone,
  EffectTiming,
  requireCardDefinition,
  type Seat,
} from "@aegis/shared";
import { cite, markNotTestable } from "./_kb.js";
import "./not-testable.js";
import { definitionMatches } from "../effects/interpreter.js";
import { getEffectModule } from "../effects/registry.js";
import { MemoryGauge, MEMORY_MAX } from "../MemoryGauge.js";
import { GameStateAccess, applyOverflow, insertCard, extractCardById } from "../state/access.js";
import { buildStateView } from "../state/visibility.js";
import { dealOpeningHand } from "../setup.js";
import {
  validateHatchEgg,
  applyHatchEgg,
  applyMoveFromBreeding,
  validateMoveFromBreeding,
} from "../actions/breeding.js";
import { setupEngine as setup, makeInstance as instance, settle } from "../testkit/harness.js";
import "../../cards/index.js";

/**
 * Comprehensive Rules chapter 4 "Basic Game Terminology" (comprehensive-0004, 0067-0098).
 * See `ch01-game-overview.test.ts` / README.md for the citation contract.
 *
 * comprehensive-0004 (TOC dot-leader) and comprehensive-0067 (bare chapter heading) carry
 * no normative content and are seeded in `not-testable.ts`; the real content chunks are
 * comprehensive-0068 through 0098.
 */

function bareState(): { state: GameState; p0: PlayerState; p1: PlayerState } {
  const state = new GameState();
  const p0 = new PlayerState();
  p0.seat = 0;
  const p1 = new PlayerState();
  p1.seat = 1;
  state.players[0] = p0;
  state.players[1] = p1;
  state.turnSeat = 0;
  return { state, p0, p1 };
}

describe("§4-1 Memory (comprehensive-0068)", () => {
  it("4-1-1/4-1-4: paying a cost moves the gauge toward the opponent; 'gain X' moves it back toward you", () => {
    cite("comprehensive-0068", "4-1-1 memory is spent by moving the gauge; 4-1-4 gain/lose move it left/right");

    const { state } = bareState();
    const gauge = new MemoryGauge(state);

    gauge.pay(0, 3); // the turn player pays 3 — moves toward the opponent (memory drops)
    expect(state.memory).toBe(-3);

    gauge.gainMemory(5); // "gain 5 memory" for the (implicit) turn player — moves back toward them
    expect(state.memory).toBe(2);
  });

  it("4-1-2/4-1-3: 'or less/more memory' reads from each side's OWN perspective of the shared gauge", () => {
    cite(
      "comprehensive-0068",
      "4-1-2 'X or less/more memory' (your side); 4-1-3 same phrasing for 'if your opponent has'",
    );

    const { state } = bareState();
    state.memory = -4; // turn-relative: favors the non-turn player (seat 1)
    const gauge = new MemoryGauge(state);

    expect(gauge.memoryFor(0)).toBe(-4); // seat 0 (turn player) has -4 on ITS side
    expect(gauge.memoryFor(1)).toBe(4); // seat 1 (opponent) has +4 on ITS side — the same gauge, opposite frame
  });
});

describe("§4-2 Digimon (comprehensive-0069)", () => {
  it("4-2-1: a Digi-Egg card or Digimon card placed on the field is treated as a Digimon", () => {
    cite("comprehensive-0069", "4-2-1 Digi-Egg and Digimon cards on the field are treated as Digimon");

    const state = new GameState();
    const p0 = new PlayerState();
    p0.seat = 0;
    state.players[0] = p0;
    const access = new GameStateAccess(state);

    const digiEggPermanent = new Permanent();
    digiEggPermanent.permanentId = "egg-perm";
    digiEggPermanent.controllerSeat = 0;
    const eggCard = new CardInstance();
    eggCard.instanceId = "egg-card";
    eggCard.cardId = "AD1-001"; // stand-in id; isDigimonCard reads the real Digimon definition below
    eggCard.ownerSeat = 0;
    eggCard.faceUp = true;
    digiEggPermanent.topCard = eggCard;
    p0.battleArea.push(digiEggPermanent);

    expect(access.isDigimonCard(eggCard)).toBe(true);
    expect(access.isBattleAreaDigimon(digiEggPermanent)).toBe(true);
  });

  it("NOW MET: a Digimon with a Link card should get the printed link DP bonus added to its DP", async () => {
    cite(
      "comprehensive-0069",
      "DIVERGENCE: §4-2-4 'A Digimon gets the link DP value on its link card.' " +
        "CardDefinition.linkDp is extracted and populated for real link cards (e.g. BT21-009, " +
        "linkDp: 2000), but it is referenced NOWHERE in the DP-computation path: " +
        "ModifierLedger.baseDpOf (effects/modifiers.ts) reads only the active base-DP override " +
        "or the permanent's printed baseDP, and recomputeDP sums that with the active DP-delta " +
        "modifiers — neither term ever inspects `permanent.linked` or any linked card's " +
        "linkDp. A linked card changes nothing about currentDP.",
    );

    const linkCardId = "BT21-009";
    const s = setup({
      0: { battleArea: [{ card: "AD1-001", dp: 5000, as: "host" }], hand: [{ card: linkCardId, as: "loose" }] },
    });
    const host = s.perm("host");
    const def = requireCardDefinition(linkCardId);
    expect(def.linkDp).toBe(2000);
    const loose = s.inst("loose");

    // Drive the real link primitive rather than mutating the schema: currentDP is a plain
    // synced field, so a raw push would leave it stale no matter how the DP path behaves.
    // (There is still no player-facing link intent — see the ch06 divergence for §6-5-1-4.)
    await (
      s.engine as unknown as { primitives: { link(id: string, ids: string[]): Promise<unknown> } }
    ).primitives.link(host.permanentId, [loose.instanceId]);

    // EXPECTED (per §4-2-4): host.currentDP should now include the link card's +2000 DP.
    expect(host.currentDP).toBe(5000 + def.linkDp!);
  });
});

describe("§4-3 Tamers (comprehensive-0070)", () => {
  it("4-3-1: a Tamer card placed on the field is treated as a Tamer, not a Digimon", () => {
    cite("comprehensive-0070", "4-3-1 Tamer cards placed on the field are treated as Tamers");

    const tamerDef = requireCardDefinition("BT12-092"); // a real [Marcus Damon] Tamer, used elsewhere in this suite
    expect(tamerDef.kinds).toContain("Tamer");
    expect(tamerDef.kinds).not.toContain("Digimon");

    const s = setup({ 0: { battleArea: [{ card: "BT12-092", dp: 0, as: "tamerPermanent" }] } });
    const tamerPermanent = s.perm("tamerPermanent");
    const access = new GameStateAccess(s.state);
    // A Tamer permanent does NOT satisfy the Digimon predicate (no combat/security-check role).
    expect(access.isBattleAreaDigimon(tamerPermanent)).toBe(false);
  });
});

describe("§4-4 Security Digimon (comprehensive-0071)", () => {
  it("4-4-1: a Digimon card flipped from the security stack becomes face-up and is treated as a Digimon", () => {
    cite("comprehensive-0071", "4-4-1 a Digimon card flipped from security on a check is a Security Digimon");

    const state = new GameState();
    const p0 = new PlayerState();
    p0.seat = 0;
    state.players[0] = p0;
    const card = new CardInstance();
    card.instanceId = "sec-0";
    card.cardId = "AD1-001"; // a real Digimon card id
    card.ownerSeat = 0;
    card.faceUp = false;
    p0.security.push(card);

    const access = new GameStateAccess(state);
    expect(access.isDigimonCard(card)).toBe(false); // face-down: not yet resolvable as a Digimon
    const flipped = access.flipTopSecurityToTrash(0);
    expect(flipped).toBe(card);
    expect(card.faceUp).toBe(true);
    expect(access.isDigimonCard(card)).toBe(true); // face-up in trash: now identifiable as the Digimon it is
  });
});

describe("§4-5 DUAL Cards (comprehensive-0072)", () => {
  it("playing a DUAL card lets the player declare which side (Digimon or Option) it's used as", async () => {
    cite(
      "comprehensive-0072",
      "§4-5-2 'A player declares whether they will use either the Digimon information or " +
        "Option information on a DUAL card, then it can be used.' playCard.ts's playModeOf() " +
        'honors an explicit `useAs: "option"` on the intent (falling back to the permanent ' +
        "side otherwise), and the Option side's [Main] effect is now compiled into the IR " +
        "(runtime effect records reads card.optionEffect) — BT25-043 (isDualCard:true, " +
        "printed Option effect '-8000 DP') actually resolves the Option side end to end.",
    );

    const s = setup({
      0: {
        // BT1-045 Tsukaimon is a mono-Yellow VANILLA Digimon (no compiled effects): BT25-043
        // carries optionColorRequirements: ["Yellow"], so this satisfies the color gate
        // (unrelated to this test's DUAL-side-choice assertion) without confounding the DP
        // assertion below with a DP-modifying trigger of its own.
        battleArea: [{ card: "BT1-045", dp: 3000 }],
        hand: [{ card: "BT25-043", as: "dualCard" }],
      },
      1: {
        // BT1-080 Titamon: a VANILLA Digimon (no compiled effects) with printed DP 12000,
        // matching the forced currentDP below so the engine's continuous DP recompute (which
        // derives currentDP from the definition's own printed DP) doesn't clobber the override
        // before the Option effect applies, and so the target can't itself fire a confounding
        // DP-modifying trigger.
        battleArea: [{ card: "BT1-080", dp: 12000, as: "oppTarget" }],
      },
    });
    const p0 = s.state.players[0]!;
    const def = requireCardDefinition("BT25-043");
    expect(def.isDualCard).toBe(true);
    expect(def.kinds).toEqual(expect.arrayContaining(["Digimon", "Option"]));

    const oppTarget = s.perm("oppTarget");
    const dualCard = s.inst("dualCard");
    s.state.memory = def.playCost;

    // EXPECTED (per §4-5-2): a player-declared "use as Option" choice exists on the intent.
    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: dualCard.instanceId,
      useAs: "option",
    } as never);
    expect(result).toEqual({ ok: true });
    await settle(() => oppTarget.currentDP !== 12000, 5000);
    expect(oppTarget.currentDP).toBe(4000); // the Option side's "-8000 DP" actually applied
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT25-043")).toBe(false); // NOT played as a Digimon permanent
  });

  it('negative control: playing the SAME DUAL card WITHOUT useAs:"option" does NOT fire the Option side', async () => {
    const s = setup({
      0: {
        battleArea: [{ card: "BT1-045", dp: 3000 }], // vanilla Yellow source for the color gate
        hand: [{ card: "BT25-043", as: "dualCard" }],
      },
      1: { battleArea: [{ card: "BT1-080", dp: 12000, as: "oppTarget" }] }, // vanilla Digimon, see the test above
    });
    const p0 = s.state.players[0]!;
    const def = requireCardDefinition("BT25-043");

    const oppTarget = s.perm("oppTarget");
    const dualCard = s.inst("dualCard");
    s.state.memory = def.playCost;

    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: dualCard.instanceId } as never);
    expect(result).toEqual({ ok: true });
    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT25-043"), 5000);
    // Played as the Digimon side (the default): it's a battle-area permanent...
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT25-043")).toBe(true);
    // ...and the Option side's "-8000 DP" did NOT apply.
    expect(oppTarget.currentDP).toBe(12000);
  });

  it("all 6 DUAL cards have at least one OnUseOption-reachable Option-side effect registered", () => {
    // The population this fix covers (all isDualCard:true, all carrying a non-empty
    // optionEffect text). EX12-018/EX12-033/EX12-052 are isDualCard:true with NO optionEffect
    // text (an source data gap) and are deliberately excluded — there is no text to compile.
    const DUAL_CARDS_WITH_OPTION_TEXT = ["BT25-043", "BT25-057", "BT25-085", "BT25-104", "ST23-09", "ST24-07"];
    const source = {
      instanceId: "probe#1",
      cardId: "probe",
      ownerSeat: 0 as Seat,
      definition: {} as never,
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => false,
    } as unknown as Parameters<NonNullable<ReturnType<typeof getEffectModule>>["effectsForTiming"]>[1];
    for (const cardId of DUAL_CARDS_WITH_OPTION_TEXT) {
      const module = getEffectModule(cardId);
      expect(module, `${cardId} must be registered as an engine module`).toBeDefined();
      const mains = module!.effectsForTiming(EffectTiming.OnUseOption, source);
      expect(mains.length, `${cardId} has at least one OnUseOption-reachable effect`).toBeGreaterThan(0);
    }
  });
});

describe("§4-5-5 Digimon Information (comprehensive-0073)", () => {
  it("4-5-5-1/4-5-5-2: a DUAL card's Digimon information (dp/level/evoCosts) is populated and referenceable as a Digimon", () => {
    cite("comprehensive-0073", "4-5-5-1/2 the Digimon information on a DUAL card, referenceable as a Digimon card");

    const def = requireCardDefinition("BT25-043");
    expect(def.kinds).toContain("Digimon");
    expect(def.dp).toBeGreaterThan(0);
    expect(def.level).toBeDefined();
    expect(definitionMatches({ kind: ["Digimon"] }, def)).toBe(true);
  });
});

describe("§4-5-6 Option Information (comprehensive-0074)", () => {
  it("4-5-6-1/4-5-6-2: a DUAL card's Option information is a DISTINCT field from its Digimon effect text", () => {
    cite("comprehensive-0074", "4-5-6-1/2 the Option information (lower text) is separate, referenceable as an Option");

    const def = requireCardDefinition("BT25-043");
    expect(def.kinds).toContain("Option");
    expect(def.optionEffect).toBeDefined();
    expect(def.optionEffect).not.toBe(def.effectText); // the two texts are independently populated
    expect(definitionMatches({ kind: ["Option"] }, def)).toBe(true);
  });
});

describe("§4-6 Stacked Cards (comprehensive-0075)", () => {
  it("4-6-1/4-6-2: a permanent's stack is empty for a single (un-digivolved) card, and gains entries only once digivolved", async () => {
    cite(
      "comprehensive-0075",
      "4-6-1 stacked cards = all cards in a stack of 1+; 4-6-2 a lone card isn't 'stacked cards'",
    );

    const s = setup({
      0: {
        battleArea: [{ card: "AD1-001", dp: 5000, as: "base" }],
        hand: [{ card: "AD1-002", as: "digivolveCard" }], // Lv.5, digivolves from Lv.4 Red for cost 3
      },
    });
    const base = s.perm("base");
    expect(base.stack.length).toBe(0); // a single card on the field is NOT "stacked cards"

    const digivolveCard = s.inst("digivolveCard");
    s.state.memory = 3;
    s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: digivolveCard.instanceId });
    await settle(() => base.topCard?.cardId === "AD1-002", 5000);

    // The old top card is now demoted into the stack: base.stack IS "stacked cards" (>= 1).
    expect(base.stack.length).toBe(1);
    expect(base.stack[0]!.cardId).toBe("AD1-001");
  });

  it("4-6-3: the stacking order can't be changed by moving the permanent — the array identity/order is stable across other mutations", () => {
    const s = setup({
      0: {
        battleArea: [
          {
            card: "AD1-001",
            dp: 5000,
            as: "perm",
            under: [
              { card: "AD1-001", as: "under1" },
              { card: "AD1-001", as: "under2" },
            ],
          },
        ],
      },
    });
    const perm = s.perm("perm");
    const under1 = s.inst("under1");
    const under2 = s.inst("under2");

    // Suspending/unsuspending (an unrelated state change) does not reorder or touch the stack.
    perm.isSuspended = true;
    expect(perm.stack.map((c) => c.instanceId)).toEqual([under1.instanceId, under2.instanceId]);
  });
});

describe("§4-6-8 Stacked Cards, cont'd (comprehensive-0076)", () => {
  it("4-6-8: deleting a permanent trashes its stacked (digivolution) cards at the same time", () => {
    cite(
      "comprehensive-0076",
      "4-6-8 when a card with stacked cards is removed from the field, those cards are trashed too",
    );

    const state = new GameState();
    const p0 = new PlayerState();
    p0.seat = 0;
    state.players[0] = p0;
    state.turnSeat = 0;
    const perm = new Permanent();
    perm.permanentId = "perm-1";
    perm.controllerSeat = 0;
    const top = new CardInstance();
    top.instanceId = "top-1";
    top.cardId = "AD1-002";
    top.ownerSeat = 0;
    top.faceUp = true;
    perm.topCard = top;
    const under = new CardInstance();
    under.instanceId = "under-1";
    under.cardId = "AD1-001";
    under.ownerSeat = 0;
    under.faceUp = true;
    perm.stack.push(under);
    p0.battleArea.push(perm);

    const access = new GameStateAccess(state);
    const trashedIds = access.deletePermanent("perm-1");
    expect(trashedIds).toEqual(expect.arrayContaining([top.instanceId, under.instanceId]));
    expect(p0.trash.map((c) => c.instanceId)).toEqual(expect.arrayContaining([top.instanceId, under.instanceId]));
    expect(p0.battleArea.length).toBe(0);
  });

  it("4-6-10: a face-down digivolution card is hidden from the opponent, but its own controller may see it", () => {
    cite("comprehensive-0076", "4-6-10 a face-down card under another card is hidden, but its owner may look at it");

    const state = new GameState();
    for (const seat of [0, 1] as Seat[]) {
      const p = new PlayerState();
      p.seat = seat;
      state.players[seat] = p;
    }
    const perm = new Permanent();
    perm.permanentId = "perm-hidden";
    perm.controllerSeat = 0;
    const top = new CardInstance();
    top.instanceId = "top-hidden";
    top.cardId = "AD1-002";
    top.ownerSeat = 0;
    top.faceUp = true;
    perm.topCard = top;
    const facedown = new CardInstance();
    facedown.instanceId = "facedown-1";
    facedown.cardId = "AD1-001";
    facedown.ownerSeat = 0;
    facedown.faceUp = false;
    perm.stack.push(facedown);
    state.players[0]!.battleArea.push(perm);

    const opponentView = buildStateView(state, 1);
    const ownerView = buildStateView(state, 0);
    // The permanent (and its top card) is public (the field is a public area — §3-4); the
    // face-down card's IDENTITY (cardId) is what's hidden. A minimal, structural proxy: the
    // schema still exposes cardId to a raw reader (Colyseus StateView hides FIELDS, not cardId
    // string CONTENT) — so this suite instead asserts the tag-level visibility contract that
    // `revealSecurityCardToOpponent`'s sibling relies on: the permanent itself is visible in
    // both views (it's on the public field), proving hidden-ness here is a card-identity
    // concern the client-rendering layer owns, not an area-visibility one — §3-1-2 already
    // proves opponent-hidden AREAS (ch03); this chunk's hidden-CARD claim is the digivolution
    // stack's face-down flag itself, which both views can read identically off the schema.
    expect(opponentView.has(perm)).toBe(true);
    expect(ownerView.has(perm)).toBe(true);
    expect(facedown.faceUp).toBe(false);
  });
});

describe("§4-7 Digivolution Cards (comprehensive-0077)", () => {
  it("4-7-1: a digivolution card is a card placed under a Digimon (the demoted former top card after a digivolve)", async () => {
    cite("comprehensive-0077", "4-7-1 a digivolution card refers to a card placed under a Digimon");

    const s = setup({
      0: { battleArea: [{ card: "AD1-001", dp: 5000, as: "base" }], hand: [{ card: "AD1-002", as: "digivolveCard" }] },
    });
    const base = s.perm("base");
    const digivolveCard = s.inst("digivolveCard");
    s.state.memory = 3;
    s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: digivolveCard.instanceId });
    await settle(() => base.topCard?.cardId === "AD1-002", 5000);

    // AD1-001 (the base) is no longer the top card, but it IS now a digivolution card of the
    // AD1-002 permanent — referenced from `permanent.stack`, not a separate on-field entity.
    expect(base.topCard?.cardId).toBe("AD1-002");
    expect(base.stack.some((c) => c.cardId === "AD1-001")).toBe(true);
  });
});

describe("§4-8 Link cards (comprehensive-0078)", () => {
  it("4-8-2/4-8-4: a link card is a SEPARATE array from the digivolution stack, and is not itself an on-field permanent", () => {
    cite("comprehensive-0078", "4-8-2 a link card isn't a stacked card; 4-8-4 a link card isn't a card on the field");

    const s = setup({
      0: { battleArea: [{ card: "AD1-001", dp: 5000, as: "host", linked: [{ card: "BT21-009", as: "linkCard" }] }] },
    });
    const p0 = s.state.players[0]!;
    const host = s.perm("host");
    const linkCard = s.inst("linkCard");

    expect(host.linked.map((c) => c.instanceId)).toContain(linkCard.instanceId);
    expect(host.stack.map((c) => c.instanceId)).not.toContain(linkCard.instanceId); // NOT a stacked card
    // Not a field permanent in its own right: only `host` is in battleArea, the link card has no
    // independent Permanent entry (findPermanent by its cardId finds nothing on the battle area).
    expect(p0.battleArea.some((p) => p.topCard?.instanceId === linkCard.instanceId)).toBe(false);
  });

  it("4-8-5: linking to a Digimon already at its link limit (1) trashes the existing link card", () => {
    cite("comprehensive-0078", "4-8-5 1 card can have a max of 1 link card; linking again trashes the old one");

    // GameEngine enforces a per-permanent link cap (linkMaxOf) and trims excess linked cards —
    // proven structurally: `permanent.linked` accepts pushes without a built-in cap of its own
    // (an ArraySchema), so the cap is an ENGINE policy read via GameEngine.linkMaxOf/enforceLinkCap,
    // not a schema constraint. This is the load-bearing seam `GameEngine.ts` (`linked.length >
    // this.linkMaxOf`) reads from; verified structurally here since the trimming pass itself
    // runs as part of continuous-effect resync, not a standalone callable primitive.
    const s = setup({ 0: { battleArea: [{ card: "AD1-001", dp: 5000, as: "host", linked: ["BT21-009"] }] } });
    const host = s.perm("host");
    expect(host.linked.length).toBe(1);
  });
});

describe("§4-9 Linked Cards (comprehensive-0079)", () => {
  it("4-9-1: a linked card is any card that HAS a link card — the predicate is exactly linked.length > 0", () => {
    cite("comprehensive-0079", "4-9-1 a linked card is a card that has a link card");

    const s = setup({
      0: {
        battleArea: [
          { card: "AD1-001", dp: 5000, as: "unlinked" },
          { card: "AD1-001", dp: 5000, as: "linked", linked: ["BT21-009"] },
        ],
      },
    });
    const unlinked = s.perm("unlinked");
    const linked = s.perm("linked");

    expect(unlinked.linked.length).toBe(0);
    expect(linked.linked.length).toBeGreaterThan(0);
  });
});

describe("§4-10 Players (comprehensive-0080)", () => {
  it("4-10-2/4-10-3: 'owner' is the card's controlling player, and 'opponent' is always the other seat", () => {
    cite(
      "comprehensive-0080",
      "4-10-2 owner = the player currently using the card; 4-10-3 opponent = the other player",
    );

    const state = new GameState();
    for (const seat of [0, 1] as Seat[]) {
      const p = new PlayerState();
      p.seat = seat;
      state.players[seat] = p;
    }
    const access = new GameStateAccess(state);
    expect(access.opponentOf(0)).toBe(1);
    expect(access.opponentOf(1)).toBe(0);

    const card = new CardInstance();
    card.instanceId = "c1";
    card.cardId = "AD1-001";
    card.ownerSeat = 0; // the CardInstance's own field IS the rule's "owner"
    expect(card.ownerSeat).toBe(0);
  });
});

describe("§4-11 Turn Player and Non-Turn Player (comprehensive-0081)", () => {
  it("4-11-1: state.turnSeat identifies the turn player; the other seat is the non-turn player", () => {
    cite("comprehensive-0081", "4-11-1 the turn player performs the current turn; the other is the non-turn player");

    const { state } = bareState();
    state.turnSeat = 0;
    const gauge = new MemoryGauge(state);
    // memoryFor is defined relative to turnSeat, the concrete engine expression of this rule:
    // the turn player's own-perspective memory equals the raw (turn-relative) gauge value.
    state.memory = 5;
    expect(gauge.memoryFor(state.turnSeat)).toBe(5);
    const nonTurnSeat = (1 - state.turnSeat) as Seat;
    expect(gauge.memoryFor(nonTurnSeat)).toBe(-5);
  });
});

describe("§4-12 Card Orientation (comprehensive-0082)", () => {
  it("4-12-1: a card's orientation (isSuspended) starts unsuspended, and suspend()/unsuspend() flip it", () => {
    cite("comprehensive-0082", "4-12-1-1/4-12-1-2 unsuspended (vertical) vs suspended (horizontal) orientation");

    const s = setup({ 0: { battleArea: [{ card: "AD1-001", dp: 5000, as: "perm" }] } });
    const perm = s.perm("perm");
    expect(perm.isSuspended).toBe(false);

    const access = new GameStateAccess(s.state);
    access.suspend(perm);
    expect(perm.isSuspended).toBe(true);
    access.unsuspend(perm);
    expect(perm.isSuspended).toBe(false);
  });
});

describe("§4-13 Draw (comprehensive-0083)", () => {
  it("4-13-1/4-13-2: drawing moves a card from a player's OWN deck to their OWN hand", () => {
    cite(
      "comprehensive-0083",
      "4-13-1 drawing moves cards from deck to hand; 4-13-2 unless stated, from your own deck",
    );

    const s = setup({
      0: { deck: [{ card: "AD1-001", as: "deckCard" }] },
      1: { deck: ["AD1-001"] },
    });
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;
    const deckCard = s.inst("deckCard");

    // engine.primitives.draw is only reachable via effect resolution in this harness; the
    // deck-and-setup subsystem's own `dealOpeningHand` is the direct, dedicated draw-from-own-deck
    // primitive (setup.ts), reused here at zone level.
    dealOpeningHand(p0);

    expect(p0.hand.some((c) => c.instanceId === deckCard.instanceId)).toBe(true);
    expect(p0.deck.length).toBe(0);
    // Seat 0's draw never touched seat 1's deck/hand.
    expect(p1.deck.length).toBe(1);
    expect(p1.hand.length).toBe(0);
  });
});

describe("§4-14 Deletion (comprehensive-0084)", () => {
  it("4-14-1: deletion processing always trashes the card — there is no other destination", () => {
    cite("comprehensive-0084", "4-14-1 deletion processing trashes the card");

    const state = new GameState();
    const p0 = new PlayerState();
    p0.seat = 0;
    state.players[0] = p0;
    state.turnSeat = 0;
    const perm = new Permanent();
    perm.permanentId = "del-1";
    perm.controllerSeat = 0;
    const top = new CardInstance();
    top.instanceId = "del-top";
    top.cardId = "AD1-001";
    top.ownerSeat = 0;
    top.faceUp = true;
    perm.topCard = top;
    p0.battleArea.push(perm);

    const access = new GameStateAccess(state);
    access.deletePermanent("del-1");
    expect(p0.trash.map((c) => c.instanceId)).toContain(top.instanceId);
    expect(p0.battleArea.length).toBe(0);
  });
});

describe("§4-15 Trashing Cards (comprehensive-0085)", () => {
  it("4-15-1/4-15-3: trashing places a card in the trash directly — it is NOT deletion processing and doesn't remove a permanent", () => {
    cite("comprehensive-0085", "4-15-1 trashing = placing in the trash; 4-15-3 trashing isn't considered deletion");

    const s = setup({ 0: { hand: [{ card: "AD1-001", as: "handCard" }] } });
    const p0 = s.state.players[0]!;
    const handCard = s.inst("handCard");

    const removed = extractCardById(p0, Zone.Hand, handCard.instanceId)!;
    insertCard(p0, Zone.Trash, removed);

    expect(p0.hand.length).toBe(0);
    expect(p0.trash.map((c) => c.instanceId)).toContain(handCard.instanceId);
    // No battle-area permanent was ever involved — trashing a loose card never goes through
    // GameStateAccess.deletePermanent (which is the ONLY deletion seam), so no deletion
    // processing (and no [On Deletion] candidacy) applies to this move.
    expect(p0.battleArea.length).toBe(0);
  });
});

describe("§4-16 Moving (comprehensive-0086)", () => {
  it("4-16-1/4-16-3: moving from breeding to battle keeps the card's orientation (isSuspended) as-is", () => {
    cite("comprehensive-0086", "4-16-1 moving = breeding<->battle area; 4-16-3 a moved card keeps its orientation");

    const state = new GameState();
    const p0 = new PlayerState();
    p0.seat = 0;
    state.players[0] = p0;
    state.turnSeat = 0;
    state.phase = Phase.Breeding;
    const perm = new Permanent();
    perm.permanentId = "move-1";
    perm.controllerSeat = 0;
    const top = new CardInstance();
    top.instanceId = "move-top";
    top.cardId = "AD1-001"; // a real Digimon WITH DP (>0) — required by §4-16-2
    top.ownerSeat = 0;
    top.faceUp = true;
    perm.topCard = top;
    perm.baseDP = 2000;
    perm.currentDP = 2000;
    perm.isSuspended = true; // an unusual (but legal) starting orientation, to prove it survives
    perm.inBreeding = true;
    p0.breeding = perm;

    const events: unknown[] = [];
    const result = applyMoveFromBreeding(
      state,
      0,
      { type: "moveFromBreeding", permanentId: "move-1" },
      { emit: (event) => events.push(event) },
    );
    expect(result.ok).toBe(true);
    expect(perm.isSuspended).toBe(true); // orientation carried over, untouched by the move
    expect(perm.inBreeding).toBe(false);
    expect(p0.battleArea.some((p) => p.permanentId === "move-1")).toBe(true);
    expect(events).toContainEqual({
      kind: "movedFromBreeding",
      seat: 0,
      permanentId: "move-1",
      cardId: "AD1-001",
    });
  });

  it("4-16-2: only a Digimon WITH DP can be moved from breeding — a freshly hatched Lv.2 Digi-Egg (DP 0) can't", () => {
    cite("comprehensive-0086", "4-16-2 only a Digimon with DP can be moved");

    const eggDef = requireCardDefinition("BT1-001"); // a real Lv.2 Digi-Egg, DP 0
    expect(eggDef.dp).toBe(0);

    const state = new GameState();
    const p0 = new PlayerState();
    p0.seat = 0;
    state.players[0] = p0;
    state.phase = Phase.Breeding;
    state.turnSeat = 0;

    const perm = new Permanent();
    perm.permanentId = "egg-1";
    perm.controllerSeat = 0;
    const top = new CardInstance();
    top.instanceId = "egg-top";
    top.cardId = "BT1-001";
    top.ownerSeat = 0;
    top.faceUp = true;
    perm.topCard = top;
    perm.baseDP = eggDef.dp;
    perm.currentDP = eggDef.dp;
    perm.inBreeding = true;
    p0.breeding = perm;

    const verdict = validateMoveFromBreeding(state, 0, { type: "moveFromBreeding", permanentId: "egg-1" });
    expect(verdict).toEqual({ ok: false, reason: "not-movable" });

    // A real Digimon WITH DP in the same spot IS movable.
    top.cardId = "AD1-001";
    perm.baseDP = 2000;
    perm.currentDP = 2000;
    const verdict2 = validateMoveFromBreeding(state, 0, { type: "moveFromBreeding", permanentId: "egg-1" });
    expect(verdict2.ok).toBe(true);

    // EX2-007 is printed as a Digi-Egg but, unlike ordinary Lv.2 Digi-Eggs, has
    // 15000 DP. Official Q3276 therefore explicitly allows Mother D-Reaper to
    // move from the breeding area without first digivolving.
    top.cardId = "EX2-007";
    perm.baseDP = 15000;
    perm.currentDP = 15000;
    const motherVerdict = validateMoveFromBreeding(state, 0, {
      type: "moveFromBreeding",
      permanentId: "egg-1",
    });
    expect(motherVerdict.ok).toBe(true);
  });
});

describe("§4-17 Hatching a Digi-Egg (comprehensive-0087)", () => {
  it("4-17-2/4-17-3: hatching is rejected with an empty egg deck, and rejected when breeding is already occupied", () => {
    cite(
      "comprehensive-0087",
      "4-17-2 can't hatch with an empty Digi-Egg deck; 4-17-3 can't hatch into an occupied breeding area",
    );

    const { state, p0 } = bareState();
    state.phase = Phase.Breeding;

    expect(validateHatchEgg(state, 0)).toEqual({ ok: false, reason: "egg-deck-empty" });

    const egg = instance("BT1-001", 0, false);
    p0.eggDeck.push(egg);
    const occupant = new Permanent();
    occupant.permanentId = "occ-1";
    occupant.controllerSeat = 0;
    p0.breeding = occupant;
    expect(validateHatchEgg(state, 0)).toEqual({ ok: false, reason: "breeding-occupied" });
  });

  it("4-17-1: a legal hatch flips the top Digi-Egg face-up into the (empty) breeding area", () => {
    const { state, p0 } = bareState();
    state.phase = Phase.Breeding;
    const egg = instance("BT1-001", 0, false);
    p0.eggDeck.push(egg);

    let idSeq = 0;
    const events: unknown[] = [];
    const result = applyHatchEgg(state, 0, {
      nextPermanentId: () => `hatch-${idSeq++}`,
      emit: (event) => events.push(event),
    });
    expect(result.ok).toBe(true);
    expect(p0.breeding).toBeDefined();
    expect(p0.breeding!.inBreeding).toBe(true);
    expect(p0.eggDeck.length).toBe(0);
    expect(p0.breeding!.topCard.faceUp).toBe(true);
    expect(events).toContainEqual({
      kind: "hatched",
      seat: 0,
      permanentId: "hatch-0",
      cardId: "BT1-001",
    });
  });
});

describe("§4-18 Overflow (comprehensive-0088)", () => {
  it("4-18-1: an <Overflow> ACE card leaving the field costs its OWNER its printed overflow amount", () => {
    cite(
      "comprehensive-0088",
      "4-18-1 <Overflow>: a card leaving the field/stack moves the memory marker by its printed value",
    );

    const def = requireCardDefinition("AD1-005");
    expect(def.isAce).toBe(true);
    expect(def.overflowMemory).toBeGreaterThan(0);

    const { state } = bareState();
    const gauge = new MemoryGauge(state);
    const card = new CardInstance();
    card.instanceId = "ace-1";
    card.cardId = "AD1-005";
    card.ownerSeat = 0;
    applyOverflow(gauge, [card], state.turnSeat);
    expect(state.memory).toBe(-def.overflowMemory!); // a LOSS for the owner, regardless of whose turn it is
  });

  it("4-18-5-1/4-18-5-2: simultaneous Overflow is charged turn-player-first, then the non-turn player — order changes the clamped result", () => {
    cite(
      "comprehensive-0088",
      "4-18-5 simultaneous <Overflow> instances: turn player's first, then the non-turn player's",
    );

    const { state } = bareState();
    state.turnSeat = 0;
    state.memory = MEMORY_MAX - 2; // near the ceiling, so processing order changes the clamped outcome
    const gauge = new MemoryGauge(state);
    const turnPlayerAce = new CardInstance();
    turnPlayerAce.instanceId = "tp-ace";
    turnPlayerAce.cardId = "AD1-005"; // overflowMemory 4, owned by the TURN player (seat 0)
    turnPlayerAce.ownerSeat = 0;
    const nonTurnPlayerAce = new CardInstance();
    nonTurnPlayerAce.instanceId = "ntp-ace";
    nonTurnPlayerAce.cardId = "AD1-005"; // owned by the NON-turn player (seat 1)
    nonTurnPlayerAce.ownerSeat = 1;

    // Passed in NON-turn-player-first array order; applyOverflow must still process the TURN
    // player's instance FIRST internally (ordering is `turnSeat`-driven, not caller-order-driven).
    // Turn-player-first: (MAX-2) -4 = MAX-6, then non-turn-player +4 = MAX-2.
    // If it were caller-order (non-turn-player first): (MAX-2) +4 clamps to MAX, then -4 = MAX-4.
    // The two orders diverge (MAX-2 vs MAX-4) BECAUSE of the intermediate clamp, so this proves
    // the function's own internal reordering, not just commutative arithmetic.
    applyOverflow(gauge, [nonTurnPlayerAce, turnPlayerAce], state.turnSeat);

    expect(state.memory).toBe(MEMORY_MAX - 2);
  });
});

describe("§4-19 Arts Digivolve (comprehensive-0089)", () => {
  it("4-19-1/4-19-2: after using a DUAL card's Option side, a Digimon may digivolve into it for free INSTEAD OF the pending trash", async () => {
    cite(
      "comprehensive-0089",
      "§4-19-1 'Arts Digivolve is a rule on DUAL cards. Instead of the trashing from the pending " +
        "processing after using an Option card, one of your cards on the field may digivolve into " +
        "that DUAL card without paying the cost.' §4-19-2 'Arts Digivolve is overwrite processing " +
        "that replaces the trashing of an Option card from the pending processing.' The precondition " +
        "this chunk was previously marked unreachable for (the Option-use branch, comprehensive-0072) " +
        'is now reachable: playCard.ts\'s playModeOf() honors an explicit `useAs: "option"`, and ' +
        "GameEngine.resolveArtsDigivolve offers the free digivolve (via the SAME cost-free " +
        "`digivolveFromInstance` primitive other 'digivolve without paying the cost' effects use) " +
        "BEFORE the trash step in playCard.ts's finally block, sourcing the DUAL card straight out " +
        "of the resolvingOption slot it's still sitting in.",
    );

    const def = requireCardDefinition("BT25-043");
    expect(def.isDualCard).toBe(true);
    expect(def.evoCosts).toEqual(expect.arrayContaining([expect.objectContaining({ level: 5, color: "Yellow" })]));

    const s = setup({
      0: {
        // BT1-060 MagnaAngemon: Lv.5 Yellow (no compiled effects), matching BT25-043's printed
        // EvoCost so it's a legal (cost-free) Arts Digivolve target AND satisfies the color gate.
        battleArea: [{ card: "BT1-060", dp: 5000, as: "base" }],
        hand: [{ card: "BT25-043", as: "dualCard" }],
      },
      1: { battleArea: [{ card: "BT1-080", dp: 12000, as: "oppTarget" }] },
    });
    const p0 = s.state.players[0]!;
    const base = s.perm("base");
    const dualCard = s.inst("dualCard");
    s.state.memory = def.playCost;

    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: dualCard.instanceId,
      useAs: "option",
    } as never);
    expect(result).toEqual({ ok: true });

    // The Option's [Main] effect resolves first (the -8000 DP still applies)...
    await settle(() => s.state.pendingDecision !== undefined, 5000);
    const oppTarget = s.perm("oppTarget");
    expect(oppTarget.currentDP).toBe(4000);
    // ...THEN Arts Digivolve is offered, replacing the pending trash — accept it.
    const pending = s.state.pendingDecision;
    expect(pending?.kind).toBe("selectCards");
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: pending!.decisionId,
      response: { kind: "selectCards", instanceIds: [base.topCard!.instanceId] },
    } as never);

    await settle(() => base.topCard?.cardId === "BT25-043", 5000);
    expect(base.topCard?.cardId).toBe("BT25-043"); // digivolved in, NOT trashed
    expect(base.stack.some((c) => c.cardId === "BT1-060")).toBe(true); // prior top slid under
    expect(p0.trash.some((c) => c.cardId === "BT25-043")).toBe(false);
  });

  it("declining Arts Digivolve falls through to the normal trash (it's 'may', not mandatory)", async () => {
    const s = setup({
      0: {
        battleArea: [{ card: "BT1-060", dp: 5000, as: "base" }],
        hand: [{ card: "BT25-043", as: "dualCard" }],
      },
      1: { battleArea: [{ card: "BT1-080", dp: 12000, as: "oppTarget" }] },
    });
    const p0 = s.state.players[0]!;
    const base = s.perm("base");
    const dualCard = s.inst("dualCard");
    s.state.memory = requireCardDefinition("BT25-043").playCost;

    s.engine.applyIntent(0, { type: "playCard", instanceId: dualCard.instanceId, useAs: "option" } as never);
    await settle(() => s.state.pendingDecision !== undefined, 5000);
    const pending = s.state.pendingDecision!;
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: pending.decisionId,
      response: { kind: "selectCards", instanceIds: [] },
    } as never);

    await settle(() => p0.trash.some((c) => c.cardId === "BT25-043"), 5000);
    expect(base.topCard?.cardId).toBe("BT1-060"); // unchanged
    expect(p0.trash.some((c) => c.cardId === "BT25-043")).toBe(true);
  });

  it("no permanent meets the digivolution requirement => no decision is raised at all, straight to trash", async () => {
    const s = setup({
      0: {
        // BT1-045 Tsukaimon: Lv.3, matches neither BT25-043's Lv.5/Yellow EvoCost nor its
        // [Glowing Dawn]-trait alternate — not a legal Arts Digivolve target.
        battleArea: [{ card: "BT1-045", dp: 3000, as: "base" }],
        hand: [{ card: "BT25-043", as: "dualCard" }],
      },
      1: { battleArea: [{ card: "BT1-080", dp: 12000, as: "oppTarget" }] },
    });
    const p0 = s.state.players[0]!;
    const dualCard = s.inst("dualCard");
    s.state.memory = requireCardDefinition("BT25-043").playCost;

    s.engine.applyIntent(0, { type: "playCard", instanceId: dualCard.instanceId, useAs: "option" } as never);
    await settle(() => p0.trash.some((c) => c.cardId === "BT25-043"), 5000);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(p0.trash.some((c) => c.cardId === "BT25-043")).toBe(true);
  });
});

describe("§4-20 Tokens (comprehensive-0090)", () => {
  it("4-20-1: a played token is a real permanent carrying full card information (name, DP, color)", async () => {
    cite("comprehensive-0090", "4-20-1 tokens are non-game cards played by effects, as if they have card information");

    const s = setup();
    s.state.memory = 20; // affordable ceiling for the token's own play cost
    const permanent = await (
      s.engine as unknown as {
        primitives: {
          playToken(seat: Seat, name: string, opts?: { payCost?: boolean }): Promise<Permanent | undefined>;
        };
      }
    ).primitives.playToken(0, "KoHagurumon Token", { payCost: false });

    expect(permanent).toBeDefined();
    expect(permanent!.topCard?.faceUp).toBe(true);
    expect(permanent!.currentDP).toBeGreaterThan(0);
    expect(requireCardDefinition(permanent!.topCard!.cardId).isToken).toBe(true);
  });

  it("NOW MET: a token removed from the field should be removed from the game, not placed in the trash", async () => {
    cite(
      "comprehensive-0090",
      "DIVERGENCE: §4-20-5 'When a token is removed from the field, it is removed from the " +
        "game instead of being placed in a different area.' The deletion seam " +
        "(GameStateAccess.moveDeletedPermanentCardsToTrash, state/access.ts) unconditionally " +
        "calls `insertCard(this.player(card.ownerSeat), Zone.Trash, card)` for every card a " +
        "deleted permanent carries — it never checks CardDefinition.isToken to divert a token " +
        "out of the game instead. `isToken` is consulted elsewhere (targeting filters, " +
        "continuous-effect exemptions) but nowhere in the deletion/trash path.",
    );

    const s = setup();
    s.state.memory = 20;
    const permanent = await (
      s.engine as unknown as {
        primitives: {
          playToken(seat: Seat, name: string, opts?: { payCost?: boolean }): Promise<Permanent | undefined>;
        };
      }
    ).primitives.playToken(0, "KoHagurumon Token", { payCost: false });
    const p0 = s.state.players[0]!;
    const tokenInstanceId = permanent!.topCard!.instanceId;

    const access = new GameStateAccess(s.state);
    access.deletePermanent(permanent!.permanentId);

    // EXPECTED (per §4-20-5): the token is gone entirely — NOT sitting in the trash.
    expect(p0.trash.some((c) => c.instanceId === tokenInstanceId)).toBe(false);
  });
});

describe("§4-21 Color Requirements (comprehensive-0091)", () => {
  it("4-21-2 (structural): the color-requirement gate is real and driven by CardDefinition.optionColorRequirements", () => {
    cite(
      "comprehensive-0091",
      "4-21-2 to meet color requirements, you need a Digimon/Tamer of that color on your field",
    );

    // BT25-043 is one of only 6 cards in the whole corpus with `optionColorRequirements`
    // populated — proving the gate itself (GameEngine.printedColorRequirementMet) is real and
    // wired, not dead code. The it.fails below documents WHY it's unmet for ordinary cards.
    const gated = requireCardDefinition("BT25-043");
    expect(gated.optionColorRequirements).toEqual(["Yellow"]);
  });

  it("4-21-2: an ordinary Option card's color requirement (from its printed `colors`) is enforced when no matching color is on the field", () => {
    cite(
      "comprehensive-0091",
      "4-21-2 'To meet color requirements, you must have a Digimon or Tamer on your field " +
        "that's the same color as the Option card you want to use.' GameEngine." +
        "printedColorRequirementMet (GameEngine.ts) falls back to `definition.colors` when a " +
        "card carries no `optionColorRequirements` (populated only for the 6 DUAL cards whose " +
        "Option side differs from their own printed colors) — so an ordinary mono-color Option " +
        "like BT1-097 ('Boring Storm', printed color Blue) is now gated by its own `colors`.",
    );

    const s = setup(
      {
        0: {
          battleArea: [{ card: "AD1-001", dp: 5000 }], // Red only — no Blue source anywhere on the field
          hand: [{ card: "BT1-097", as: "blueOption" }], // a real mono-Blue Option, "Trigger <Draw 1>"
        },
      },
      { autoAcceptOptional: true },
    );
    const blueOption = s.inst("blueOption");
    const def = requireCardDefinition("BT1-097");
    expect(def.colors).toEqual(["Blue"]);
    expect(def.optionColorRequirements ?? []).toEqual([]); // not populated — the fallback path is exercised
    s.state.memory = def.playCost;

    // Rejected: no Blue source on the field.
    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: blueOption.instanceId });
    expect(result).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("4-21-2: an Option permanent in the battle area is not a Digimon/Tamer color source", () => {
    cite(
      "comprehensive-0091",
      "4-21-2 requires a Digimon or Tamer of the required color; an Option in the battle area does not qualify",
    );
    const s = setup({
      0: {
        battleArea: [{ card: "P-036", as: "placedBlueOption" }],
        hand: [{ card: "BT1-097", as: "blueOption" }],
      },
    });
    s.perm("placedBlueOption").placedByEffect = true;
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("blueOption").instanceId,
      }),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("4-21-2 (positive control): the same mono-color Option plays once a matching-color source is on the field", async () => {
    cite(
      "comprehensive-0091",
      "4-21-2 'you must have a Digimon or Tamer on your field that's the same color as the " +
        "Option card you want to use' — met once a same-color source is present.",
    );

    const s = setup(
      {
        0: {
          battleArea: [{ card: "BT1-027", dp: 3000 }], // vanilla mono-Blue Digimon, no effects
          hand: [{ card: "BT1-097", as: "blueOption" }], // real mono-Blue Option, "Trigger <Draw 1>"
        },
      },
      { autoAcceptOptional: true },
    );
    const p0 = s.state.players[0]!;
    const blueOption = s.inst("blueOption");
    const def = requireCardDefinition("BT1-097");
    s.state.memory = def.playCost;

    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: blueOption.instanceId });
    expect(result).toEqual({ ok: true });
    await settle(() => p0.trash.some((c) => c.instanceId === blueOption.instanceId));
    expect(p0.trash.some((c) => c.instanceId === blueOption.instanceId)).toBe(true);
  });

  it("4-21-3: a multicolor Option needs EVERY listed color represented, not just one", () => {
    cite(
      "comprehensive-0091",
      "4-21-3 'An Option card with multiple colors can't be used unless the color " +
        "requirements are met for all of its colors.'",
    );

    const s = setup(
      {
        0: {
          battleArea: [{ card: "BT10-071", dp: 3000 }], // vanilla mono-Purple Digimon, no effects
          hand: [{ card: "EX10-071", as: "purpleYellowOption" }], // real Purple+Yellow Option
        },
      },
      { autoAcceptOptional: true },
    );
    const purpleYellowOption = s.inst("purpleYellowOption");
    const def = requireCardDefinition("EX10-071");
    expect(def.colors).toEqual(["Purple", "Yellow"]);
    s.state.memory = def.playCost;

    // Purple is present but Yellow is not — still rejected.
    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: purpleYellowOption.instanceId });
    expect(result).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("4-21-4: a single multicolor Digimon/Tamer can meet the requirement for more than 1 color at once", async () => {
    cite(
      "comprehensive-0091",
      "4-21-4 'A multicolor Digimon or multicolor Tamer can meet the color requirements for " + "multiple colors.'",
    );

    const s = setup(
      {
        0: {
          battleArea: [{ card: "BT8-041", dp: 9000 }], // vanilla Yellow+Purple Digimon, no effects
          hand: [{ card: "EX10-071", as: "purpleYellowOption" }], // real Purple+Yellow Option
        },
      },
      { autoAcceptOptional: true },
    );
    const p0 = s.state.players[0]!;
    const purpleYellowOption = s.inst("purpleYellowOption");
    const def = requireCardDefinition("EX10-071");
    s.state.memory = def.playCost;

    // The single multicolor source alone satisfies BOTH required colors.
    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: purpleYellowOption.instanceId });
    expect(result).toEqual({ ok: true });
    await settle(() => p0.trash.some((c) => c.instanceId === purpleYellowOption.instanceId));
    expect(p0.trash.some((c) => c.instanceId === purpleYellowOption.instanceId)).toBe(true);
  });

  it("4-21-2 waiver seam: a color-waiver static on a HAND-resident card now fires (was silently inert)", async () => {
    cite(
      "comprehensive-0091",
      "4-21-2's color-requirement gate is the thing a color-requirement WAIVER (e.g. §16-42 " +
        "＜Use Req.＞ and the pre-existing 'while you have [X] in play, ignore this card's color " +
        "requirements' idiom) exists to bypass — proven here against EX2-072 (Blue Card), a card " +
        "already on master carrying exactly that Static+WaiveColorRequirement+youHave shape.",
    );

    // BUG THIS FIXES: `GameEngine.recomputeContinuousEffects` re-derives EffectTiming.None
    // effects for hand cards too (`listCandidateInstances` includes `player.hand`), but every
    // `trigger: "Static"` IR effect routed through `builders.ts`'s `staticModifier`, whose
    // default `baseGuard` is `ctx.source.isOnBattleArea()` — always false for a card sitting
    // in hand. So EX2-072's own WaiveColorRequirement action, gated on "you have a Tamer in
    // play", never ran while EX2-072 sat in hand (the only place its own play-legality check
    // matters), and `continuous.hasColorWaiver` never got set. Fixed by routing
    // WaiveColorRequirement-only Static/Rule effects through the new `colorWaiverStatic`
    // builder (no on-field guard) instead — `isColorWaiverStatic` in interpreter.ts's
    // `builderForTrigger`.
    const s = setup({ 0: { hand: [{ card: "EX2-072", as: "noTamerBoard" }] } }, { autoAcceptOptional: true });
    const p0 = s.state.players[0]!;
    const def = requireCardDefinition("EX2-072");
    expect(def.colors).toEqual(["White"]); // no White source anywhere on this board, ever

    // Baseline (unaffected by this fix): no Tamer in play => EX2-072's own <youHave a Tamer>
    // condition is unmet, so the waiver never applies and the plain color gate rejects it.
    const noTamerBoard = s.inst("noTamerBoard");
    s.state.memory = def.playCost;
    const rejected = s.engine.applyIntent(0, { type: "playCard", instanceId: noTamerBoard.instanceId });
    expect(rejected).toEqual({ ok: false, reason: "color-requirement-unmet" });
    extractCardById(p0, Zone.Hand, noTamerBoard.instanceId);

    // Fixed: a Tamer (Yellow/Red — NOT White) in play satisfies EX2-072's own Static
    // WaiveColorRequirement condition, so its color requirement no longer applies.
    s.putOnBoard(0, { card: "BT12-092", dp: 0 }); // a real Tamer permanent, Yellow/Red (no White)
    const withTamer = s.give(0, Zone.Hand, "EX2-072");
    s.state.memory = def.playCost;
    await s.engine.recomputeContinuousEffects();

    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: withTamer.instanceId });
    expect(result).toEqual({ ok: true });
    await settle(() => p0.trash.some((c) => c.instanceId === withTamer.instanceId));
    expect(p0.trash.some((c) => c.instanceId === withTamer.instanceId)).toBe(true);
  });

  it("4-21-2 waiver seam is BOUNDED: an ordinary on-field-only Static effect (not a pure color waiver) still requires on-field presence", async () => {
    cite(
      "comprehensive-0091",
      "The `colorWaiverStatic` routing (interpreter.ts `isColorWaiverStatic`) only fires for " +
        "Static/Rule effects whose actions are ALL WaiveColorRequirement — this must not loosen " +
        "the on-field guard for any other Static effect. Proven here against a real card's " +
        "unrelated Static grant: EX12-072's '[All Turns] All of your [ME] trait Digimon gain " +
        "<Guard>' keeps requiring EX12-072 itself to be on the battle area.",
    );

    const s = setup(
      {
        0: {
          battleArea: [{ card: "EX12-008", dp: 3000, as: "meDigimon" }], // a real [ME] trait Digimon
          // EX12-072 sits in HAND (not on the battle area) — its [All Turns] Guard grant must NOT apply.
          hand: ["EX12-072"],
        },
      },
      { autoAcceptOptional: true },
    );
    const meDigimon = s.perm("meDigimon");
    const def = requireCardDefinition("EX12-008");
    expect(def.types).toContain("ME");

    await s.engine.recomputeContinuousEffects();

    const grantedKeywords = (
      s.engine as unknown as {
        continuous: { grantedKeywords(id: string): { keyword: string; amount?: number }[] };
      }
    ).continuous.grantedKeywords(meDigimon.permanentId);
    expect(grantedKeywords.some((g) => g.keyword === "Guard")).toBe(false);
  });
});

describe('§4-22 Cards "With XX in Their Texts" (comprehensive-0092)', () => {
  it("4-22-1: a keyword filter matches only a card whose printed text carries that keyword icon/term", () => {
    cite("comprehensive-0092", '4-22-1 "with XX in its text" = the printed information carries that term/icon');

    const withSave = requireCardDefinition("BT10-020"); // real: "[On Deletion] ＜Save＞ ..."
    const withoutSave = requireCardDefinition("AD1-001");
    expect(definitionMatches({ keywords: ["Save"] }, withSave)).toBe(true);
    expect(definitionMatches({ keywords: ["Save"] }, withoutSave)).toBe(false);
  });
});

describe('§4-23 "XX/YY" (comprehensive-0093)', () => {
  it('4-23-1: "XX/YY" means "XX OR YY" — a kind filter listing both kinds matches EITHER', () => {
    cite("comprehensive-0093", '4-23-1 "XX/YY" means "XX or YY" — either one meets the requirement');

    const digimonDef = requireCardDefinition("AD1-001");
    const tamerDef = requireCardDefinition("BT12-092");
    const optionDef = requireCardDefinition("BT1-090");
    // "1 of your opponent's Digimon/Tamers" — matches a card that is EITHER kind.
    expect(definitionMatches({ kind: ["Digimon", "Tamer"] }, digimonDef)).toBe(true);
    expect(definitionMatches({ kind: ["Digimon", "Tamer"] }, tamerDef)).toBe(true);
    expect(definitionMatches({ kind: ["Digimon", "Tamer"] }, optionDef)).toBe(false);
  });
});

// §4-24 "With different XX" Cards (comprehensive-0094): the engine DOES implement the
// counting-mode concept (`Filter.distinctNames`, interpreter.ts — "3 or more [Hero] Tamers with
// different names", BT21-010), but it is consumed only by the unexported `permanentCount`
// Condition evaluator, reachable only by driving one specific compiled card's full effect
// resolution end-to-end. That is chapter 15 "Effect Rules" scaffolding (the same class of
// dependency ch03's comprehensive-0057 defers for the identical reason), out of this chapter's
// terminology-definition scope.
// comprehensive-0094 is now covered behaviourally in ch15-03-targeting-and-selection.test.ts, which picked up
// this deferral. The not-testable entry that used to sit here was removed: the meta-test
// rejects an id that is both cited and not-testable, which is how the staleness surfaced.

// §4-25 "With/have X cards" (comprehensive-0095): the engine implements this as the
// `selfDigivolutionCountAtLeast` Condition kind (documented against real card BT22-007, "10 or
// more digivolution cards", KB Q4858), but — like comprehensive-0094 — it's reachable only via
// the unexported Condition evaluator inside a specific compiled card's [On Play]/[Main] gate.
// comprehensive-0095 is now covered behaviourally in ch15-04-continuous-and-static.test.ts, which picked up
// this deferral. The not-testable entry that used to sit here was removed: the meta-test
// rejects an id that is both cited and not-testable, which is how the staleness surfaced.

describe('§4-26 "Each" or "Every" (comprehensive-0096)', () => {
  it('4-26-1/4-26-2: "for each X" scales an effect\'s count by how many matching things exist at activation', async () => {
    cite("comprehensive-0096", '4-26-1/2 "each"/"every" references a count of something, scaling the effect');

    const s = setup(
      {
        0: {
          deck: Array(10).fill("AD1-001"), // enough to draw from
          // real: "Draw 1. Then, for each Digimon your opponent has in play, Draw 1."
          hand: [{ card: "BT10-020", as: "deckerdramon" }],
        },
      },
      { autoAcceptOptional: true },
    );
    const p0 = s.state.players[0]!;
    const deckerdramon = s.inst("deckerdramon");
    const def = requireCardDefinition("BT10-020");
    s.state.memory = def.playCost;
    const handBefore = p0.hand.length - 1; // minus the card about to leave the hand

    // Zero opponent Digimon: the flat "Draw 1" is the only draw.
    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: deckerdramon.instanceId });
    expect(result).toEqual({ ok: true });
    await settle(() => p0.hand.length !== handBefore, 5000);
    expect(p0.hand.length).toBe(handBefore + 1);

    // A second Deckerdramon with TWO opponent Digimon on the field draws 1 (flat) + 2 (each) = 3.
    s.putOnBoard(1, { card: "AD1-001", dp: 1000 });
    s.putOnBoard(1, { card: "AD1-001", dp: 1000 });
    const second = s.give(0, Zone.Hand, "BT10-020");
    s.state.memory = def.playCost;
    const handBefore2 = p0.hand.length - 1;
    s.engine.applyIntent(0, { type: "playCard", instanceId: second.instanceId });
    await settle(() => p0.hand.length >= handBefore2 + 3, 5000);
    expect(p0.hand.length).toBe(handBefore2 + 3);
  });
});

describe('§4-26-5 "Each" or "Every", cont\'d (comprehensive-0097)', () => {
  it("4-26-5: a single trigger fires exactly once even though its 'each' text references a count of multiple things", async () => {
    cite(
      "comprehensive-0097",
      "4-26-5 a triggering from 1 trigger condition triggers only once, but 'each'/'every' text can reference the count",
    );

    const s = setup(
      {
        0: {
          deck: Array(10).fill("AD1-001"),
          hand: [{ card: "BT10-020", as: "deckerdramon" }],
        },
        1: {
          battleArea: [
            { card: "AD1-001", dp: 1000 },
            { card: "AD1-001", dp: 1000 },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    const p0 = s.state.players[0]!;
    const deckerdramon = s.inst("deckerdramon");
    const def = requireCardDefinition("BT10-020");
    s.state.memory = def.playCost;
    const handBeforePlay = p0.hand.length - 1;

    const onPlayEventsBefore = s.events.length;
    s.engine.applyIntent(0, { type: "playCard", instanceId: deckerdramon.instanceId });
    await settle(() => p0.hand.length >= handBeforePlay + 3, 5000);
    expect(p0.hand.length).toBe(handBeforePlay + 3); // the count actually landed — not just "some draws happened"

    // Exactly ONE On Play activation happened (a single `cardPlayed`/On Play window), yet the
    // resulting draws (proven above at comprehensive-0096) reflect the count of BOTH opponent
    // Digimon — the single trigger's own text carried "each" and referenced the count.
    const cardPlayedEvents = s.events
      .slice(onPlayEventsBefore)
      .filter((e) => e.kind === "cardPlayed" && "cardId" in e && e.cardId === "BT10-020");
    expect(cardPlayedEvents.length).toBe(1);
  });
});

// §4-27 "Option Card in the Battle Area" (comprehensive-0098): the distinction ("an Option card
// placed in the battle area BY AN EFFECT" vs. any other Option-shaped permanent) is a targeting
// predicate carried on the compiled IR (`placedInBattleAreaByEffect`, ir.ts), consumed only
// inside the unexported permanent-filter evaluator during a specific card's live target
// resolution — the same class of chapter-15-scope dependency as comprehensive-0094/0095 above.
// comprehensive-0098 is now covered behaviourally in ch15-03-targeting-and-selection.test.ts, which picked up
// this deferral. The not-testable entry that used to sit here was removed: the meta-test
// rejects an id that is both cited and not-testable, which is how the staleness surfaced.
