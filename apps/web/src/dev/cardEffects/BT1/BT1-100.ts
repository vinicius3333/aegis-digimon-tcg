import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function graceCrossFreezerDemo(effect: string | null): CardEffectsFixture {
  const mainText =
    "[Main] Until the end of your opponent's next turn, their Digimon with no digivolution cards can't attack.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" || effect === "security-expired" ? Phase.End : Phase.Main;
  state.turnCount = effect === "expired" || effect === "security-expired" ? 6 : 5;
  state.turnSeat = effect === null ? 0 : 1;
  state.memory = effect === null ? 4 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-freezer-blue", "BT1-028", 0, 3000));
  const gainedSource = effect === "q965-gained";
  opponent.battleArea.push(
    permanent(
      "demo-freezer-first",
      "BT1-010",
      1,
      2000,
      gainedSource ? [{ instanceId: "demo-freezer-new-source", cardId: "BT1-001" }] : [],
    ),
    permanent("demo-freezer-loaded", "BT2-047", 1, 4000, [
      { instanceId: "demo-freezer-existing-source", cardId: "BT1-002" },
    ]),
  );
  if (effect === "late-arrival") opponent.battleArea.push(permanent("demo-freezer-late", "BT1-011", 1, 3000));
  if (effect === null) {
    you.hand.push(card("demo-freezer-option", "BT1-100", 0));
    you.handCount = 1;
  } else {
    you.trash.push(card("demo-freezer-option", "BT1-100", 0));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "main-active":
      "Grace Cross Freezer stopped every opposing source-less Digimon from attacking while the loaded Digimon could attack.",
    "q965-gained": "The formerly restricted Digimon gained a digivolution card and could attack immediately (Q965).",
    "late-arrival": "A source-less Digimon that entered after Grace Cross Freezer resolved was also unable to attack.",
    expired: "Grace Cross Freezer's Main restriction expired at the end of the opponent's next turn.",
    "security-active":
      "Grace Cross Freezer's Security effect stopped opposing source-less Digimon from attacking for the current turn.",
    "security-expired": "The Security restriction expired at the end of the current turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-100",
        effectKey: effect.startsWith("security-") ? "BT1-100/security" : "BT1-100/main",
        description: descriptions[effect] ?? mainText,
        timing: effect.startsWith("security-") ? "Security" : effect === "expired" ? "End of Turn" : "Main",
      },
    ],
  };
}
