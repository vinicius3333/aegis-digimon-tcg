import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function sealsdramonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "inherited") {
    const host = permanent("demo-sealsdramon-host", "EX3-050", 0, 7000, [
      { instanceId: "demo-sealsdramon-source", cardId: "EX3-049" },
    ]);
    const commandramon = permanent("demo-sealsdramon-commandramon", "EX3-046", 0, 2000);
    commandramon.grantedKeywords.push("Rush");
    commandramon.canAttackPlayer = true;
    you.battleArea.push(host, commandramon);
  } else {
    const sealsdramon = permanent("demo-sealsdramon", "EX3-049", 0, 4000);
    sealsdramon.grantedKeywords.push("Jamming");
    you.battleArea.push(sealsdramon);
  }
  opponent.battleArea.push(permanent("demo-sealsdramon-opponent", "EX3-044", 1, 11000));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  return { state };
}
