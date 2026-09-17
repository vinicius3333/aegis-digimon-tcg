import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function aquilamonBt3Demo(_effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const host = permanent("demo-aquilamon-host", "BT3-015", 0, 5000);
  host.stack.push(card("demo-aquilamon-source", "BT3-012", 0));
  host.isSuspended = true;
  const eligible = permanent("demo-aquilamon-eligible", "BT1-010", 1, 2000);
  const other = permanent("demo-aquilamon-other", "BT1-011", 1, 1000);
  const tooLarge = permanent("demo-aquilamon-too-large", "BT1-010", 1, 2001);
  you.battleArea.push(host);
  opponent.battleArea.push(eligible, other, tooLarge);
  state.players.push(you, opponent);
  return {
    state,
    decision: {
      decisionId: "demo-aquilamon-selection",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Delete 1 opposing Digimon with 2000 DP or less",
      sourceCardId: "BT3-012",
      options: {
        candidateInstanceIds: [eligible.permanentId, other.permanentId],
        visibleInstanceIds: [eligible.permanentId, other.permanentId, tooLarge.permanentId],
        min: 1,
        max: 1,
        timing: "WhenAttacking",
        effectText: "[When Attacking] Delete 1 of your opponent's Digimon with 2000 DP or less.",
      },
    },
  };
}
