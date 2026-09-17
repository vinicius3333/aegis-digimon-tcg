import { GameState, Phase } from "@aegis/shared";
import { card, player, type CardEffectsFixture } from "../fixture";

export function zubamonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const both = effect === "both-ragna";
  const onlyRagna = effect === "only-ragna";
  you.deckCount = both ? 3 : onlyRagna ? 4 : 3;
  if (both) {
    you.hand.push(card("demo-zubamon-ragna-a", "BT3-019", 0), card("demo-zubamon-ragna-b", "BT3-019", 0));
  } else if (onlyRagna) you.hand.push(card("demo-zubamon-ragna-only", "BT3-019", 0));
  else you.hand.push(card("demo-zubamon-ragna", "BT3-019", 0), card("demo-zubamon-legend-arms", "BT3-010", 0));
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-008",
        effectKey: `BT3-008/${effect ?? "both-categories"}`,
        description: both
          ? "Zubamon revealed two RagnaLoardmon cards that each satisfied a category and added both to hand."
          : onlyRagna
            ? "Zubamon revealed only a RagnaLoardmon target, so it added one card and bottom-decked the other four."
            : "Zubamon added one RagnaLoardmon and one Legend-Arms Digimon, then bottom-decked the remaining cards.",
        timing: "OnPlay",
      },
    ],
  };
}
