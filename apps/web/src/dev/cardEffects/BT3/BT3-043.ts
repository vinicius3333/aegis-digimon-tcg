import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function kentaurosmonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const source = permanent("demo-bt3-043-kentaurosmon", "BT3-043", 0, 11000);
  const first = permanent("demo-bt3-043-first", "BT2-020", 1, effect === "deletion" ? 2000 : 6000);
  const second = permanent("demo-bt3-043-second", "BT2-017", 1, 5000);
  if (effect !== "deletion") {
    first.keywords.push("SecurityAttack");
    second.keywords.push("SecurityAttack");
  }
  you.battleArea.push(source);
  opponent.battleArea.push(first, second);
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-043",
        effectKey: `BT3-043/${effect ?? "digivolving"}`,
        description:
          effect === "deletion"
            ? "On Deletion, Kentaurosmon gave one opposing Digimon -11000 DP for the turn."
            : "Kentaurosmon gave up to five opposing Digimon Security Attack -2 until the end of the opponent's next turn.",
        timing: effect === "deletion" ? "OnDeletion" : "WhenDigivolving",
      },
    ],
  };
}
