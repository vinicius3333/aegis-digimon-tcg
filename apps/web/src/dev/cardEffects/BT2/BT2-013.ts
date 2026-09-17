import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function growlmonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const attacker = permanent("demo-growlmon-bt2-host", "BT2-016", 0, 7000, [
    { instanceId: "demo-growlmon-bt2-source", cardId: "BT2-013" },
  ]);
  attacker.isSuspended = effect !== null;
  you.battleArea.push(attacker);
  if (effect === "deleted-2000") {
    opponent.battleArea.push(permanent("demo-growlmon-bt2-other", "BT1-011", 1, 2000));
    opponent.trash.push(card("demo-growlmon-bt2-deleted", "BT1-010", 1));
  } else if (effect === "spared-3000") {
    opponent.battleArea.push(permanent("demo-growlmon-bt2-spared", "BT1-010", 1, 3000));
  }
  opponent.securityCount = effect === null ? 5 : 4;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "deleted-2000": "When its host attacked, Growlmon deleted exactly 1 opposing Digimon at the 2000 DP boundary.",
    "spared-3000": "The opposing Digimon had 3000 DP, so Growlmon's inherited deletion did not affect it.",
    "no-target":
      "With no opposing Digimon to delete, Growlmon's inherited effect resolved and the attack continued normally.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-013",
        effectKey: "BT2-013/delete-2000-dp",
        description: descriptions[effect] ?? "BT2-013 Growlmon resolved.",
        timing: "When Attacking",
      },
    ],
  };
}
