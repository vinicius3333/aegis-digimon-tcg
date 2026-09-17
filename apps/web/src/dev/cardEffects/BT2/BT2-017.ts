import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function warGrowlmonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "inherited-opponent-turn" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const inherited = effect?.startsWith("inherited-") === true;
  if (inherited) {
    const boosted = effect === "inherited-threshold";
    you.battleArea.push(
      permanent("demo-wargrowlmon-bt2-host", "BT2-020", 0, boosted ? 11000 : 10000, [
        { instanceId: "demo-wargrowlmon-bt2-source", cardId: "BT2-017" },
      ]),
    );
    const trashCount = effect === "inherited-below" ? 4 : 5;
    for (let index = 0; index < trashCount; index += 1) {
      opponent.trash.push(card(`demo-wargrowlmon-bt2-trash-${index}`, "BT1-010", 1));
    }
  } else {
    you.battleArea.push(permanent("demo-wargrowlmon-bt2", "BT2-017", 0, 8000));
    you.battleArea.push(
      permanent("demo-wargrowlmon-bt2-tamer", effect === "no-red-tamer" ? "BT1-086" : "BT1-085", 0, 0),
    );
    if (effect === "digivolve-delete") {
      opponent.trash.push(card("demo-wargrowlmon-bt2-deleted", "BT1-010", 1));
    } else {
      opponent.battleArea.push(
        permanent("demo-wargrowlmon-bt2-target", "BT1-010", 1, effect === "dp-too-high" ? 3001 : 3000),
      );
    }
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "digivolve-delete": "With an allied red Tamer, WarGrowlmon deleted an opposing Digimon at the 3000 DP boundary.",
    "no-red-tamer":
      "The allied Tamer was blue, so WarGrowlmon's conditional When Digivolving deletion did not activate.",
    "dp-too-high": "The opposing Digimon had 3001 DP, so it was outside WarGrowlmon's deletion range.",
    "inherited-threshold":
      "At exactly 5 cards in the opponent's trash during its owner's turn, WarGrowlmon granted its host +1000 DP.",
    "inherited-below": "With only 4 cards in the opponent's trash, WarGrowlmon's inherited DP bonus stayed inactive.",
    "inherited-opponent-turn":
      "At the trash threshold on the opponent's turn, WarGrowlmon's Your Turn inherited bonus stayed inactive.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-017",
        effectKey: inherited ? "BT2-017/opponent-trash-dp" : "BT2-017/red-tamer-delete",
        description: descriptions[effect] ?? "BT2-017 WarGrowlmon resolved.",
        timing: inherited ? "Your Turn" : "When Digivolving",
      },
    ],
  };
}
