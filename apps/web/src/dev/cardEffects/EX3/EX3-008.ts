import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function flamedramonDemo(step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 4;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "flamedramon-opponent");
  const flamedramon = permanent("demo-flamedramon", "EX3-008", 0, 5000);
  const shadramonOne = permanent("demo-shadramon-one", "EX3-058", 0, 5000);
  const shadramonTwo = permanent("demo-shadramon-two", "EX3-058", 0, 5000, [
    { instanceId: "demo-shadramon-source", cardId: "EX3-055" },
  ]);
  const incompatible = permanent("demo-flamedramon-incompatible", "EX3-008", 0, 5000);
  you.battleArea.push(flamedramon, shadramonOne, shadramonTwo, incompatible);
  you.hand.push(
    card("demo-paildramon-one", "EX3-010", 0),
    card("demo-paildramon-two", "EX3-010", 0),
    card("demo-breakdramon-normal", "EX3-044", 0),
  );
  you.handCount = you.hand.length;
  state.players.push(you, opponent);
  const effectText =
    "[When Digivolving] You may DNA digivolve this Digimon and one of your other Digimon into a Digimon card in your hand for the cost.";

  return {
    state,
    decision:
      step === "result"
        ? {
            decisionId: "demo-flamedramon-dna-result",
            seat: 0,
            kind: "selectCards",
            promptText: "Choose a Digimon with a compatible DNA requirement",
            sourceCardId: "EX3-008",
            options: {
              candidateInstanceIds: ["demo-paildramon-one", "demo-paildramon-two"],
              visibleInstanceIds: you.hand.map(({ instanceId }) => instanceId),
              min: 1,
              max: 1,
              timing: "WhenDigivolving",
              effectText,
            },
          }
        : {
            decisionId: "demo-flamedramon-dna-partner",
            seat: 0,
            kind: "chooseTargets",
            promptText: "Choose another Digimon that completes a DNA requirement",
            sourceCardId: "EX3-008",
            options: {
              candidateInstanceIds: [shadramonOne.permanentId, shadramonTwo.permanentId],
              visibleInstanceIds: [shadramonOne.permanentId, shadramonTwo.permanentId, incompatible.permanentId],
              min: 1,
              max: 1,
              timing: "WhenDigivolving",
              effectText,
            },
          },
  };
}
