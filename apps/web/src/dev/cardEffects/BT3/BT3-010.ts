import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function zubaEagermonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const levelSeven = effect === "level-seven" || effect === null || effect === "opponent-turn";
  const host = permanent("demo-zubaeagermon-host", levelSeven ? "BT1-084" : "BT3-111", 0, levelSeven ? 15000 : 12000);
  host.stack.push(card("demo-zubaeagermon-source", "BT3-010", 0));
  if (levelSeven && effect !== "opponent-turn") host.keywords.push("SecurityAttack+1");
  you.battleArea.push(host);
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-010",
        effectKey: `BT3-010/${effect ?? "level-seven"}`,
        description:
          effect === "opponent-turn"
            ? "ZubaEagermon's level 7 host is on the opponent's turn, so the inherited Security Attack +1 aura is inactive."
            : levelSeven
              ? "ZubaEagermon grants its level 7 host Security Attack +1 during its controller's turn."
              : "ZubaEagermon's level 6 host does not satisfy the level 7 condition.",
        timing: "YourTurn",
      },
    ],
  };
}
