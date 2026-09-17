import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function garurumonPurpleBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = effect === "first-gain" || effect === "once-only" || effect === "simultaneous" ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(
    permanent("demo-garurumon-bt2-host", "BT2-074", 0, 7000, [
      { instanceId: "demo-garurumon-bt2-source", cardId: "BT2-073" },
    ]),
  );
  const deletedCount = effect === "simultaneous" || effect === "once-only" ? 2 : 1;
  for (let index = 0; index < deletedCount; index += 1) {
    const owner = effect === "opponent-digimon" ? 1 : 0;
    const targetTrash = owner === 0 ? you.trash : opponent.trash;
    targetTrash.push(card(`demo-garurumon-bt2-deleted-${index}`, index === 0 ? "BT2-068" : "BT2-070", owner));
  }
  state.players.push(you, opponent);

  const selected = effect ?? "first-gain";
  const descriptions: Record<string, string> = {
    "first-gain": "Garurumon's inherited effect gained 1 memory when another own Digimon was deleted.",
    "once-only":
      "A second separate deletion in the same turn did not gain more memory because the effect is once per turn.",
    simultaneous: "Two other Digimon deleted simultaneously caused only 1 memory gain, matching Q1026.",
    "opponent-digimon": "Deleting an opponent's Digimon did not trigger Garurumon's inherited effect.",
    "opponent-turn": "Deleting another own Digimon during the opponent's turn did not trigger Garurumon.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-073",
        effectKey: `BT2-073/${selected}`,
        description: descriptions[selected]!,
        timing: selected === "opponent-turn" ? "OpponentsTurn" : "YourTurn",
      },
    ],
  };
}
