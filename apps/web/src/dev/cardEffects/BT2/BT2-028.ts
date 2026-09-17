import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function aeroVeedramonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "active-phase" ? Phase.Active : Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const inherited =
    effect?.startsWith("inherited-") === true ||
    effect === "q1004-already-active" ||
    effect === "active-phase" ||
    effect === "opponent-turn";
  if (inherited) {
    const host = permanent("demo-aeroveedramon-bt2-host", "BT2-030", 0, 11000, [
      { instanceId: "demo-aeroveedramon-bt2-source", cardId: "BT2-028" },
    ]);
    host.isSuspended = false;
    you.battleArea.push(host);
  } else {
    const aero = permanent("demo-aeroveedramon-bt2", "BT2-028", 0, 7000);
    aero.isSuspended = effect === "no-blue-tamer";
    you.battleArea.push(aero);
    if (effect !== "no-blue-tamer") {
      you.battleArea.push(permanent("demo-aeroveedramon-bt2-tamer", "BT1-086", 0, 0));
    }
    if (effect === "other-unsuspended") {
      you.battleArea.push(permanent("demo-aeroveedramon-bt2-other", "BT2-025", 0, 3000));
    }
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "other-unsuspended": "With an allied blue Tamer, AeroVeedramon unsuspended another selected blue Digimon.",
    "q1003-self": "AeroVeedramon digivolved while suspended and selected itself to unsuspend (Q1003).",
    "no-blue-tamer": "Without an allied blue Tamer, AeroVeedramon's When Digivolving unsuspend did not activate.",
    "inherited-main": "Its host really unsuspended during the owner's main phase and gained Jamming for the turn.",
    "q1004-already-active":
      "An unsuspend effect targeted the already active host, so no unsuspend occurred and it gained no Jamming (Q1004).",
    "active-phase":
      "The host unsuspended during the Active phase, so AeroVeedramon's main-phase inherited effect did not grant Jamming.",
    "opponent-turn":
      "The host unsuspended during the opponent's turn, so AeroVeedramon's Your Turn effect did not grant Jamming.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-028",
        effectKey: inherited ? "BT2-028/main-phase-jamming" : "BT2-028/blue-unsuspend",
        description: descriptions[effect] ?? "BT2-028 AeroVeedramon resolved.",
        timing: inherited ? "Your Turn" : "When Digivolving",
      },
    ],
  };
}
