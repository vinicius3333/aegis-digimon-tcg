import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function taigaBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = effect === "reduced-cost" ? 0 : 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const taiga = permanent("demo-taiga-bt2", "BT2-088", 0, 0);
  taiga.isSuspended = effect === "reduced-cost";
  you.battleArea.push(taiga);
  if (effect === "security-played") {
    // Taiga is already shown in the battle area after resolving Security.
  } else if (effect === null || effect === "piercing" || effect === "opponent-turn") {
    const tyrannomon = permanent("demo-taiga-bt2-tyrannomon", "BT2-044", 0, 5000);
    if (effect !== "opponent-turn") tyrannomon.keywords.push("Piercing");
    you.battleArea.push(tyrannomon, permanent("demo-taiga-bt2-argomon", "BT2-045", 0, 4000));
  } else if (effect === "breeding-area") {
    you.breeding = permanent("demo-taiga-bt2-breeding", "BT2-044", 0, 5000);
    you.breeding.inBreeding = true;
  } else {
    you.battleArea.push(
      permanent("demo-taiga-bt2-evolved", effect === "non-tyrannomon" ? "BT2-045" : "BT2-044", 0, 5000),
    );
  }
  state.players.push(you, opponent);

  const selected = effect ?? "piercing";
  const descriptions: Record<string, string> = {
    piercing: "During Taiga's turn, the controller's Tyrannomon gained Piercing while the non-Tyrannomon did not.",
    "opponent-turn": "Taiga's Piercing grant ended outside its controller's turn.",
    "reduced-cost": "Taiga suspended to reduce a battle-area Tyrannomon digivolution cost by 1.",
    declined: "Taiga's optional reduction was declined, so the full digivolution cost was paid.",
    "non-tyrannomon": "Digivolving into a non-Tyrannomon card received no reduction and did not suspend Taiga.",
    "breeding-area": "Q1038: a Tyrannomon digivolution in the breeding area received no reduction.",
    "security-played": "Taiga's Security effect played him without paying the memory cost.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-088",
        effectKey: `BT2-088/${selected}`,
        description: descriptions[selected]!,
        timing: selected === "security-played" ? "Security" : "YourTurn",
      },
    ],
  };
}
