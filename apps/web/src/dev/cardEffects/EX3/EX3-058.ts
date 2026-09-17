import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function shadramonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = effect === "inherited" ? -1 : 4;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "shadramon-opponent");
  const shadramon = permanent("demo-shadramon", "EX3-058", 0, 5000, [
    { instanceId: "demo-guilmon-source", cardId: "EX3-056" },
  ]);
  const wormmon = permanent("demo-wormmon-partner", "EX3-055", 0, 2000);
  const agumon = permanent("demo-agumon-partner", "BT1-010", 0, 2000);
  you.battleArea.push(shadramon, wormmon, agumon);
  const effectText =
    "[When Digivolving] Activate 1 of the effects below. ・You may digivolve 1 of your other Digimon into a level 4 red Digimon card with the [Free] trait from your trash for the cost. ・You may DNA digivolve this Digimon and one of your other Digimon into a Digimon card in your hand for the cost.";

  if (effect === "inherited") {
    const inheritedHost = permanent("demo-inherited-host", "EX3-061", 0, 8000, [
      { instanceId: "demo-inherited-shadramon", cardId: "EX3-058" },
    ]);
    you.battleArea.splice(0, you.battleArea.length, inheritedHost, permanent("demo-red-partner", "EX3-008", 0, 5000));
    you.hand.push(card("demo-dragon-mode-hand", "EX3-063", 0));
    you.handCount = 1;
    state.players.push(you, opponent);
    return {
      state,
      decision: {
        decisionId: "demo-shadramon-inherited-dna",
        seat: 0,
        kind: "optional",
        promptText: "DNA digivolve at the end of your turn?",
        sourceCardId: "EX3-058",
        options: {
          timing: "EndOfYourTurn",
          effectText:
            "[End of Your Turn] This Digimon and one of your other Digimon may DNA digivolve into a Digimon card in your hand for the cost.",
        },
      },
    };
  }

  if (effect === "trash") {
    you.trash.push(
      card("demo-flamedramon-trash", "EX3-008", 0),
      card("demo-darktyrannomon-trash", "EX3-059", 0),
      card("demo-guilmon-trash", "EX3-056", 0),
    );
    state.players.push(you, opponent);
    if (step === "base") {
      return {
        state,
        decision: {
          decisionId: "demo-shadramon-trash-base",
          seat: 0,
          kind: "chooseTargets",
          promptText: "Choose another Digimon to digivolve",
          sourceCardId: "EX3-058",
          options: {
            candidateInstanceIds: [wormmon.permanentId, agumon.permanentId],
            visibleInstanceIds: [shadramon.permanentId, wormmon.permanentId, agumon.permanentId],
            min: 1,
            max: 1,
            timing: "WhenDigivolving",
            effectText,
          },
        },
      };
    }
    if (step === "card") {
      return {
        state,
        decision: {
          decisionId: "demo-shadramon-trash-card",
          seat: 0,
          kind: "selectCards",
          promptText: "Choose a red level 4 Free Digimon from your trash",
          sourceCardId: "EX3-058",
          options: {
            candidateInstanceIds: ["demo-flamedramon-trash"],
            visibleInstanceIds: you.trash.map(({ instanceId }) => instanceId),
            min: 1,
            max: 1,
            timing: "WhenDigivolving",
            effectText,
          },
        },
      };
    }
    return {
      state,
      decision: {
        decisionId: "demo-shadramon-trash-optional",
        seat: 0,
        kind: "optional",
        promptText: "Digivolve another Digimon from your trash?",
        sourceCardId: "EX3-058",
        options: { timing: "WhenDigivolving", effectText },
      },
    };
  }

  if (effect === "dna") {
    you.hand.push(card("demo-dinobeemon-hand", "EX3-061", 0), card("demo-dragon-mode-hand", "EX3-063", 0));
    you.handCount = 2;
    state.players.push(you, opponent);
    return {
      state,
      decision:
        step === "result"
          ? {
              decisionId: "demo-shadramon-dna-result",
              seat: 0,
              kind: "selectCards",
              promptText: "Choose a compatible DNA Digimon from your hand",
              sourceCardId: "EX3-058",
              options: {
                candidateInstanceIds: ["demo-dinobeemon-hand"],
                visibleInstanceIds: you.hand.map(({ instanceId }) => instanceId),
                min: 1,
                max: 1,
                timing: "WhenDigivolving",
                effectText,
              },
            }
          : {
              decisionId: "demo-shadramon-dna-optional",
              seat: 0,
              kind: "optional",
              promptText: "DNA digivolve Shadramon with another Digimon?",
              sourceCardId: "EX3-058",
              options: { timing: "WhenDigivolving", effectText },
            },
    };
  }

  state.players.push(you, opponent);
  return {
    state,
    decision: {
      decisionId: "demo-shadramon-modal",
      seat: 0,
      kind: "chooseOption",
      promptText: "Choose one effect to activate",
      sourceCardId: "EX3-058",
      options: {
        choices: ["Digivolve", "DNA digivolve"],
        timing: "WhenDigivolving",
        effectText,
      },
    },
  };
}
