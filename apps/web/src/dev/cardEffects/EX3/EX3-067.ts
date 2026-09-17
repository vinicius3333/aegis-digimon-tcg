import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function souraiDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-gabumon-blue", "BT1-029", 0, 2000));
  opponent.battleArea.push(
    permanent(
      "demo-paildramon",
      "EX3-010",
      1,
      12000,
      step === "resolved"
        ? []
        : [
            { instanceId: "demo-paildramon-source-1", cardId: "EX3-004" },
            { instanceId: "demo-paildramon-source-2", cardId: "EX3-018" },
            { instanceId: "demo-paildramon-source-3", cardId: "EX3-019" },
            { instanceId: "demo-paildramon-source-4", cardId: "EX3-020" },
            { instanceId: "demo-paildramon-source-5", cardId: "EX3-063" },
          ],
    ),
  );
  opponent.battleArea.push(
    permanent("demo-coredramon", "EX3-018", 1, 5000, [
      { instanceId: "demo-coredramon-source-1", cardId: "EX3-016" },
      { instanceId: "demo-coredramon-source-2", cardId: "EX3-002" },
    ]),
  );
  opponent.battleArea.push(permanent("demo-gabumon-empty", "BT1-029", 1, 2000));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  const mainText =
    "[Main] Trash the top 4 digivolution cards of 1 of your opponent's Digimon. Until the end of your opponent's turn, all of your opponent's Digimon with no digivolution cards can't attack.";
  const effectText = effect === "security" ? `[Security] Activate this card's [Main] effect. ${mainText}` : mainText;

  if (step === "resolved") {
    return {
      state,
      events: [
        {
          kind: "effectActivated",
          seat: 0,
          sourceCardId: "EX3-067",
          effectKey: "EX3-067/0",
          description:
            "Removed Paildramon's sources. Paildramon and Gabumon can't attack until the end of the opponent's turn.",
        },
      ],
    };
  }

  return {
    state,
    decision: {
      decisionId: "demo-sourai-source-target",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose targets",
      sourceCardId: "EX3-067",
      options: {
        candidateInstanceIds: ["demo-paildramon", "demo-coredramon"],
        visibleInstanceIds: ["demo-paildramon", "demo-coredramon", "demo-gabumon-empty"],
        min: 1,
        max: 1,
        timing: effect === "security" ? "Security" : "Main",
        effectText,
      },
    },
  };
}
