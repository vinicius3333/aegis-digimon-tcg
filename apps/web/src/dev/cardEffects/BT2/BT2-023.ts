import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function gomamonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === null ? 4 : effect === "two-source-less" ? 2 : effect === "mixed-zones" ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === null) {
    you.hand.push(card("demo-gomamon-bt2-hand", "BT2-023", 0));
    you.handCount = 1;
  } else {
    you.battleArea.push(permanent("demo-gomamon-bt2", "BT2-023", 0, 2000));
  }
  if (effect === "two-source-less") {
    opponent.battleArea.push(
      permanent("demo-gomamon-bt2-source-less-a", "BT1-010", 1, 2000),
      permanent("demo-gomamon-bt2-source-less-b", "BT1-011", 1, 2000),
    );
  } else if (effect === "mixed-zones") {
    you.battleArea.push(permanent("demo-gomamon-bt2-allied", "BT1-010", 0, 2000));
    opponent.battleArea.push(
      permanent("demo-gomamon-bt2-qualifying", "BT1-010", 1, 2000),
      permanent("demo-gomamon-bt2-with-source", "BT1-011", 1, 2000, [
        { instanceId: "demo-gomamon-bt2-under", cardId: "BT1-001" },
      ]),
    );
  } else if (effect === "q1002-floor") {
    for (let index = 0; index < 5; index += 1) {
      opponent.battleArea.push(permanent(`demo-gomamon-bt2-floor-${index}`, "BT1-010", 1, 2000));
    }
  } else if (effect === "no-qualifiers") {
    opponent.battleArea.push(
      permanent("demo-gomamon-bt2-no-qualifier", "BT1-011", 1, 2000, [
        { instanceId: "demo-gomamon-bt2-no-qualifier-under", cardId: "BT1-001" },
      ]),
    );
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "two-source-less": "Two opposing source-less Digimon reduced Gomamon's 4 play cost to 2.",
    "mixed-zones":
      "Only the one opposing battle-area Digimon without sources counted; allied, sourced, and breeding Digimon did not.",
    "q1002-floor": "Five qualifying Digimon reduced Gomamon's cost only to 0; the play did not gain memory (Q1002).",
    "no-qualifiers": "With no qualifying opposing Digimon, Gomamon paid its printed play cost of 4.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-023",
        effectKey: "BT2-023/source-less-play-reduction",
        description: descriptions[effect] ?? "BT2-023 Gomamon resolved.",
        timing: "Static",
      },
    ],
  };
}
