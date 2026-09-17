import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function tkTakaishiDemo(effect: string | null): CardEffectsFixture {
  const effectText =
    "[On Play] Look at your security stack, then reveal 1 card in it and add it to your hand. If that card is yellow, trigger Recovery +1 (Deck). Then shuffle your security stack.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "memory-set" ? Phase.Active : Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "memory-set" ? 3 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const tk = permanent("demo-tk-takaishi", "BT1-087", 0, 0);
  you.battleArea.push(tk);
  opponent.handCount = 5;

  const redSecurity = card("demo-tk-red-security", "BT1-009", 0);
  const yellowSecurity = card("demo-tk-yellow-security", "BT1-087", 0);
  if (effect === null) {
    you.security.push(redSecurity, yellowSecurity);
    you.securityCount = 2;
  } else if (effect === "yellow-recovered") {
    you.hand.push(yellowSecurity);
    you.handCount = 1;
    you.security.push(redSecurity, card("demo-tk-recovered", "BT1-010", 0));
    you.securityCount = 2;
  } else if (effect === "non-yellow") {
    you.hand.push(redSecurity);
    you.handCount = 1;
    you.security.push(yellowSecurity);
    you.securityCount = 1;
  }
  state.players.push(you, opponent);

  if (effect === null) {
    return {
      state,
      decision: {
        decisionId: "demo-tk-security-choice",
        seat: 0,
        kind: "selectCards",
        promptText: "Look at your security stack and choose 1 card to reveal and add to your hand.",
        sourceCardId: "BT1-087",
        options: {
          candidateInstanceIds: [redSecurity.instanceId, yellowSecurity.instanceId],
          visibleInstanceIds: [redSecurity.instanceId, yellowSecurity.instanceId],
          visibleCards: [
            { instanceId: redSecurity.instanceId, cardId: redSecurity.cardId },
            { instanceId: yellowSecurity.instanceId, cardId: yellowSecurity.cardId },
          ],
          min: 1,
          max: 1,
          timing: "On Play",
          effectText,
        },
      },
    };
  }

  if (effect === "security-play") {
    return {
      state,
      events: [{ kind: "cardsMoved", instanceIds: [tk.topCard.instanceId], from: "security", to: "battleArea" }],
    };
  }
  const descriptions: Record<string, string> = {
    "memory-set": "At the start of the turn, T.K. Takaishi set memory from 1 to 3.",
    "yellow-recovered":
      "T.K. added the chosen yellow security card to hand, recovered the deck top, and shuffled security.",
    "non-yellow": "T.K. added the chosen non-yellow security card to hand without Recovery, then shuffled security.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-087",
        effectKey: effect === "memory-set" ? "BT1-087/memory" : "BT1-087/security-search",
        description: descriptions[effect] ?? effectText,
        timing: effect === "memory-set" ? "Start of Your Turn" : "On Play",
      },
    ],
  };
}
