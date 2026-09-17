import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function durandamonBt3Demo(_effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const host = permanent("demo-durandamon-host", "BT3-019", 0, 13000);
  host.keywords.push("SecurityAttack", "Reboot");
  host.stack.push(card("demo-durandamon-inherited", "BT3-016", 0));
  you.battleArea.push(host);
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-016",
        effectKey: "BT3-016/inherited-piercing",
        description: "Durandamon grants Piercing to the Digimon it is under.",
        timing: "Inherited",
      },
    ],
  };
}
