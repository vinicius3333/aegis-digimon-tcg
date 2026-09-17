import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function howlingCrusherDemo(effect: string | null): CardEffectsFixture {
  const mainText = "[Main] Trash all digivolution cards under all of your opponent's Digimon.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "q1311-continued" ? 1 : 0;
  state.memory = effect === null ? 7 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const sources = [
    { instanceId: "demo-howling-source-one", cardId: "BT1-001" },
    { instanceId: "demo-howling-source-two", cardId: "BT1-002" },
    { instanceId: "demo-howling-source-three", cardId: "BT1-003" },
  ];
  const resolved = effect !== null;
  opponent.battleArea.push(
    permanent("demo-howling-first", "BT2-047", 1, 4000, resolved ? [] : sources.slice(0, 2)),
    permanent("demo-howling-second", "BT2-060", 1, 6000, resolved ? [] : sources.slice(2)),
  );
  if (effect === "q1311-continued") {
    const attacker = permanent("demo-howling-attacker", "BT1-081", 1, 10000);
    attacker.isSuspended = true;
    opponent.battleArea.push(attacker);
    you.battleArea.push(permanent("demo-howling-hexeblaumon", "BT5-032", 0, 11000));
  }
  if (effect === null) {
    you.hand.push(card("demo-howling-option", "BT1-101", 0));
    you.handCount = 1;
  } else {
    you.trash.push(card("demo-howling-option", "BT1-101", 0));
    opponent.trash.push(...sources.map((source) => card(source.instanceId, source.cardId, 1)));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "main-trashed": "Howling Crusher trashed every digivolution card under every opposing Digimon.",
    "security-trashed": "Howling Crusher's Security effect activated its Main effect and trashed all opposing sources.",
    "q1311-continued":
      "After Security Howling Crusher removed the attacker's sources, the already-declared attack continued through its additional security check despite Hexeblaumon (Q1311).",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-101",
        effectKey: effect === "main-trashed" ? "BT1-101/main" : "BT1-101/security",
        description: descriptions[effect] ?? mainText,
        timing: effect === "main-trashed" ? "Main" : "Security",
      },
    ],
  };
}
