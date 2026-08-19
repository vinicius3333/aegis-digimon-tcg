import { describe, it, expect } from "vitest";
import { EffectTiming, type CardInstance } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js"; // register compiled cards so the real activate / OnEndTurn paths run


const SIBLINGS = ["EX10-012", "EX10-020", "EX10-057"] as const;

/** The OnDeclaration effectKey for the card's [Hand][Main] reduced-cost play. */
function reducedCostPlayEffectKey(s: EngineSetup, instance: CardInstance, cardId: string): string {
  const source = (
    s.engine as unknown as { cardSourceOf(i: CardInstance): CardSource }
  ).cardSourceOf(instance);
  const found = effectsOf(EffectTiming.OnDeclaration, source).find((e) =>
    e.effectKey.startsWith(`${cardId}/`),
  );
  if (found === undefined) throw new Error(`${cardId} surfaces no [Hand][Main] activated effect`);
  return found.effectKey;
}

async function fireOnPlayForInstance(s: EngineSetup, instanceId: string): Promise<void> {
  await (
    s.engine as unknown as { fireTimingForInstance(t: EffectTiming, id: string): Promise<void> }
  ).fireTimingForInstance(EffectTiming.OnPlay, instanceId);
}

async function fireEndTurn(s: EngineSetup): Promise<void> {
  await (s.engine as unknown as { fireTiming(t: EffectTiming): Promise<void> }).fireTiming(
    EffectTiming.OnEndTurn,
  );
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
    s.state.memory = 0; // the turn player can afford up to memory + 10

    const effectKey = reducedCostPlayEffectKey(s, inHand, cardId);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: inHand.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => onField(s, inHand.instanceId));

    // Played from hand for 11 − 5 = 6.
    expect(onField(s, inHand.instanceId)).toBe(true);
    expect(p0.hand.some((c) => c.instanceId === inHand.instanceId)).toBe(false);
    expect(s.state.memory).toBe(-6);
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
