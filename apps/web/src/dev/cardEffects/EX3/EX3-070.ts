import { GameState, Phase, type DecisionRequest } from "@aegis/shared";
import { permanent, player } from "../fixture";

export function avalonsGateDemo(
  effect: string | null,
  step: string | null,
): { state: GameState; decision: DecisionRequest } {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "security" ? 0 : 7;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-slayerdramon", "EX3-024", 0, 12000));
  const dracomon = permanent("demo-dracomon", "EX3-037", 0, 2000);
  dracomon.isSuspended = true;
  you.battleArea.push(dracomon);
  if (effect === "examon") you.battleArea.push(permanent("demo-examon", "EX3-074", 0, 15000));
  opponent.battleArea.push(permanent("demo-pomumon", "EX3-038", 1, 2000));
  opponent.battleArea.push(permanent("demo-metallicdramon", "EX3-053", 1, 12000));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  const mainText =
    "[Main] Activate 1 of the effects below. If you have a Digimon with [Examon] in its name in play, activate all of the effects below instead. ・ Suspend 1 of your opponent's Digimon, and 1 of your Digimon gains ＜Piercing＞ for the turn. ・ Unsuspend 1 of your Digimon.";
  const securityText = "[Security] Suspend 1 of your opponent's Digimon, and unsuspend 1 of your Digimon.";
  const timing = effect === "security" ? "Security" : "Main";

  if (!effect && !step) {
    return {
      state,
      decision: {
        decisionId: "demo-avalons-gate-mode",
        seat: 0,
        kind: "chooseOption",
        promptText: "Choose one effect to activate",
        sourceCardId: "EX3-070",
        options: {
          choices: ["Suspend an opponent's Digimon and grant ＜Piercing＞", "Unsuspend one of your Digimon"],
          timing,
          effectText: mainText,
        },
      },
    };
  }

  const isPiercing = step === "piercing";
  const isUnsuspend = step === "unsuspend";
  const candidateInstanceIds = isPiercing
    ? ["demo-slayerdramon", "demo-dracomon"]
    : isUnsuspend
      ? ["demo-dracomon"]
      : ["demo-pomumon", "demo-metallicdramon"];
  const visibleInstanceIds =
    isPiercing || isUnsuspend
      ? effect === "examon"
        ? ["demo-slayerdramon", "demo-dracomon", "demo-examon"]
        : ["demo-slayerdramon", "demo-dracomon"]
      : ["demo-pomumon", "demo-metallicdramon"];

  return {
    state,
    decision: {
      decisionId: `demo-avalons-gate-${step ?? effect ?? "suspend"}`,
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose targets",
      sourceCardId: "EX3-070",
      options: {
        candidateInstanceIds,
        visibleInstanceIds,
        min: 1,
        max: 1,
        timing,
        effectText: effect === "security" ? securityText : mainText,
      },
    },
  };
}
