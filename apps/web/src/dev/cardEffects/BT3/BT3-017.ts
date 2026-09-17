import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function valkyrimonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const source = permanent("demo-valkyrimon", "BT3-017", 0, 9000);
  const target = permanent("demo-valkyrimon-target", "BT2-024", 1, effect === "above-limit" ? 5000 : 4000);
  you.battleArea.push(source);
  opponent.battleArea.push(target);
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-017",
        effectKey: `BT3-017/${effect ?? "resolved"}`,
        description:
          effect === "above-limit"
            ? "Valkyrimon did not delete the opposing 5000 DP Digimon (limit is 4000 DP)."
            : "Valkyrimon deleted the opposing Digimon at 4000 DP or less.",
        timing: effect === "attacking" ? "WhenAttacking" : "WhenDigivolving",
      },
    ],
  };
}
