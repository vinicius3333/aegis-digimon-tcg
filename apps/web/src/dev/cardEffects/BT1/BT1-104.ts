import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function goldenRipperDemo(effect: string | null): CardEffectsFixture {
  const mainText =
    "[Main] All of your Digimon gain '[When Attacking] 1 of your opponent's Digimon gets -2000 DP for the turn.'";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" ? Phase.End : Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === null ? 3 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-ripper-color", "BT1-087", 0, 0));
  const reduced = effect === "late-entry" || effect === "q969-digivolved" || effect === "stacked";
  opponent.battleArea.push(
    permanent("demo-ripper-target", "BT1-016", 1, reduced ? 3000 : effect === "stacked" ? 3000 : 5000),
  );
  if (effect === "late-entry") {
    const attacker = permanent("demo-ripper-late", "ST3-02", 0, 3000);
    attacker.isSuspended = true;
    you.battleArea.push(attacker);
  }
  if (effect === "q969-digivolved") {
    const attacker = permanent("demo-ripper-digivolved", "BT5-044", 0, 11000, [
      { instanceId: "demo-ripper-maid-source", cardId: "BT10-041" },
    ]);
    attacker.isSuspended = true;
    you.battleArea.push(attacker);
  }
  if (effect === "stacked") {
    const attacker = permanent("demo-ripper-stacked-attacker", "ST3-02", 0, 3000);
    attacker.isSuspended = true;
    you.battleArea.push(attacker);
    opponent.battleArea[0]!.baseDP = 7000;
  }
  if (effect === null) {
    you.hand.push(card("demo-ripper-option", "BT1-104", 0));
    you.handCount = 1;
  } else if (effect === "security-trashed") {
    you.trash.push(card("demo-ripper-security", "BT1-104", 0));
    you.securityCount = 4;
  } else {
    you.trash.push(card("demo-ripper-option", "BT1-104", 0));
    if (effect === "stacked") you.trash.push(card("demo-ripper-option-two", "BT1-104", 0));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "late-entry":
      "A Digimon that entered after Golden Ripper resolved gained its When Attacking effect and gave -2000 DP (Q967/Q970).",
    "q969-digivolved":
      "The gained When Attacking effect still resolved after the attacker digivolved into Sakuyamon during the attack (Q969).",
    stacked: "Two Golden Ripper copies created independent triggers and gave the same target -4000 DP (Q971).",
    "security-trashed": "Golden Ripper has no Security effect and was simply trashed after the security check (Q968).",
    expired: "Golden Ripper's player-scoped When Attacking grant expired at the end of the turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-104",
        effectKey: effect === "security-trashed" ? "BT1-104/no-security-effect" : "BT1-104/main",
        description: descriptions[effect] ?? mainText,
        timing: effect === "security-trashed" ? "Security" : effect === "expired" ? "End of Turn" : "When Attacking",
      },
    ],
  };
}
