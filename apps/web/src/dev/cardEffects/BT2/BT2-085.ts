import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function joeKidoBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = effect === null || effect === "memory-gained" ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const joe = permanent("demo-joe-bt2", "BT2-085", 0, 0);
  joe.isSuspended = effect === null || effect === "memory-gained";
  you.battleArea.push(joe);
  if (effect === "own-source") {
    you.trash.push(card("demo-joe-bt2-own-source", "BT1-010", 0));
  } else if (effect === "return-disposal") {
    opponent.hand.push(card("demo-joe-bt2-returned", "BT1-019", 1));
    opponent.trash.push(card("demo-joe-bt2-disposed", "BT1-010", 1));
  } else if (effect !== "security-played") {
    opponent.trash.push(card("demo-joe-bt2-opponent-source", "BT1-010", 1));
  }
  state.players.push(you, opponent);

  const selected = effect ?? "memory-gained";
  const descriptions: Record<string, string> = {
    "memory-gained": "An opponent's digivolution card was trashed by an effect, so Joe suspended to gain 1 memory.",
    declined: "Joe's optional effect was declined, so he stayed unsuspended and gained no memory.",
    "own-source": "The controller's own digivolution card was trashed, so Joe did not activate.",
    "opponent-turn": "The opponent's digivolution card was trashed during their turn, so Joe did not activate.",
    "return-disposal":
      "Sources disposed of when their Digimon returned to hand did not count as being trashed for Joe's effect.",
    "security-played": "Joe's Security effect played him without paying the memory cost.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-085",
        effectKey: `BT2-085/${selected}`,
        description: descriptions[selected]!,
        timing: selected === "security-played" ? "Security" : "YourTurn",
      },
    ],
  };
}
