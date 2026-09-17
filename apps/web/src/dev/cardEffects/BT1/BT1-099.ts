import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function heartsAttackDemo(effect: string | null): CardEffectsFixture {
  const effectText = "[Main] Trash all digivolution cards under 1 of your opponent's Digimon.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(
    permanent("demo-hearts-own-loaded", "BT1-028", 0, 3000, [
      { instanceId: "demo-hearts-own-source", cardId: "BT1-001" },
    ]),
  );
  const emptyTarget = permanent("demo-hearts-empty", "BT2-047", 1, 4000);
  const loadedSources = [
    { instanceId: "demo-hearts-source-one", cardId: "BT1-001" },
    { instanceId: "demo-hearts-source-two", cardId: "BT1-002" },
    { instanceId: "demo-hearts-source-three", cardId: "BT1-003" },
  ];
  const loadedTarget = permanent(
    "demo-hearts-loaded",
    "BT2-047",
    1,
    4000,
    effect === "loaded-trashed" ? [] : loadedSources,
  );
  opponent.battleArea.push(emptyTarget, loadedTarget);
  if (effect === "loaded-trashed") {
    opponent.trash.push(...loadedSources.map((source) => card(source.instanceId, source.cardId, 1)));
  }
  you.trash.push(card("demo-hearts-option", "BT1-099", 0));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) {
    const candidates = [emptyTarget.topCard.instanceId, loadedTarget.topCard.instanceId];
    return {
      state,
      decision: {
        decisionId: "demo-hearts-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Choose 1 opposing Digimon. All of its digivolution cards will be trashed.",
        sourceCardId: "BT1-099",
        options: {
          candidateInstanceIds: candidates,
          visibleInstanceIds: candidates,
          min: 1,
          max: 1,
          timing: "Main",
          effectText,
        },
      },
    };
  }

  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-099",
        effectKey: "BT1-099/main",
        description:
          effect === "loaded-trashed"
            ? "Hearts Attack trashed all 3 digivolution cards from the selected opposing Digimon and left the other stacks untouched."
            : "Hearts Attack legally selected the Digimon with no digivolution cards; nothing happened to the loaded Digimon (Q964).",
        timing: "Main",
      },
    ],
  };
}
