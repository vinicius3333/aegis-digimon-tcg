import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function gotsumonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "attacking-loss" ? 0 : 1;
  state.memory = effect === "attacking-loss" ? -1 : 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const gotsumon = permanent("demo-gotsumon-bt2", "BT2-054", 0, 3000);
  gotsumon.keywords.push("Blocker");
  you.battleArea.push(gotsumon);

  if (effect === "attacking-loss") {
    gotsumon.isSuspended = true;
    opponent.securityCount = 4;
  } else {
    const attacker = permanent("demo-gotsumon-bt2-attacker", "BT1-010", 1, 2000);
    attacker.isSuspended = true;
    opponent.battleArea.push(attacker);
    if (effect === "blocked") gotsumon.isSuspended = true;
    if (effect === "declined") you.securityCount = 4;
  }
  state.players.push(you, opponent);

  if (effect === null || effect === "eligible") {
    const attacker = opponent.battleArea[0]!;
    return {
      state,
      events: [
        {
          kind: "blockWindowOpened",
          attackerPermanentId: attacker.permanentId,
          eligibleBlockerIds: [gotsumon.permanentId],
        },
      ],
    };
  }
  if (effect === "blocked") {
    return { state, events: [{ kind: "blocked", blockerPermanentId: gotsumon.permanentId }] };
  }
  if (effect === "declined") {
    return {
      state,
      events: [
        { kind: "blockDeclined", attackerPermanentId: opponent.battleArea[0]!.permanentId },
        { kind: "securityChecked", seat: 0, revealedCardId: "BT1-011", resolution: "battle" },
      ],
    };
  }
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-054",
        effectKey: "BT2-054/when-attacking",
        description: "Gotsumon lost 2 memory when attacking, crossing the gauge to -1, and the attack still resolved.",
        timing: "WhenAttacking",
      },
    ],
  };
}
