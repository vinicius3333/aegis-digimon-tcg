import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function dimensionScissorDemo(effect: string | null): CardEffectsFixture {
  const effectText =
    "[Main] 1 of your Digimon gains: 'When this Digimon deletes an opponent's Digimon in battle and survives, unsuspend it' for the turn.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" ? Phase.End : Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === null ? 3 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const attacker = permanent("demo-scissor-attacker", "BT1-057", 0, 10000);
  if (effect === "q985-security" || effect === "q987-other" || effect === "q1263-prebattle") {
    attacker.isSuspended = true;
  }
  you.battleArea.push(attacker, permanent("demo-scissor-color", "BT1-064", 0, 4000));
  if (effect === null || effect === "granted" || effect === "expired") {
    opponent.battleArea.push(permanent("demo-scissor-defender", "BT1-003", 1, 1000));
  }
  if (effect === "q984-multiple") {
    opponent.trash.push(
      card("demo-scissor-first-deleted", "BT1-003", 1),
      card("demo-scissor-second-deleted", "BT1-009", 1),
    );
  }
  if (effect === "q985-security") opponent.trash.push(card("demo-scissor-security-digimon", "BT1-010", 1));
  if (effect === "q986-blocker") opponent.trash.push(card("demo-scissor-blocker", "BT1-072", 1));
  if (effect === "q987-other") {
    opponent.battleArea.push(permanent("demo-scissor-protected-target", "BT1-016", 1, 5000));
    opponent.trash.push(card("demo-scissor-other-deleted", "BT1-010", 1));
  }
  if (effect === "q1263-prebattle") opponent.trash.push(card("demo-scissor-prebattle-target", "BT1-016", 1));
  if (effect === null) {
    you.hand.push(card("demo-scissor-option", "BT1-112", 0));
    you.handCount = 1;
  } else if (effect === "security-hand") {
    you.hand.push(card("demo-scissor-security", "BT1-112", 0));
    you.handCount = 1;
    you.securityCount = 4;
  } else {
    you.trash.push(card("demo-scissor-option", "BT1-112", 0));
    if (effect === "q1263-prebattle") you.trash.push(card("demo-scissor-depths", "BT4-101", 0));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    granted:
      "Dimension Scissor granted its battle-deletion unsuspend effect to exactly 1 selected Digimon for the turn.",
    "q984-multiple":
      "The granted Digimon deleted 2 opposing Digimon in separate battles and unsuspended after each one (Q984).",
    "q985-security":
      "The attacker survived battle with a Security Digimon but remained suspended because Security battles do not qualify (Q985).",
    "q986-blocker": "The attacker deleted a blocking Digimon in battle, survived, and unsuspended (Q986).",
    "q987-other":
      "An attack effect deleted a different opposing Digimon, but the protected battle target survived and the attacker remained suspended (Q987).",
    "q1263-prebattle":
      "BT4-101 deleted the source-less attack target before battle began, so Dimension Scissor did not unsuspend the attacker (Q1263).",
    expired: "Dimension Scissor's granted effect expired at the end of the turn.",
    "security-hand": "Dimension Scissor's Security effect added the card to its owner's hand.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-112",
        effectKey: effect === "security-hand" ? "BT1-112/security" : "BT1-112/main",
        description: descriptions[effect] ?? effectText,
        timing: effect === "security-hand" ? "Security" : effect === "expired" ? "End of Turn" : "Main",
      },
    ],
  };
}
