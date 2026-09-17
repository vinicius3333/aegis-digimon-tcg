import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function lopmonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const lopmon = permanent("demo-bt3-034-lopmon", "BT3-034", 0, 2000);
  if (effect === "resolved")
    you.hand.push(card("demo-bt3-034-security", "BT1-009", 0), card("demo-bt3-034-draw", "BT1-010", 0));
  else {
    you.security.push(card("demo-bt3-034-security", "BT1-009", 0));
    you.deck.push(card("demo-bt3-034-draw", "BT1-010", 0));
  }
  you.battleArea.push(lopmon);
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-034",
        effectKey: `BT3-034/${effect ?? "resolved"}`,
        description:
          effect === "declined"
            ? "Lopmon's optional security-to-hand move was declined; no Draw 1 occurred."
            : "Lopmon added the top security card to hand and triggered Draw 1.",
        timing: "OnPlay",
      },
    ],
  };
}
