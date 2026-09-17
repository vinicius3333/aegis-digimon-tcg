import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function megaKabuterimonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "memory-gained" ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const attacker = permanent("demo-megakabuterimon-host", "BT1-074", 0, 5000, [
    { instanceId: "demo-megakabuterimon-source", cardId: "BT1-076" },
  ]);
  attacker.isSuspended = effect === "memory-gained";
  you.battleArea.push(attacker);
  const targetA = permanent("demo-megakabuterimon-target-a", "BT1-016", 1, 5000);
  const targetB = permanent("demo-megakabuterimon-target-b", "BT1-017", 1, 6000);
  targetA.isSuspended = true;
  if (effect === "memory-gained") targetB.isSuspended = true;
  opponent.battleArea.push(targetA, targetB);
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "memory-gained") return { state };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-076",
        effectKey: "BT1-076/memory",
        description: "MegaKabuterimon's inherited effect gained 1 memory with 2 suspended opposing Digimon.",
        timing: "When Attacking",
      },
    ],
  };
}
