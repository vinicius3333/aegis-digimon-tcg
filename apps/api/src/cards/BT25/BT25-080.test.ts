import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition, Zone, type PlayerState } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

const CARD = "BT25-080";
const TITAN_DIGIMON = "BT24-015";
const TITAN_OPTION = "BT26-100";
const NON_TITAN = "BT24-019";
const LEVEL_FIVE = "BT24-015";
const LEVEL_SIX = "BT1-063";

function fireTiming(s: EngineSetup, timing: EffectTiming, trigger: Record<string, unknown> = {}) {
  return (
    s.engine as unknown as { fireTiming(t: EffectTiming, tr?: Record<string, unknown>): Promise<void> }
  ).fireTiming(timing, trigger);
}

function alive(p: PlayerState, permanentId: string): boolean {
  return p.battleArea.some((permanent) => permanent.permanentId === permanentId);
}

function trash(s: EngineSetup, instanceId: string): Promise<unknown> {
  return (s.engine as unknown as { primitives: { trash(ids: string[]): Promise<unknown> } }).primitives.trash([
    instanceId,
  ]);
}

describe("BT25-080 Witchmon", () => {
  it("matches the catalog identity, text, and alternate evolution boundary", () => {
    const card = getCardDefinition(CARD);
    expect(card).toBeDefined();
    if (card === undefined) return;
    expect(card).toMatchObject({
      cardId: CARD,
      nameEn: "Witchmon",
      colors: ["Purple"],
      level: 4,
      playCost: 5,
      dp: 6000,
      types: ["Wizard", "Titan", "TS"],
      effectText: expect.stringContaining("[On Play] [When Attacking] [Once Per Turn]"),
      inheritedEffectText: expect.stringMatching(/if this Digimon has the \[Titan\]\s+trait/),
    });
    expect(card.evoCosts).toEqual([{ color: "Purple", level: 3, memoryCost: 2 }]);
  });

  it("requires a level-3 TS base, including a mixed-trait near match, for the alternate evolution", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT24-019", as: "base" }],
        hand: [{ card: CARD, as: "witchmon" }],
      },
    });
    legal.state.memory = 2;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("witchmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard?.cardId === CARD);
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("base").stack.at(-1)?.cardId).toBe(NON_TITAN);

    const wrongTrait = setupEngine({
      0: {
        battleArea: [{ card: "BT1-013", as: "base" }],
        hand: [{ card: CARD, as: "witchmon" }],
      },
    });
    wrongTrait.state.memory = 2;
    expect(
      wrongTrait.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongTrait.perm("base").permanentId,
        instanceId: wrongTrait.inst("witchmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(wrongTrait.state.memory).toBe(2);
  });

  it("returns exactly one Titan-trait card of any kind, pays one hand card, and deletes only levels 5 or lower when effect-played", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD, as: "witchmon" }],
          hand: [{ card: "BT1-013", as: "cost" }],
          trash: [
            { card: NON_TITAN, as: "nonTitan" },
            { card: TITAN_OPTION, as: "titanOption" },
            { card: TITAN_DIGIMON, as: "titanDigimon" },
          ],
        },
        1: {
          battleArea: [
            { card: LEVEL_FIVE, as: "levelFive" },
            { card: LEVEL_SIX, as: "levelSix" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("titanOption").instanceId);
    const mine = s.state.players[0] as PlayerState;
    const opponent = s.state.players[1] as PlayerState;
    const levelFiveId = s.perm("levelFive").permanentId;
    const levelSixId = s.perm("levelSix").permanentId;

    await s.engine.recomputeContinuousEffects();
    await fireTiming(s, EffectTiming.OnPlay, {
      subjectPermanentId: s.perm("witchmon").permanentId,
      enteredByEffect: 0,
    });
    await settle(() => !alive(opponent, levelFiveId));

    expect(mine.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(false);
    expect(mine.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(mine.hand.some((card) => card.cardId === TITAN_OPTION)).toBe(true);
    expect(mine.trash.some((card) => card.cardId === TITAN_DIGIMON)).toBe(true);
    expect(mine.trash.some((card) => card.cardId === NON_TITAN)).toBe(true);
    expect(alive(opponent, levelFiveId)).toBe(false);
    expect(alive(opponent, levelSixId)).toBe(true);
  });

  it("returns a Titan Digi-Egg to the bottom of the Digi-Egg deck, face-down, per Q6715", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD, as: "witchmon" }],
          hand: [{ card: "BT1-013", as: "cost" }],
          trash: [{ card: "BT24-007", as: "egg" }],
          eggDeck: ["BT24-007"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("egg").instanceId);
    await fireTiming(s, EffectTiming.OnPlay, {
      subjectPermanentId: s.perm("witchmon").permanentId,
      enteredByEffect: 0,
    });
    await settle(() => s.state.players[0]!.eggDeck.some((card) => card.instanceId === s.inst("egg").instanceId));

    const player = s.state.players[0] as PlayerState;
    expect(player.hand.some((card) => card.cardId === "BT24-007")).toBe(false);
    expect(player.eggDeck.at(-1)?.instanceId).toBe(s.inst("egg").instanceId);
    expect(player.eggDeck.at(-1)?.faceUp).toBe(false);
  });

  it("does not delete after a manual On Play, after declining, when the cost fails, or when no Titan target exists", async () => {
    const manual = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD, as: "witchmon" }],
          hand: [{ card: "BT1-013", as: "cost" }],
          trash: [TITAN_DIGIMON],
        },
        1: { battleArea: [{ card: LEVEL_FIVE, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const manualTarget = manual.perm("target").permanentId;
    await fireTiming(manual, EffectTiming.OnPlay, { subjectPermanentId: manual.perm("witchmon").permanentId });
    await settle(() => false, 60);
    expect(alive(manual.state.players[1] as PlayerState, manualTarget)).toBe(true);

    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD, as: "witchmon" }],
          hand: [{ card: "BT1-013", as: "cost" }],
          trash: [TITAN_DIGIMON],
        },
        1: { battleArea: [{ card: LEVEL_FIVE, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const declinedTarget = declined.perm("target").permanentId;
    const pending = fireTiming(declined, EffectTiming.OnPlay, {
      subjectPermanentId: declined.perm("witchmon").permanentId,
      enteredByEffect: 0,
    });
    await settle(() => declined.decisions.some((decision) => decision.req.kind === "optional"), 80);
    const decision = declined.decisions.find((entry) => entry.req.kind === "optional");
    expect(decision).toBeDefined();
    if (decision !== undefined) {
      declined.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.req.decisionId,
        response: { kind: "optional", accept: false },
      });
    }
    await pending;
    expect(alive(declined.state.players[1] as PlayerState, declinedTarget)).toBe(true);
    expect((declined.state.players[0] as PlayerState).trash.some((card) => card.cardId === "BT1-013")).toBe(false);

    const unpaid = setupEngine(
      {
        0: { battleArea: [{ card: CARD, as: "witchmon" }], trash: [TITAN_DIGIMON] },
        1: { battleArea: [{ card: LEVEL_FIVE, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const unpaidTarget = unpaid.perm("target").permanentId;
    await fireTiming(unpaid, EffectTiming.OnPlay, {
      subjectPermanentId: unpaid.perm("witchmon").permanentId,
      enteredByEffect: 0,
    });
    await settle(() => false, 60);
    expect(alive(unpaid.state.players[1] as PlayerState, unpaidTarget)).toBe(true);

    const noTarget = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD, as: "witchmon" }],
          hand: [{ card: "BT1-013", as: "cost" }],
          trash: [NON_TITAN],
        },
        1: { battleArea: [{ card: LEVEL_FIVE, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const noTargetId = noTarget.perm("target").permanentId;
    await fireTiming(noTarget, EffectTiming.OnPlay, {
      subjectPermanentId: noTarget.perm("witchmon").permanentId,
      enteredByEffect: 0,
    });
    await settle(() => false, 60);
    expect(alive(noTarget.state.players[1] as PlayerState, noTargetId)).toBe(true);
    expect((noTarget.state.players[0] as PlayerState).hand).toHaveLength(1);
  });

  it("shares one Once Per Turn use between On Play and When Attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD, as: "witchmon" }],
          hand: [
            { card: "BT1-013", as: "cost1" },
            { card: "BT1-013", as: "cost2" },
          ],
          trash: [{ card: TITAN_DIGIMON, as: "titan1" }],
        },
        1: { battleArea: [{ card: LEVEL_FIVE, as: "first" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const opponent = s.state.players[1] as PlayerState;
    const firstId = s.perm("first").permanentId;
    await fireTiming(s, EffectTiming.OnPlay, { subjectPermanentId: s.perm("witchmon").permanentId });
    await settle(() => false, 60);
    expect(alive(opponent, firstId)).toBe(true);

    // Manual entry does not satisfy the After gate, but still consumes the shared activation.
    s.give(0, Zone.Trash, { card: TITAN_DIGIMON, as: "titan2" });
    s.putOnBoard(1, { card: LEVEL_FIVE, as: "second" });
    await fireTiming(s, EffectTiming.OnUseAttack, { subjectPermanentId: s.perm("witchmon").permanentId });
    await settle(() => false, 60);
    expect(alive(opponent, s.perm("second").permanentId)).toBe(true);
  });

  it("lets a previously effect-entered Witchmon resolve its When Attacking After clause", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD, as: "witchmon" }],
          hand: [{ card: "BT1-013", as: "cost" }],
          trash: [TITAN_DIGIMON],
        },
        1: { battleArea: [{ card: LEVEL_FIVE, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    // This is the persisted producer marker set by GameEngine.fireEnteredByEffectTiming when
    // an effect plays/digivolves the current top; the attack window itself has no transient
    // enteredByEffect trigger payload.
    s.perm("witchmon").enteredByEffect = true;
    await fireTiming(s, EffectTiming.OnUseAttack, { subjectPermanentId: s.perm("witchmon").permanentId });
    await settle(() => !alive(s.state.players[1] as PlayerState, targetId));
    expect(alive(s.state.players[1] as PlayerState, targetId)).toBe(false);
  });

  it("fires the inherited effect once only for a live Titan host, not merely a Titan card in its stack", async () => {
    const positive = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-015", as: "host", under: [{ card: "BT24-009" }, { card: CARD }] }],
          hand: [{ card: "BT1-013", as: "handCard" }],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "level3" },
            { card: LEVEL_FIVE, as: "level5" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const positiveOpponent = positive.state.players[1] as PlayerState;
    const positiveLevel3Id = positive.perm("level3").permanentId;
    const positiveLevel5Id = positive.perm("level5").permanentId;
    await positive.engine.recomputeContinuousEffects();
    await trash(positive, positive.inst("handCard").instanceId);
    await settle(() => !alive(positiveOpponent, positiveLevel3Id));
    expect(alive(positiveOpponent, positiveLevel5Id)).toBe(true);

    const negative = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-114", as: "host", under: [{ card: "BT24-019" }, { card: CARD }] }],
          hand: [{ card: "BT1-013", as: "handCard" }],
        },
        1: { battleArea: [{ card: "BT1-013", as: "level3" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const negativeTarget = negative.perm("level3").permanentId;
    await negative.engine.recomputeContinuousEffects();
    await trash(negative, negative.inst("handCard").instanceId);
    await settle(() => false, 60);
    expect(alive(negative.state.players[1] as PlayerState, negativeTarget)).toBe(true);
  });
});
