import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function metalSeadramonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === null ? 11 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === null) {
    you.hand.push(card("demo-metalseadramon-bt2-hand", "BT2-030", 0));
    you.handCount = 1;
  } else {
    const metalSeadramon = permanent("demo-metalseadramon-bt2", "BT2-030", 0, 10000);
    metalSeadramon.isSuspended = effect === "q1006-mixed" || effect === "only-source-less";
    you.battleArea.push(metalSeadramon);
  }
  if (effect === "on-play-return") {
    opponent.hand.push(
      card("demo-metalseadramon-bt2-returned-a", "BT1-070", 1),
      card("demo-metalseadramon-bt2-returned-b", "BT1-036", 1),
    );
    opponent.handCount = 2;
    opponent.trash.push(
      card("demo-metalseadramon-bt2-source-a", "BT1-001", 1),
      card("demo-metalseadramon-bt2-source-b", "BT1-003", 1),
    );
    opponent.battleArea.push(permanent("demo-metalseadramon-bt2-level-five", "BT1-074", 1, 7000));
  } else {
    opponent.battleArea.push(permanent("demo-metalseadramon-bt2-source-less", "BT1-072", 1, 6000));
    if (effect === "q1006-mixed") {
      opponent.trash.push(card("demo-metalseadramon-bt2-sourced-blocker", "BT1-072", 1));
      opponent.securityCount = 5;
    } else {
      opponent.securityCount = effect === "only-source-less" ? 4 : 5;
    }
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "on-play-return":
      "MetalSeadramon returned both level 4 Digimon, trashed their sources, left the level 5 in play, and remained in play itself.",
    "q1006-mixed":
      "MetalSeadramon rejected the source-less Blocker, while the sourced Blocker remained legal and redirected the attack (Q1006).",
    "only-source-less":
      "Every opposing Blocker was source-less, so no legal blocker window opened and MetalSeadramon's player attack checked security.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-030",
        effectKey: effect === "on-play-return" ? "BT2-030/on-play-return" : "BT2-030/source-less-unblockable",
        description: descriptions[effect] ?? "BT2-030 MetalSeadramon resolved.",
        timing: effect === "on-play-return" ? "On Play" : "Your Turn",
      },
    ],
  };
}
