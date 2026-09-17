import { GameState, Phase } from "@aegis/shared";
import { card, player, type CardEffectsFixture } from "../fixture";

export function dokugumonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "partial") you.hand.push(card("demo-bt3-051-level-5", "BT3-052", 0));
  else you.hand.push(card("demo-bt3-051-level-5", "BT3-052", 0), card("demo-bt3-051-level-6", "BT3-057", 0));
  you.trash.push(card("demo-bt3-051-remainder", "BT3-050", 0));
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-051",
        effectKey: `BT3-051/${effect ?? "resolved"}`,
        description:
          effect === "partial"
            ? "Dokugumon added the revealed level 5 Digimon; no level 6 candidate was found, and the other revealed cards were trashed."
            : "Dokugumon added one revealed level 5 and one level 6 Digimon, then trashed the remaining reveal.",
        timing: "OnPlay",
      },
    ],
  };
}
