import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function herculesKabuterimonDemo(effect: string | null): CardEffectsFixture {
  const effectText = "[End of Attack][Twice Per Turn] You can unsuspend this Digimon by decreasing your memory by 3.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "turn-passed" ? Phase.Active : Phase.Main;
  state.turnCount = effect === "turn-passed" ? 6 : 5;
  state.turnSeat = effect === "turn-passed" ? 1 : 0;
  state.memory = effect === "turn-passed" ? 1 : effect === "unsuspended" ? 0 : 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const hercules = permanent("demo-hercules-kabuterimon", "BT1-081", 0, 10000);
  hercules.keywords.push("Piercing");
  hercules.isSuspended = effect !== "unsuspended" && effect !== "turn-passed";
  you.battleArea.push(hercules);
  opponent.handCount = 5;
  if (effect === "piercing") {
    opponent.securityCount = 4;
    opponent.trash.push(card("demo-hercules-defender", "BT1-016", 1));
  }
  state.players.push(you, opponent);

  if (effect === null) {
    return {
      state,
      decision: {
        decisionId: "demo-hercules-unsuspend-optional",
        seat: 0,
        kind: "optional",
        promptText: "Lose 3 memory to unsuspend HerculesKabuterimon?",
        sourceCardId: "BT1-081",
        options: { timing: "EndOfAttack", effectText },
      },
    };
  }
  if (effect === "ineligible") return { state };

  const descriptions: Record<string, string> = {
    piercing: "Piercing performed a security check after HerculesKabuterimon won the battle and survived.",
    unsuspended: "HerculesKabuterimon lost 3 memory and unsuspended at end of attack.",
    "turn-passed": "After the attack ended with memory across zero, the turn passed to the opponent.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-081",
        effectKey: effect === "piercing" ? "BT1-081/piercing" : "BT1-081/unsuspend",
        description: descriptions[effect] ?? effectText,
        timing: effect === "piercing" ? "After Battle" : "End of Attack",
      },
    ],
  };
}
