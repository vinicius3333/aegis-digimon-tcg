import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js"; // register compiled cards so the real OnPlay / OnEndTurn paths run

/**
 * A3 for EX11-022 Karakurumon:
 *
 *   [On Play] [When Digivolving] You may play 1 [Puppet] trait Digimon card with 4000 DP or less
 *             from your hand or trash without paying the cost. At turn end, delete the Digimon
 *             this effect played.
 *
 * The delayed delete compiled to a SubTrigger whose Delete carried `filter.playedByThisEffect`
 * (count "all") — a field no engine source reads, so at turn end the effect deleted EVERY
 * permanent instead of the one it played. It now uses the wired `DelayedDelete` action, which
 * arms the engine's turn-end delete watcher on `ctx.lastPlayedPermanentIds`.
 *
 * documented behavior — AddSelfDeleteEffect(playedPermanent, DeleteTiming.AtTurnEnd).
 * KB Q5809: "Do I delete the Digimon that was played by this card's [On Play] [When Digivolving]
 * effect at the end of the turn? — Yes."
 *
 * Card ids: BT13-035 PawnChessmon (Lv.3 [Puppet], 1000 DP — the play target); AD1-001 Greymon
 * (a plain bystander Digimon that must survive the turn-end delete).
 */

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

describe("EX11-022 — [On Play] free [Puppet] play, deleted at turn end", () => {
  it("deletes ONLY the Digimon it played at turn end, leaving the board alone", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-022", as: "me" },
            { card: "AD1-001", as: "bystander" },
          ],
          hand: [{ card: "BT13-035", as: "puppet" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const puppet = s.inst("puppet");
    const meId = s.perm("me").topCard!.instanceId;
    const bystanderId = s.perm("bystander").topCard!.instanceId;

    await fireOnPlayForInstance(s, meId);
    await settle(() => onField(s, puppet.instanceId));
    expect(onField(s, puppet.instanceId)).toBe(true); // the free play happened

    void fireEndTurn(s);
    await settle(() => !onField(s, puppet.instanceId));

    // Exactly the played Digimon dies.
    expect(onField(s, puppet.instanceId)).toBe(false);
    // REVERT-CONFIRM-RED: drop the `DelayedDelete` action => PawnChessmon survives => RED.
    expect(onField(s, meId)).toBe(true);
    expect(onField(s, bystanderId)).toBe(true);
    // REVERT-CONFIRM-RED: restore the SubTrigger + `playedByThisEffect` Delete (count "all") =>
    // the ignored filter matches every permanent => Karakurumon and Greymon are deleted too => RED.
  });

  it("arms nothing when the effect plays no Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-022", as: "me" },
            { card: "AD1-001", as: "bystander" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const meId = s.perm("me").topCard!.instanceId;
    const bystanderId = s.perm("bystander").topCard!.instanceId;

    // No [Puppet] Digimon in hand or trash: the optional play resolves to nothing.
    await fireOnPlayForInstance(s, meId);
    await fireEndTurn(s);

    expect(onField(s, meId)).toBe(true);
    expect(onField(s, bystanderId)).toBe(true);
    // REVERT-CONFIRM-RED: the old always-true `playedByThisEffect` Delete fires at turn end even
    // though nothing was played => both permanents are deleted => RED.
  });
});
