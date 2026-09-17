import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function demiVeemonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "active-phase" ? Phase.Active : Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const boosted = effect === "main-unsuspend" || effect === "second-unsuspend";
  const host = permanent("demo-demiveemon-host", "BT2-012", 0, boosted ? 5000 : 4000, [
    { instanceId: "demo-demiveemon-source", cardId: "BT2-002" },
  ]);
  host.isSuspended = effect === null;
  you.battleArea.push(host);
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "main-unsuspend":
      "DemiVeemon's host really became unsuspended during its owner's main phase and gained +1000 DP for the turn.",
    "q993-already-active":
      "An unsuspend effect targeted an already active host, so no unsuspend occurred and DemiVeemon did not activate (Q993).",
    "active-phase":
      "The host unsuspended during the Active phase, so DemiVeemon's main-phase trigger did not activate.",
    "second-unsuspend":
      "After a second real unsuspend in the same main phase, DemiVeemon remained at only +1000 DP because it is Once Per Turn.",
    "opponent-turn": "The host unsuspended on the opponent's turn, so DemiVeemon's Your Turn effect did not activate.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-002",
        effectKey: "BT2-002/main-phase-unsuspend",
        description: descriptions[effect] ?? "BT2-002 DemiVeemon resolved.",
        timing: "Your Turn",
      },
    ],
  };
}
