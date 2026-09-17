import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function metalGreymonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "opponent-turn" || effect === "rebooted" ? 1 : 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "rebooted") {
    you.battleArea.push(permanent("demo-metalgreymon-bt2", "BT2-063", 0, 7000));
  } else {
    const under = [{ instanceId: "demo-metalgreymon-bt2-source", cardId: "BT2-063" }];
    if (effect !== "no-reboot") under.push({ instanceId: "demo-metalgreymon-bt2-reboot", cardId: "BT2-055" });
    const host = permanent("demo-metalgreymon-bt2-host", "BT2-064", 0, 12000, under);
    if (effect !== "no-reboot") host.keywords.push("Reboot");
    if (effect === null || effect === "inherited-active") host.keywords.push("SecurityAttack+1");
    you.battleArea.push(host);
  }
  state.players.push(you, opponent);

  const descriptions: Record<string, string> = {
    rebooted: "MetalGreymon used Reboot and became ready during the opponent's unsuspend phase.",
    "inherited-active": "The host has Reboot, so MetalGreymon's inherited effect grants Security Attack +1 this turn.",
    "no-reboot": "The host lacks Reboot, so MetalGreymon's inherited effect grants no additional security checks.",
    "opponent-turn":
      "The host keeps Reboot, but MetalGreymon's inherited Security Attack +1 is inactive on the opponent's turn.",
  };
  const selected = effect ?? "inherited-active";
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-063",
        effectKey: `BT2-063/${selected}`,
        description: descriptions[selected]!,
        timing: selected === "opponent-turn" || selected === "rebooted" ? "OpponentsTurn" : "YourTurn",
      },
    ],
  };
}
