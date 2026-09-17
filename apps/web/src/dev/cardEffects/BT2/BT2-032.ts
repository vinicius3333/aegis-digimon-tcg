import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function ulforceVeedramonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "outside-main" ? Phase.Active : Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "unsuspended-in-main" ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const ulforce = permanent("demo-ulforceveedramon-bt2", "BT2-032", 0, 11000);
  ulforce.isSuspended = effect === "wrong-tamer";
  you.battleArea.push(ulforce, permanent("demo-ulforceveedramon-bt2-tamer", "BT1-086", 0, 0));
  opponent.securityCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "blue-tamer-suspended": "A blue Tamer became suspended, so UlforceVeedramon became unsuspended.",
    "unsuspended-in-main":
      "UlforceVeedramon actually became unsuspended during its controller's main phase and gained 1 memory.",
    "already-active": "Q1008: targeting an already active UlforceVeedramon with unsuspend gained no memory.",
    "wrong-tamer": "A non-blue or opposing Tamer does not satisfy UlforceVeedramon's first effect.",
    "outside-main": "UlforceVeedramon became unsuspended outside the main phase and gained no memory.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-032",
        effectKey: "BT2-032/unsuspend-and-memory",
        description: descriptions[effect] ?? "UlforceVeedramon's conditional effect state is displayed.",
        timing: "Your Turn",
      },
    ],
  };
}
