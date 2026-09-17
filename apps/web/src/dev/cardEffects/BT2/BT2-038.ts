import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function rizeGreymonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponents-turn" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "played-tamer") {
    you.battleArea.push(
      permanent("demo-rizegreymon-bt2", "BT2-038", 0, 7000),
      permanent("demo-rizegreymon-bt2-existing-tamer", "BT2-087", 0, 0),
      permanent("demo-rizegreymon-bt2-played-tamer", "BT1-087", 0, 0),
    );
    you.securityCount = 5;
  } else {
    you.battleArea.push(
      permanent("demo-rizegreymon-bt2-host", "BT2-041", 0, 11000, [
        { instanceId: "demo-rizegreymon-bt2-source", cardId: "BT2-038" },
      ]),
      permanent("demo-rizegreymon-bt2-tamer-a", "BT1-087", 0, 0),
      permanent("demo-rizegreymon-bt2-tamer-b", "BT1-087", 0, 0),
    );
    if (effect !== "two-yellow-tamers") {
      you.battleArea.push(permanent("demo-rizegreymon-bt2-tamer-c", "BT1-087", 0, 0));
    }
  }
  opponent.securityCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "played-tamer":
      "RizeGreymon played T.K. Takaishi for free; that specific Tamer's On Play effect was suppressed, leaving security unchanged.",
    "three-yellow-tamers":
      "With 3 yellow Tamers in play on its controller's turn, RizeGreymon's inherited effect grants Security Attack +1.",
    "two-yellow-tamers": "With only 2 yellow Tamers, the inherited Security Attack +1 condition is not met.",
    "opponents-turn": "Three yellow Tamers are present, but the inherited bonus is inactive on the opponent's turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-038",
        effectKey: effect === "played-tamer" ? "BT2-038/play-tamer" : "BT2-038/inherited-security-attack",
        description: descriptions[effect] ?? "RizeGreymon's conditional effect state is displayed.",
        timing: effect === "played-tamer" ? "When Digivolving" : "Your Turn",
      },
    ],
  };
}
