import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function mimiTachikawaDemo(effect: string | null): CardEffectsFixture {
  const mainText =
    "[Main] If you have a level 5 or higher green Digimon in play, you can suspend this Tamer to hatch 1 Digi-Egg card to an empty space in your breeding area, or move 1 level 3 or higher Digimon from your breeding area to your battle area.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "memory-set" ? Phase.Active : Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "memory-set" ? 3 : 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const mimi = permanent("demo-mimi-tachikawa", "BT1-089", 0, 0);
  mimi.isSuspended = effect === "memory-set" || effect === "hatched" || effect === "moved";
  you.battleArea.push(mimi);
  if (effect !== "security-play") you.battleArea.push(permanent("demo-mimi-qualifier", "BT1-078", 0, 7000));
  if (effect === "hatched") {
    const hatchling = permanent("demo-mimi-hatchling", "BT1-008", 0, 0);
    hatchling.inBreeding = true;
    you.breeding = hatchling;
    you.eggDeckCount = 3;
  }
  if (effect === "moved") you.battleArea.push(permanent("demo-mimi-moved", "BT1-064", 0, 3000));
  if (effect === "unavailable") {
    const hatchling = permanent("demo-mimi-level-two", "BT1-008", 0, 0);
    hatchling.inBreeding = true;
    you.breeding = hatchling;
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) {
    return {
      state,
      decision: {
        decisionId: "demo-mimi-activate",
        seat: 0,
        kind: "optional",
        promptText: "Suspend Mimi Tachikawa to hatch the top Digi-Egg?",
        sourceCardId: "BT1-089",
        options: { timing: "Main", effectText: mainText },
      },
    };
  }
  if (effect === "unavailable") return { state };

  const descriptions: Record<string, string> = {
    "memory-set": "Suspended Mimi Tachikawa set memory from 2 to 3 at the start of her controller's turn.",
    hatched: "Mimi Tachikawa suspended and hatched the top Digi-Egg into the empty Breeding Area.",
    moved: "Mimi Tachikawa suspended and moved the level 3 Digimon from the Breeding Area to the battle area.",
    "security-play": "Mimi Tachikawa was played from security without paying the cost.",
  };
  return {
    state,
    events: [
      effect === "security-play"
        ? { kind: "cardsMoved", instanceIds: [mimi.topCard.instanceId], from: "security", to: "battleArea" }
        : {
            kind: "effectTriggered",
            seat: 0,
            sourceCardId: "BT1-089",
            effectKey: effect === "memory-set" ? "BT1-089/memory" : "BT1-089/breeding",
            description: descriptions[effect] ?? mainText,
            timing: effect === "memory-set" ? "Start of Your Turn" : "Main",
          },
    ],
  };
}
