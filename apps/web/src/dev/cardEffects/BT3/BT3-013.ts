import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function duramonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const levelSeven = effect !== "level-six";
  const host = permanent("demo-duramon-host", levelSeven ? "BT1-084" : "BT3-111", 0, levelSeven ? 15000 : 12000);
  host.stack.push(card("demo-duramon-source", "BT3-013", 0));
  if (levelSeven && effect !== "opponent-turn") host.keywords.push("SecurityAttack+1");
  you.battleArea.push(host);
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-013",
        effectKey: `BT3-013/${effect ?? "level-seven"}`,
        description:
          levelSeven && effect !== "opponent-turn"
            ? "Duramon grants its level 7 host Security Attack +1 during its controller's turn."
            : "Duramon's inherited level 7 aura is inactive in this state.",
        timing: "YourTurn",
      },
    ],
  };
}
