import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function argomonUltimateBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "digisorption" ? 5 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "digisorption") {
    you.battleArea.push(
      permanent("demo-argomon-ultimate-bt2", "BT2-047", 0, 6000),
      permanent("demo-argomon-ultimate-bt2-payer", "BT2-043", 0, 1000),
    );
    you.battleArea[1]!.isSuspended = true;
  } else {
    you.battleArea.push(
      permanent("demo-argomon-ultimate-bt2-host", "BT2-050", 0, 11000, [
        { instanceId: "demo-argomon-ultimate-bt2-source", cardId: "BT2-047" },
      ]),
    );
    if (effect === "q1018-on-play") {
      const palmon = permanent("demo-argomon-ultimate-bt2-palmon", "BT1-067", 0, 2000);
      palmon.isSuspended = true;
      you.battleArea.push(palmon);
      you.hand.push(card("demo-argomon-ultimate-bt2-found-level-four", "BT2-044", 0));
      you.handCount = 1;
    } else if (effect === "declined") {
      you.hand.push(card("demo-argomon-ultimate-bt2-candidate", "BT2-043", 0));
      you.handCount = 1;
    }
  }
  opponent.securityCount = effect === "q1018-on-play" || effect === "declined" ? 4 : 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    digisorption: "Digisorption -3 suspended an allied Digimon and reduced Argomon's 3-memory evolution cost to 0.",
    "q1018-on-play":
      "Q1018: the inherited effect played Palmon suspended, then Palmon's On Play effect added Tyrannomon to hand.",
    declined: "The optional inherited play was declined, leaving the eligible green level 3 in hand.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-047",
        effectKey: effect === "digisorption" ? "BT2-047/digisorption" : "BT2-047/inherited-play",
        description: descriptions[effect] ?? "Argomon's conditional effect state is displayed.",
        timing: effect === "digisorption" ? "When Digivolving" : "When Attacking",
      },
    ],
  };
}
