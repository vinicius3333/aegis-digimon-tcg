import { describe, it, expect } from "vitest";
import { EffectTiming, getCardDefinition, type CardInstance } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-012.js";
import "../index.js"; // register compiled cards so the real activate / OnEndTurn paths run

const SIBLINGS = ["EX10-012", "EX10-020", "EX10-057"] as const;

/** The OnDeclaration effectKey for the card's [Hand][Main] reduced-cost play. */
function reducedCostPlayEffectKey(s: EngineSetup, instance: CardInstance, cardId: string): string {
  const source = (s.engine as unknown as { cardSourceOf(i: CardInstance): CardSource }).cardSourceOf(instance);
  const found = effectsOf(EffectTiming.OnDeclaration, source).find((e) => e.effectKey.startsWith(`${cardId}/`));
  if (found === undefined) throw new Error(`${cardId} surfaces no [Hand][Main] activated effect`);
  return found.effectKey;
}

async function fireOnPlayForInstance(s: EngineSetup, instanceId: string): Promise<void> {
  await (
    s.engine as unknown as { fireTimingForInstance(t: EffectTiming, id: string): Promise<void> }
  ).fireTimingForInstance(EffectTiming.OnPlay, instanceId);
}

async function fireEndTurn(s: EngineSetup): Promise<void> {
  await (s.engine as unknown as { fireTiming(t: EffectTiming): Promise<void> }).fireTiming(EffectTiming.OnEndTurn);
}

function onField(s: EngineSetup, instanceId: string): boolean {
  return s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === instanceId);
}

describe.each(SIBLINGS)("%s — [Hand][Main] reduced-cost play + turn-end delete of what it played", (cardId) => {
  it("plays this card from hand for its cost minus 5 and deletes it at turn end", async () => {
    // BT15-031 is a [Dark Masters]-trait Digimon, so it does NOT break the activation gate
    // ("no Digimon OTHER than [Dark Masters] ones"), and it doubles as the bystander that must
    // survive the turn-end delete.
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "inHand" }],
          battleArea: [{ card: "BT15-031", as: "bystander" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const p0 = s.state.players[0]!;
    const inHand = s.inst("inHand");
    const bystanderId = s.perm("bystander").topCard!.instanceId;
    s.state.memory = 6;

    const effectKey = reducedCostPlayEffectKey(s, inHand, cardId);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: inHand.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => onField(s, inHand.instanceId));
    await settle();

    // Played from hand for 11 − 5 = 6.
    expect(onField(s, inHand.instanceId)).toBe(true);
    expect(p0.hand.some((c) => c.instanceId === inHand.instanceId)).toBe(false);
    expect(s.state.memory).toBe(0);
    // REVERT-CONFIRM-RED: restore the old `Replacement`/`wouldBePlayed` Main effect => nothing is
    // ever played, the card stays in hand => this goes RED.

    // Turn end: the armed watcher deletes exactly the permanent this effect played. The play
    // lands one continuation before the arming action, so flush the rest of the resolution
    // before firing the window — otherwise the watcher installs after it.
    await settle(() => false, 200);
    void fireEndTurn(s);
    await settle(() => !onField(s, inHand.instanceId), 5000);
    expect(onField(s, inHand.instanceId)).toBe(false);
    // The bystander is untouched — the honesty lever for the dead filter: the old IR's Delete
    // (count "all", `playedByThisEffect` ignored) matched EVERY permanent.
    expect(onField(s, bystanderId)).toBe(true);
    // REVERT-CONFIRM-RED: swap `DelayedDeletePlayed` back for the SubTrigger + `playedByThisEffect`
    // Delete => the bystander is deleted too => the last assertion goes RED.
  });

  it("a NORMAL play does NOT arm the turn-end delete — it survives turn end", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: cardId, as: "me" }] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const me = s.perm("me");

    await fireOnPlayForInstance(s, me.topCard!.instanceId);
    expect(onField(s, me.topCard!.instanceId)).toBe(true);

    await fireEndTurn(s);
    expect(onField(s, me.topCard!.instanceId)).toBe(true);
    // REVERT-CONFIRM-RED: moving the delete under OnPlay (or leaving the old always-armed
    // SubTrigger on the Main effect) deletes a normally-played copy => this goes RED. The delete
    // is bound ONLY to the reduced-cost [Hand][Main] play (KB Q5737, as for EX10-035).
  });
});

describe("EX10-012 MetalSeadramon — card-specific effects", () => {
  it("records the exact no-evolution catalog facts and every printed executable clause", () => {
    expect(getCardDefinition("EX10-012")).toMatchObject({
      colors: ["Blue"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [],
      types: ["Cyborg", "Dark Masters"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(registeredCompiledCards.get("EX10-012")).toEqual(compiled);
    expect(compiled.effects.map(({ trigger }) => trigger)).toEqual([
      "Main",
      "OnPlay",
      "WhenAttacking",
      "AllTurns",
      "OnDeletion",
      "Security",
    ]);
  });

  it("restricts exactly one opposing Digimon and Tamer through that opponent's turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX10-012", as: "metal" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "chosenDigimon" },
            { card: "BT1-010", as: "otherDigimon" },
            { card: "BT1-085", as: "chosenTamer" },
            { card: "BT1-085", as: "otherTamer" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosenDigimon").permanentId, s.perm("chosenTamer").permanentId);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("metal"));
    const ledger = advance(s.engine).ledgers.continuous;
    expect(ledger.hasRestriction(s.perm("chosenDigimon").permanentId, "beSuspended")).toBe(true);
    expect(ledger.hasRestriction(s.perm("chosenTamer").permanentId, "beSuspended")).toBe(true);
    expect(ledger.hasRestriction(s.perm("otherDigimon").permanentId, "beSuspended")).toBe(false);
    expect(ledger.hasRestriction(s.perm("otherTamer").permanentId, "beSuspended")).toBe(false);

    ledger.sweep(s.state, "ownerTurnEnd", 1);
    expect(ledger.hasRestriction(s.perm("chosenDigimon").permanentId, "beSuspended")).toBe(false);
    expect(ledger.hasRestriction(s.perm("chosenTamer").permanentId, "beSuspended")).toBe(false);
  });

  it("places itself face up in security on deletion when no blue face-up security exists", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX10-012", as: "metal" }] } });
    const instanceId = s.perm("metal").topCard.instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("metal").permanentId]);
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === instanceId));
    expect(s.state.players[0]!.security.find((card) => card.instanceId === instanceId)?.faceUp).toBe(true);
  });

  it("stays in trash on deletion when a blue face-up security card already exists", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX10-012", as: "metal" }],
        security: [{ card: "EX10-012", faceUp: true }],
      },
    });
    const instanceId = s.perm("metal").topCard.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("metal").permanentId]);
    await settle();

    expect(s.state.players[0]!.trash.map(({ instanceId: id }) => id)).toContain(instanceId);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("plays a level 5 Dark Masters-text card when checked from face-up security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          hand: [{ card: "BT15-027", as: "playTarget" }],
          security: [{ card: "EX10-012", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT15-027"));
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT15-027");
  });

  it("does not play the same target when checked face down", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          hand: [{ card: "BT15-027", as: "playTarget" }],
          security: [{ card: "EX10-012", faceUp: false }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[1]!.hand.map(({ cardId }) => cardId)).toContain("BT15-027");
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).not.toContain("BT15-027");
  });

  it("allows Apocalymon, rejects another legal blue evolution, and keeps delayed deletion on the host", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX10-012", as: "metal" },
            { card: "BT15-102", as: "apocalymon" },
            { card: "BT5-086", as: "omnimon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    const metalInstanceId = s.inst("metal").instanceId;
    const effectKey = reducedCostPlayEffectKey(s, s.inst("metal"), "EX10-012");

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: metalInstanceId, effectKey })).toEqual({
      ok: true,
    });
    await settle(() => onField(s, metalInstanceId));
    await settle(() => false, 200);
    const host = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.instanceId === metalInstanceId)!;
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: host.permanentId,
        instanceId: s.inst("omnimon").instanceId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: host.permanentId,
        instanceId: s.inst("apocalymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => host.topCard.cardId === "BT15-102");

    void fireEndTurn(s);
    await settle(() => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === host.permanentId));
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT15-102", "EX10-012"]),
    );
  });
});
