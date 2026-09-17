import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function metalGreymonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const host = permanent("demo-metalgreymon-host", "BT3-015", 0, 7000);
  host.keywords.push("Piercing");
  you.battleArea.push(host);
  if (effect === "resolved") you.hand.push(card("demo-metalgreymon-returned", "BT2-083", 0));
  else you.trash.push(card("demo-metalgreymon-trash-target", "BT2-083", 0));
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-015",
        effectKey: `BT3-015/${effect ?? "resolved"}`,
        description:
          effect === "declined"
            ? "MetalGreymon's optional return was declined; the level 7 Virus Digimon remained in trash."
            : "MetalGreymon returned a level 7 Virus Digimon from trash to hand and retains Piercing.",
        timing: "WhenDigivolving",
      },
    ],
  };
}
