import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function blackWarGreymonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = effect === "play-reduced" ? 0 : effect === "play-full-cost" ? -6 : 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "play-reduced" || effect === "play-full-cost") {
    you.battleArea.push(permanent("demo-blackwar-played", "BT2-112", 0, 12000));
    opponent.battleArea.push(
      permanent(
        "demo-blackwar-threshold",
        effect === "play-reduced" ? "BT1-084" : "BT2-046",
        1,
        effect === "play-reduced" ? 10000 : 9000,
      ),
    );
  } else {
    const blackwar = permanent("demo-blackwar-attacker", "BT2-112", 0, 20000);
    blackwar.isSuspended = effect === "attack-lower";
    you.battleArea.push(blackwar);
    const highest = permanent("demo-blackwar-highest-a", "BT1-074", 1, 11000);
    const tied = permanent("demo-blackwar-highest-b", "BT1-074", 1, 11000);
    const lower = permanent("demo-blackwar-lower", "BT1-010", 1, 2000);
    highest.isSuspended = true;
    tied.isSuspended = true;
    lower.isSuspended = true;
    opponent.battleArea.push(highest, tied, lower);
  }
  state.players.push(you, opponent);
  const selected = effect ?? "attack-highest";
  const descriptions: Record<string, string> = {
    "play-reduced":
      "An opposing 10000 DP Digimon reduced BlackWarGreymon's 13 play cost by 6, moving memory from +7 to 0.",
    "play-full-cost":
      "With every opposing Digimon below 10000 DP, BlackWarGreymon paid its full 13 cost and moved memory from +7 to -6.",
    "attack-highest":
      "BlackWarGreymon attacked either tied highest-DP opposing Digimon and unsuspended, even though its own 20000 DP was higher.",
    "attack-lower": "BlackWarGreymon attacked a lower-DP opposing Digimon and remained suspended.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-112",
        effectKey: `BT2-112/${selected}`,
        description: descriptions[selected]!,
        timing: selected.startsWith("play-") ? "Static" : "WhenAttacking",
      },
    ],
  };
}
