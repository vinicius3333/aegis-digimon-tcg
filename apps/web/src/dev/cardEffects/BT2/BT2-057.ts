import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function greymonBlackBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "top-card") {
    you.battleArea.push(permanent("demo-greymon-black-bt2-top", "BT2-057", 0, 4000));
  } else {
    const hasReboot = effect !== "no-reboot";
    const host = permanent("demo-greymon-black-bt2-host", hasReboot ? "BT2-065" : "BT2-064", 0, 11000, [
      { instanceId: "demo-greymon-black-bt2-source", cardId: "BT2-057" },
    ]);
    if (hasReboot) host.keywords.push("Reboot");
    if (hasReboot && effect !== "opponent-turn") host.keywords.push("Jamming");
    if (effect === "security-survived") {
      host.isSuspended = true;
      opponent.securityCount = 4;
    }
    you.battleArea.push(host);
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    active: "During its controller's turn, the Reboot host received Jamming from Greymon's inherited effect.",
    "security-survived": "Jamming prevented the Reboot host from being deleted by a stronger Security Digimon.",
    "no-reboot": "Without Reboot, Greymon's inherited condition failed and the host received no Jamming.",
    "opponent-turn": "The host kept Reboot but lost the inherited Jamming during the opponent's turn.",
    "top-card": "Greymon granted no Jamming while it was the top card because the effect is inherited-only.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-057",
        effectKey: "BT2-057/inherited-jamming",
        description: descriptions[effect] ?? "Greymon's inherited effect state is displayed.",
        timing: "YourTurn",
      },
    ],
  };
}
