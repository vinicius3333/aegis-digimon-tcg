import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function megaSeadramonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const attacker = permanent("demo-megaseadramon-bt2", "BT2-029", 0, 8000);
  attacker.isSuspended = effect !== null;
  you.battleArea.push(attacker);
  opponent.battleArea.push(permanent("demo-megaseadramon-bt2-source-less", "BT1-072", 1, 6000));
  if (effect === "q1005-mixed") {
    opponent.trash.push(card("demo-megaseadramon-bt2-sourced-blocker", "BT1-072", 1));
    opponent.securityCount = 5;
  } else {
    opponent.securityCount = effect === "only-source-less" ? 4 : 5;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "q1005-mixed":
      "MegaSeadramon rejected the source-less Blocker, while the sourced Blocker remained legal and redirected the attack (Q1005).",
    "only-source-less":
      "Every opposing Blocker was source-less, so no legal blocker window opened and MegaSeadramon's player attack checked security.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-029",
        effectKey: "BT2-029/source-less-unblockable",
        description: descriptions[effect] ?? "BT2-029 MegaSeadramon resolved.",
        timing: "Your Turn",
      },
    ],
  };
}
