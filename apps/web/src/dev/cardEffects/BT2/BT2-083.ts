import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function millenniummonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === null || effect === "returned-to-bottom") {
    you.battleArea.push(permanent("demo-millenniummon-bt2", "BT2-083", 0, 13000));
    opponent.deck.push(card("demo-millenniummon-bt2-target", "BT2-020", 1));
    opponent.trash.push(card("demo-millenniummon-bt2-source", "BT2-013", 1));
  } else if (effect === "replayed-without-sources") {
    you.battleArea.push(permanent("demo-millenniummon-bt2-replayed", "BT2-083", 0, 13000));
    you.trash.push(
      card("demo-millenniummon-bt2-source-a", "BT2-066", 0),
      card("demo-millenniummon-bt2-source-b", "BT2-057", 0),
    );
  } else {
    you.trash.push(card("demo-millenniummon-bt2-deleted", "BT2-083", 0));
    if (effect === "declined-replay") you.trash.push(card("demo-millenniummon-bt2-source", "BT2-066", 0));
  }
  state.players.push(you, opponent);

  const selected = effect ?? "returned-to-bottom";
  const descriptions: Record<string, string> = {
    "returned-to-bottom":
      "Millenniummon returned the opposing Digimon to the bottom of its deck and trashed only that Digimon's sources.",
    "replayed-without-sources":
      "After deletion with digivolution cards, Millenniummon played itself from trash for free without its former sources.",
    "no-sources": "Millenniummon had no digivolution cards when deleted, so it remained in trash.",
    "declined-replay":
      "Millenniummon's optional On Deletion replay was declined, so it and its former source remained in trash.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-083",
        effectKey: `BT2-083/${selected}`,
        description: descriptions[selected]!,
        timing: selected === "returned-to-bottom" ? "WhenDigivolving" : "OnDeletion",
      },
    ],
  };
}
