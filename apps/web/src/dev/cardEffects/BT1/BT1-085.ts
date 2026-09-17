import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function taiKamiyaDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "memory-set" ? Phase.Active : Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "memory-set" ? 3 : effect === null ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const tai = permanent("demo-tai-kamiya", "BT1-085", 0, 0);
  you.battleArea.push(tai);
  if (effect === "stacked-aura") you.battleArea.push(permanent("demo-tai-kamiya-second", "BT1-085", 0, 0));
  if (effect === "aura" || effect === "stacked-aura") {
    const red = permanent("demo-tai-red", "BT1-025", 0, 11000, [
      { instanceId: "demo-tai-source-a", cardId: "BT1-001" },
      { instanceId: "demo-tai-source-b", cardId: "BT1-010" },
      { instanceId: "demo-tai-source-c", cardId: "BT1-015" },
      { instanceId: "demo-tai-source-d", cardId: "BT1-020" },
    ]);
    red.grantedKeywords.push("SecurityAttack");
    if (effect === "stacked-aura") red.grantedKeywords.push("SecurityAttack");
    you.battleArea.push(red);
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "memory-set": "At the start of the turn, Tai Kamiya set memory from 1 to 3.",
    aura: "Tai Kamiya granted Security Attack +1 to the red Digimon with 4 digivolution cards.",
    "stacked-aura": "Two copies of Tai Kamiya granted a total of Security Attack +2.",
    "security-play": "Tai Kamiya was played from security without paying the cost.",
  };
  return {
    state,
    events: [
      effect === "security-play"
        ? { kind: "cardsMoved", instanceIds: [tai.topCard.instanceId], from: "security", to: "battleArea" }
        : {
            kind: "effectTriggered",
            seat: 0,
            sourceCardId: "BT1-085",
            effectKey: effect === "memory-set" ? "BT1-085/memory-setter" : "BT1-085/red-security-attack",
            description: descriptions[effect] ?? "Tai Kamiya's effect resolved.",
            timing: effect === "memory-set" ? "Start of Your Turn" : "Your Turn",
          },
    ],
  };
}
