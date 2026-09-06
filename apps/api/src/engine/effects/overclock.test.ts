import { describe, it, expect } from "vitest";
import { CardKind, EffectTiming, getCompiledCard, getCardDefinition, type PlayerState, type Seat } from "@aegis/shared";
import { setupEngine, settle } from "../testkit/harness.js";
import { irCardModule, definitionMatches } from "./interpreter.js";
import type { CardSource } from "./CardSource.js";
// Side-effect import: registers every card module so getCompiledCard resolves the real IR.
import "../../cards/index.js";

/**
 * ＜Overclock ([Trait])＞ (CR §16-34) is compiled to a bare keyword marker on most cards
 * (a self-targeted GainKeyword or a `keywords` entry, no actions); only EX7-030 and BT22-036
 * hand-author the explicit end-of-turn attack. The interpreter synthesizes the missing attack
 * from the keyword, and the delete cost's `allowTokens` lets a Token pay it (source
 * `permanent.IsToken || TopCard.ContainsTraits(trait)`).
 */

// --- allowTokens filter (definitionMatches seam) -----------------------------

function facts(over: Record<string, unknown>): never {
  return {
    cardId: "X",
    set: "T",
    nameEn: "X",
    kinds: [CardKind.Digimon],
    colors: [],
    playCost: 0,
    dp: 1000,
    evoCosts: [],
    maxCountInDeck: 0,
    level: 3,
    ...over,
  } as never;
}

const overclockDeleteFilter = (allowTokens: boolean) =>
  ({
    kind: ["Digimon"],
    nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }],
    ...(allowTokens ? { allowTokens: true } : {}),
  }) as never;

describe("allowTokens — a Token satisfies the ＜Overclock＞ delete-cost trait gate", () => {
  const familiarToken = facts({ nameEn: "Familiar Token", isToken: true, types: [] });
  const puppetDigimon = facts({ nameEn: "Cendrillmon", types: ["Puppet"] });
  const plainDigimon = facts({ nameEn: "Agumon", types: ["Reptile"] });

  it("lets a trait-less Token qualify only when allowTokens is set", () => {
    expect(definitionMatches(overclockDeleteFilter(true), familiarToken)).toBe(true);
    // Revert lever: without the allowTokens bypass, the Token fails the [Puppet] trait gate.
    expect(definitionMatches(overclockDeleteFilter(false), familiarToken)).toBe(false);
  });

  it("still requires the trait for non-Token Digimon", () => {
    expect(definitionMatches(overclockDeleteFilter(true), puppetDigimon)).toBe(true);
    expect(definitionMatches(overclockDeleteFilter(true), plainDigimon)).toBe(false);
  });
});

// --- end-of-turn attack synthesis (module seam) ------------------------------

function source(cardId: string): CardSource {
  return {
    instanceId: "S#i",
    cardId,
    ownerSeat: 0 as Seat,
    definition: getCardDefinition(cardId),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  } as never;
}

describe("＜Overclock＞ end-of-turn attack synthesis", () => {
  const endOfTurn = (cardId: string) =>
    irCardModule(cardId, getCompiledCard(cardId)!).effectsForTiming(EffectTiming.OnEndTurn, source(cardId));

  it("synthesizes one Overclock attack alongside the conditional Vortex trigger", () => {
    // Each card has one Overclock effect and one inactive-unless-granted Vortex effect.
    for (const id of [
      "EX11-024",
      "ST19-08",
      "ST19-12",
      "EX7-027",
      "BT19-101",
      "BT24-079",
      "BT24-065",
      "BT22-040",
      "BT22-042",
    ]) {
      expect(endOfTurn(id)).toHaveLength(2);
    }
  });

  it("does not double-emit for cards that already hand-author the attack", () => {
    expect(endOfTurn("EX7-030")).toHaveLength(2);
    expect(endOfTurn("BT22-036")).toHaveLength(2);
  });

  it("adds no extra attack beyond the latent Vortex trigger for a card without ＜Overclock＞", () => {
    // Every compiled Digimon carries one conditional Vortex trigger so live grants from
    // another permanent can schedule their attack; BT1-009 has no active Vortex, so collection
    // drops that trigger before resolution.
    expect(endOfTurn("BT1-009")).toHaveLength(1);
  });
});

describe("＜Vortex＞ end-of-turn attack synthesis", () => {
  const endOfTurn = (cardId: string) =>
    irCardModule(cardId, getCompiledCard(cardId)!).effectsForTiming(EffectTiming.OnEndTurn, source(cardId));

  it("synthesizes one optional Vortex attack and does not duplicate explicit attacks", () => {
    expect(endOfTurn("BT20-101")).toHaveLength(1);
    expect(endOfTurn("BT1-009")).toHaveLength(1);
  });

  it("accepts the optional end-of-turn Vortex attack against an unsuspended Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: ["AD1-001"], deck: ["AD1-001"], battleArea: [{ card: "BT20-101", as: "vortexer", dp: 8000 }] },
        1: { hand: ["AD1-001"], deck: ["AD1-001"], battleArea: [{ card: "BT1-009", as: "target", dp: 1000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen, 500);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(true);
  });

  it("leaves the board unchanged when the optional end-of-turn Vortex attack is declined", async () => {
    const s = setupEngine(
      {
        0: { hand: ["AD1-001"], deck: ["AD1-001"], battleArea: [{ card: "BT20-101", as: "vortexer", dp: 8000 }] },
        1: { hand: ["AD1-001"], deck: ["AD1-001"], battleArea: [{ card: "BT1-009", as: "target", dp: 1000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen, 500);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
  });
});

// --- behavioral: real turn loop fires the attack, a Token pays the cost -------

describe("＜Overclock＞ activates at end of turn (EX11-024, Token-paid)", () => {
  it("deletes a Familiar Token to declare an unsuspended attack on the player", async () => {
    const deck = ["AD1-001", "AD1-001", "AD1-001", "AD1-001", "AD1-001"];
    const s = setupEngine(
      {
        0: {
          // A card in hand is a legal Main action so the phase opens.
          hand: ["AD1-001"],
          deck,
          battleArea: [
            { card: "EX11-024", as: "overclocker", dp: 6000 }, // ＜Overclock ([Puppet] Trait)＞, Lv6
            { card: "TOKEN-Familiar-Token", as: "familiar", dp: 1000 }, // fodder: a Token with no [Puppet] trait
          ],
        },
        1: {
          hand: ["AD1-001"],
          deck,
          security: ["AD1-001", "AD1-001", "AD1-001"], // absorb the attack
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const overclockerPermanentId = s.perm("overclocker").permanentId;

    s.state.turnSeat = 0;
    s.state.isFirstPlayersFirstTurn = true;

    // Drive seat 0's turn through the real loop until the Main phase opens, then end it.
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen, 500);
    expect(mainPhase.isOpen, "Main phase opened").toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;

    // The Familiar Token was deleted as the ＜Overclock＞ cost (proves the effect fired AND the
    // allowTokens path let a trait-less Token pay it).
    const tokenStillOnField = p0.battleArea.some((p) => p.topCard?.cardId === "TOKEN-Familiar-Token");
    expect(tokenStillOnField, "Familiar Token consumed as Overclock cost").toBe(false);

    // The overclocker declared an attack (without suspending — it is still unsuspended).
    const declared = s.events.filter(
      (e) =>
        (e as { kind?: string }).kind === "attackDeclared" &&
        (e as { attackerPermanentId?: string }).attackerPermanentId === overclockerPermanentId,
    );
    expect(declared.length, "Overclock attack declared").toBeGreaterThanOrEqual(1);
    expect(s.perm("overclocker").isSuspended, "attacker not suspended (withoutSuspending)").toBe(false);
  });
});
