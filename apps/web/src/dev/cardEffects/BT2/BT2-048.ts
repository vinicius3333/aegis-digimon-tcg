import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function cherrymonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 1;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const cherrymon = permanent("demo-cherrymon-bt2", "BT2-048", 0, 7000);
  cherrymon.keywords.push("Blocker");
  const attacker = permanent("demo-cherrymon-bt2-attacker", "BT2-044", 1, 6000);
  attacker.isSuspended = true;
  you.battleArea.push(cherrymon);
  opponent.battleArea.push(attacker);

  if (effect === "blocked") cherrymon.isSuspended = true;
  if (effect === "declined") you.securityCount = 4;
  if (effect === "suspended") cherrymon.isSuspended = true;
  state.players.push(you, opponent);

  if (effect === null || effect === "eligible") {
    return {
      state,
      events: [
        {
          kind: "blockWindowOpened",
          attackerPermanentId: attacker.permanentId,
          eligibleBlockerIds: [cherrymon.permanentId],
        },
      ],
    };
  }
  if (effect === "blocked") {
    return { state, events: [{ kind: "blocked", blockerPermanentId: cherrymon.permanentId }] };
  }
  if (effect === "declined") {
    return {
      state,
      events: [
        { kind: "blockDeclined", attackerPermanentId: attacker.permanentId },
        { kind: "securityChecked", seat: 0, revealedCardId: "BT1-010", resolution: "battle" },
      ],
    };
  }
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-048",
        effectKey: "BT2-048/blocker-unavailable",
        description: "Cherrymon was already suspended, so it could not use Blocker.",
        timing: "AllTurns",
      },
    ],
  };
}
