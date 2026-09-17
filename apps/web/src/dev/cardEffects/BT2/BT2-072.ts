import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function vilemonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "eligible" || effect === "blocked" ? 1 : 0;
  state.memory = effect === "attacked" ? 1 : effect === "blocked" || effect === "eligible" ? -3 : -1;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const vilemon = permanent("demo-vilemon-bt2", "BT2-072", 0, 6000);
  vilemon.keywords.push("Blocker");
  you.battleArea.push(vilemon);
  if (effect === "eligible" || effect === "blocked") {
    const attacker = permanent("demo-vilemon-bt2-attacker", "BT1-010", 1, 2000);
    attacker.isSuspended = true;
    opponent.battleArea.push(attacker);
    if (effect === "blocked") vilemon.isSuspended = true;
  } else {
    vilemon.isSuspended = true;
    opponent.securityCount = 4;
  }
  state.players.push(you, opponent);

  if (effect === "eligible") {
    return {
      state,
      events: [
        {
          kind: "blockWindowOpened",
          attackerPermanentId: opponent.battleArea[0]!.permanentId,
          eligibleBlockerIds: [vilemon.permanentId],
        },
      ],
    };
  }
  const selected = effect ?? "attacked";
  const descriptions: Record<string, string> = {
    attacked: "Vilemon attacked, lost 2 memory, and completed its security check.",
    "crossed-zero": "Vilemon completed the security check even though losing 2 memory crossed zero.",
    blocked: "Vilemon blocked the attack without losing memory because it was not the attacking Digimon.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-072",
        effectKey: `BT2-072/${selected}`,
        description: descriptions[selected]!,
        timing: selected === "blocked" ? "OpponentsTurn" : "WhenAttacking",
      },
    ],
  };
}
