import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function imperialdramonDragonModeDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 5;
  const you = player(
    0,
    "Dragon Mode player",
    effect === "dna" || effect === null ? "dragon-mode-player" : "card-effects-viewer",
  );
  const opponent = player(
    1,
    "Effect tester",
    effect === "dna" || effect === null ? "card-effects-viewer" : "dragon-mode-opponent",
  );
  const dragonMode = permanent("demo-dragon-mode", "EX3-063", 0, 12000, [
    { instanceId: "demo-paildramon-source", cardId: "EX3-010" },
    { instanceId: "demo-dinobeemon-source", cardId: "EX3-061" },
  ]);
  you.battleArea.push(dragonMode);

  if (effect === "dna" || effect === null) {
    opponent.battleArea.push(permanent("demo-groundramon", "BT1-020", 1, 7000));
    opponent.battleArea.push(permanent("demo-wargreymon", "BT1-025", 1, 10000));
    opponent.battleArea.push(permanent("demo-omnimon", "AD1-025", 1, 14000));
    state.players.push(you, opponent);
    return {
      state,
      sessionId: "card-effects-viewer",
      decision: {
        decisionId: "demo-dragon-mode-dna-survivor",
        seat: 1,
        kind: "chooseTargets",
        promptText: "Choose 1 of your Digimon to keep",
        sourceCardId: "EX3-063",
        options: {
          candidateInstanceIds: ["demo-groundramon", "demo-wargreymon", "demo-omnimon"],
          min: 1,
          max: 1,
          timing: "WhenDigivolving",
          effectText:
            "[When Digivolving] If DNA digivolving, your opponent chooses 1 of their Digimon. Delete all of their other Digimon. Then, Blitz.",
        },
      },
    };
  }

  you.hand.push(
    card("demo-fighter-mode", "EX3-073", 0),
    card("demo-other-fighter-mode", "EX3-073", 0),
    card("demo-other-dragon-mode", "BT3-031", 0),
  );
  you.handCount = you.hand.length;
  opponent.securityCount = 4;
  state.players.push(you, opponent);
  const effectText =
    "[When Attacking] [Once Per Turn] This Digimon gets +2000 DP for the turn. Then, this Digimon may digivolve into Imperialdramon: Fighter Mode in your hand for the digivolution cost.";
  if (step === "fighter") {
    dragonMode.currentDP = 14000;
    return {
      state,
      decision: {
        decisionId: "demo-dragon-mode-select-fighter",
        seat: 0,
        kind: "selectCards",
        promptText: "Choose an Imperialdramon: Fighter Mode",
        sourceCardId: "EX3-063",
        options: {
          candidateInstanceIds: ["demo-fighter-mode", "demo-other-fighter-mode"],
          visibleInstanceIds: ["demo-fighter-mode", "demo-other-fighter-mode", "demo-other-dragon-mode"],
          min: 1,
          max: 1,
          timing: "WhenAttacking",
          effectText,
        },
      },
    };
  }
  return {
    state,
    decision: {
      decisionId: "demo-dragon-mode-attack-optional",
      seat: 0,
      kind: "optional",
      promptText: "Digivolve into Imperialdramon: Fighter Mode?",
      sourceCardId: "EX3-063",
      options: { timing: "WhenAttacking", effectText },
    },
  };
}
