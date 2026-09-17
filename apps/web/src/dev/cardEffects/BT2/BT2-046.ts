import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function metalTyrannomonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const host = permanent("demo-metaltyrannomon-bt2-host", "BT2-047", 0, 12000, [
    { instanceId: "demo-metaltyrannomon-bt2-source", cardId: "BT2-046" },
  ]);
  host.isSuspended = effect !== "level-six-battle";
  you.battleArea.push(host);
  if (effect === "level-six-battle") {
    opponent.trash.push(card("demo-metaltyrannomon-bt2-level-six", "BT2-031", 1));
  } else if (effect === "level-five-battle") {
    opponent.trash.push(card("demo-metaltyrannomon-bt2-level-five", "BT2-047", 1));
  } else if (effect === "security-battle") {
    opponent.trash.push(card("demo-metaltyrannomon-bt2-security", "BT2-031", 1));
    opponent.securityCount = 4;
  }
  if (effect !== "security-battle") opponent.securityCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "level-six-battle":
      "The host deleted an opposing level 6 Digimon in battle, so MetalTyrannomon's inherited effect unsuspended it.",
    "level-five-battle": "The defeated Digimon was only level 5, so the host remained suspended.",
    "security-battle":
      "Defeating a level 6 Security Digimon does not satisfy the opposing-Digimon-in-battle condition.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-046",
        effectKey: "BT2-046/inherited-unsuspend",
        description: descriptions[effect] ?? "MetalTyrannomon's inherited battle condition is displayed.",
        timing: "Your Turn",
      },
    ],
  };
}
