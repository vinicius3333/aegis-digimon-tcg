import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function blitzGreymonBt3Demo(_effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const host = permanent("demo-blitzgreymon", "BT3-018", 0, 12000);
  host.keywords.push("Piercing");
  const target = permanent("demo-blitzgreymon-target", "BT2-020", 1, 6000);
  target.stack.push(card("demo-blitzgreymon-card-1", "BT2-013", 1));
  target.stack.push(card("demo-blitzgreymon-card-2", "BT2-017", 1));
  you.battleArea.push(host);
  opponent.battleArea.push(target);
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-018",
        effectKey: "BT3-018/de-digivolve-2",
        description: "BlitzGreymon De-Digivolved the opposing Digimon by 2 and retains Piercing.",
        timing: "WhenDigivolving",
      },
    ],
  };
}
