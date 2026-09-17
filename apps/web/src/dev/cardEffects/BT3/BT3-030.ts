import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function leopardmonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const leopard = permanent("demo-bt3-030-leopardmon", "BT3-030", 0, 11000);
  leopard.stack.push(card("demo-bt3-030-playable", "AD1-010", 0));
  const ally = permanent("demo-bt3-030-ally", "BT1-027", 0, 4000);
  ally.keywords.push("Jamming");
  you.battleArea.push(leopard, ally);
  if (effect === "resolved") you.battleArea.push(permanent("demo-bt3-030-played", "AD1-010", 0, 4000));
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-030",
        effectKey: `BT3-030/${effect ?? "resolved"}`,
        description:
          effect === "declined"
            ? "Leopardmon's optional level 4-or-lower digivolution-card play was declined; your eligible Digimon still have Jamming this turn."
            : "Leopardmon played a level 4 digivolution card for free; your eligible Digimon gained Jamming this turn.",
        timing: "WhenDigivolving",
      },
    ],
  };
}
