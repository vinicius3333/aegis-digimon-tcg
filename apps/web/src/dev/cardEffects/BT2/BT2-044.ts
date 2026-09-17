import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function tyrannomonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-tyrannomon-bt2", "BT2-044", 0, 4000));
  if (effect === "both-categories") {
    you.hand.push(
      card("demo-tyrannomon-bt2-added-digimon", "BT2-047", 0),
      card("demo-tyrannomon-bt2-added-tamer", "BT1-089", 0),
    );
    you.handCount = 2;
  } else if (effect === "q1016-one-category") {
    you.hand.push(card("demo-tyrannomon-bt2-added-tamer", "BT1-089", 0));
    you.handCount = 1;
  }
  opponent.securityCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-044",
        effectKey: "BT2-044/when-digivolving-reveal",
        description:
          effect === "q1016-one-category"
            ? "Q1016: the reveal contained only an eligible green Tamer category, so that card was still added to hand."
            : "Tyrannomon added 1 level 5-or-lower Digimon and 1 green Tamer from the 3 revealed cards.",
        timing: "When Digivolving",
      },
    ],
  };
}
