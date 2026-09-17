import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function mattIshidaDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const playText =
    "[Your Turn] When you play a blue Digimon, you can suspend this Tamer to trash the bottom digivolution card of 1 of your opponent's Digimon.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "memory-set" ? Phase.Active : Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "memory-set" ? 3 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const matt = permanent("demo-matt-ishida", "BT1-086", 0, 0);
  matt.isSuspended = effect === "memory-set" || step === "target" || effect === "source-trashed";
  you.battleArea.push(matt);
  if (effect !== "memory-set" && effect !== "security-play")
    you.battleArea.push(permanent("demo-matt-blue", "BT1-027", 0, 3000));
  const sourceCards =
    effect === "source-trashed"
      ? [{ instanceId: "demo-matt-target-top-source", cardId: "BT1-067" }]
      : [
          { instanceId: "demo-matt-target-bottom", cardId: "BT1-066" },
          { instanceId: "demo-matt-target-top-source", cardId: "BT1-067" },
        ];
  if (effect !== "memory-set" && effect !== "security-play") {
    opponent.battleArea.push(permanent("demo-matt-target", "BT1-072", 1, 6000, sourceCards));
  }
  if (effect === "source-trashed") opponent.trash.push(card("demo-matt-target-bottom", "BT1-066", 1));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === "memory-set" || effect === "source-trashed" || effect === "declined" || effect === "security-play") {
    if (effect === "security-play") {
      return {
        state,
        events: [{ kind: "cardsMoved", instanceIds: [matt.topCard.instanceId], from: "security", to: "battleArea" }],
      };
    }
    const descriptions: Record<string, string> = {
      "memory-set": "Suspended Matt Ishida still set memory from 1 to 3 at the start of the turn.",
      "source-trashed": "Matt Ishida suspended to trash the bottom digivolution card of the chosen opposing Digimon.",
      declined: "Matt Ishida's controller declined, so Matt remained active and the opposing source stayed in place.",
    };
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "BT1-086",
          effectKey: effect === "memory-set" ? "BT1-086/memory" : "BT1-086/blue-play",
          description: descriptions[effect] ?? playText,
          timing: effect === "memory-set" ? "Start of Your Turn" : "Your Turn",
        },
      ],
    };
  }

  if (step === "target") {
    const target = opponent.battleArea[0]!;
    return {
      state,
      decision: {
        decisionId: "demo-matt-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Choose 1 opposing Digimon whose bottom digivolution card will be trashed.",
        sourceCardId: "BT1-086",
        options: {
          candidateInstanceIds: [target.topCard.instanceId],
          visibleInstanceIds: [target.topCard.instanceId],
          min: 1,
          max: 1,
          timing: "Your Turn",
          effectText: playText,
        },
      },
    };
  }

  return {
    state,
    decision: {
      decisionId: "demo-matt-optional",
      seat: 0,
      kind: "optional",
      promptText: "Suspend Matt Ishida to trash an opposing bottom digivolution card?",
      sourceCardId: "BT1-086",
      options: { timing: "Your Turn", effectText: playText },
    },
  };
}
