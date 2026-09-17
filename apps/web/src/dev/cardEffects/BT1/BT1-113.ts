import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function forbiddenTemptationDemo(effect: string | null): CardEffectsFixture {
  const mainText = "[Main] Until the end of your opponent's next turn, 1 opposing Digimon can't attack or block.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" ? Phase.End : effect === "q989-active" ? Phase.Active : Phase.Main;
  state.turnCount = effect === "expired" ? 7 : 5;
  state.turnSeat = effect === null ? 0 : 1;
  state.memory = effect === null ? 4 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-forbidden-color", "BT1-067", 0, 1000));
  if (effect === "q988-digivolved") {
    opponent.battleArea.push(
      permanent("demo-forbidden-target", "BT1-072", 1, 6000, [
        { instanceId: "demo-forbidden-old-top", cardId: "BT1-064" },
      ]),
      permanent("demo-forbidden-other-blocker", "BT1-072", 1, 6000),
    );
  } else if (effect === "q989-active") {
    const digimon = permanent("demo-forbidden-digimon", "BT1-010", 1, 2000);
    digimon.isSuspended = true;
    opponent.battleArea.push(digimon, permanent("demo-forbidden-tamer", "BT1-087", 1, 0));
  } else {
    opponent.battleArea.push(
      permanent("demo-forbidden-target", "BT1-031", 1, 3000),
      permanent("demo-forbidden-other-blocker", "BT1-072", 1, 6000),
    );
    if (effect === "security-active") {
      for (const digimon of opponent.battleArea) digimon.isSuspended = true;
    }
  }
  if (effect === null) {
    you.hand.push(card("demo-forbidden-option", "BT1-113", 0));
    you.handCount = 1;
  } else if (effect === "security-active" || effect === "q989-active") {
    you.trash.push(card("demo-forbidden-security", "BT1-113", 0));
    you.securityCount = 4;
  } else {
    you.trash.push(card("demo-forbidden-option", "BT1-113", 0));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "main-restricted":
      "Forbidden Temptation prevented the selected Digimon from attacking and rejected it as a blocker while another Blocker remained legal.",
    "q988-digivolved":
      "After the selected Digimon digivolved into Woodmon, the same permanent still could not attack or block (Q988).",
    "security-active":
      "Security Forbidden Temptation prevented every opposing Digimon from unsuspending in the next unsuspend phase.",
    "q989-active":
      "During the Active phase, the opposing Digimon remained suspended while the opposing Tamer unsuspended normally (Q989).",
    expired: "Forbidden Temptation's attack and block restrictions expired at the end of the opponent's next turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-113",
        effectKey: effect === "security-active" || effect === "q989-active" ? "BT1-113/security" : "BT1-113/main",
        description: descriptions[effect] ?? mainText,
        timing:
          effect === "security-active" || effect === "q989-active"
            ? "Security"
            : effect === "expired"
              ? "End of Turn"
              : "Main",
      },
    ],
  };
}
