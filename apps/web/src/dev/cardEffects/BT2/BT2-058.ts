import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function guardromonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "attack-rejected" ? 0 : 1;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const guardromon = permanent("demo-guardromon-bt2", "BT2-058", 0, 7000);
  guardromon.keywords.push("Blocker");
  you.battleArea.push(guardromon);

  if (effect !== "attack-rejected") {
    const attacker = permanent("demo-guardromon-bt2-attacker", "BT1-010", 1, 2000);
    attacker.isSuspended = true;
    opponent.battleArea.push(attacker);
    if (effect === "blocked") guardromon.isSuspended = true;
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
          eligibleBlockerIds: [guardromon.permanentId],
        },
      ],
    };
  }
  if (effect === "blocked") {
    return { state, events: [{ kind: "blocked", blockerPermanentId: guardromon.permanentId }] };
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
        sourceCardId: "BT2-058",
        effectKey: "BT2-058/cannot-attack",
        description: "Guardromon's attack declaration was rejected by its Your Turn restriction.",
        timing: "YourTurn",
      },
    ],
  };
}
