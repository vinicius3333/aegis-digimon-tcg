import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function warGreymonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 1;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const warGreymon = permanent("demo-wargreymon-bt2", "BT2-065", 0, 11000);
  warGreymon.keywords.push("Blocker", "Reboot");
  you.battleArea.push(warGreymon);
  if (effect !== "rebooted") {
    const attacker = permanent("demo-wargreymon-bt2-attacker", "BT1-010", 1, 2000);
    attacker.isSuspended = true;
    opponent.battleArea.push(attacker);
    if (effect === "blocked") warGreymon.isSuspended = true;
    if (effect === "declined") you.securityCount = 4;
  }
  state.players.push(you, opponent);

  if (effect === null || effect === "eligible") {
    return {
      state,
      events: [
        {
          kind: "blockWindowOpened",
          attackerPermanentId: opponent.battleArea[0]!.permanentId,
          eligibleBlockerIds: [warGreymon.permanentId],
        },
      ],
    };
  }
  const descriptions: Record<string, string> = {
    blocked: "WarGreymon suspended to block, redirected the attack, and survived the battle.",
    declined: "WarGreymon declined to block, remained ready, and the attack checked security.",
    rebooted: "WarGreymon used Reboot and became ready during the opponent's unsuspend phase.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-065",
        effectKey: `BT2-065/${effect}`,
        description: descriptions[effect] ?? "WarGreymon's keyword state is displayed.",
        timing: "OpponentsTurn",
      },
    ],
  };
}
