import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function stingmonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 1;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const host = permanent("demo-bt3-052-host", "BT3-052", 0, 7000);
  host.stack.push(card("demo-bt3-050-inherited", "BT3-050", 0));
  you.battleArea.push(host);
  if (effect !== "second") opponent.battleArea.push(permanent("demo-bt3-050-defender", "BT1-010", 1, 1000));
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-050",
        effectKey: `BT3-050/${effect ?? "resolved"}`,
        description:
          effect === "second"
            ? "Stingmon's Once Per Turn inherited memory gain did not trigger again."
            : "Stingmon gained 1 memory after its host deleted an opposing Digimon in battle and survived.",
        timing: "YourTurn",
      },
    ],
  };
}
