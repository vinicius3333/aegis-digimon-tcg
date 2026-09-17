import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function argomonEggBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "main-phase" ? Phase.Main : Phase.Active;
  state.turnCount = 5;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = effect === "active-unsuspend" ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const host = permanent("demo-argomon-egg-host", "BT2-043", 0, 3000, [
    { instanceId: "demo-argomon-egg-source", cardId: "BT2-004" },
  ]);
  host.isSuspended = effect === null;
  you.battleArea.push(host);
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "active-unsuspend": "Argomon's host really unsuspended during its owner's Active phase, gaining 1 memory.",
    "q994-already-active":
      "Argomon's host was already active, so the Active phase did not unsuspend it and no memory was gained (Q994).",
    "main-phase":
      "The host unsuspended during the Main phase, outside Argomon's required unsuspend phase, so no memory was gained.",
    "opponent-turn":
      "The host unsuspended during the opponent's Active phase, so Argomon's Your Turn effect did not activate.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-004",
        effectKey: "BT2-004/active-phase-unsuspend",
        description: descriptions[effect] ?? "BT2-004 Argomon resolved.",
        timing: "Your Turn",
      },
    ],
  };
}
