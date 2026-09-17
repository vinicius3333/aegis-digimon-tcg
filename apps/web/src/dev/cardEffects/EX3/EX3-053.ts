import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function metallicdramonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = effect === "keywords" ? 1 : 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "metallicdramon-opponent");
  const metallicdramon = permanent("demo-metallicdramon", "EX3-053", 0, 12000);
  you.battleArea.push(metallicdramon);

  if (effect === "keywords") {
    metallicdramon.isSuspended = true;
    metallicdramon.grantedKeywords.push("Blocker", "Reboot");
    you.battleArea.push(permanent("demo-metallicdramon-hina", "EX3-065", 0, 0));
    opponent.battleArea.push(permanent("demo-metallicdramon-attacker", "BT1-010", 1, 2000));
    state.players.push(you, opponent);
    return { state };
  }

  const firstEligible = permanent("demo-metallicdramon-first", "EX3-049", 1, 4000);
  const secondEligible = permanent("demo-metallicdramon-second", "EX3-049", 1, 4000, [
    { instanceId: "demo-metallicdramon-commandramon-source", cardId: "EX3-046" },
  ]);
  const tooExpensive = permanent("demo-metallicdramon-expensive", "EX3-050", 1, 7000);
  if (effect === "resolved") {
    opponent.trash.push(firstEligible.topCard!);
    opponent.battleArea.push(secondEligible, tooExpensive);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "cardsMoved",
          instanceIds: [firstEligible.topCard!.instanceId],
          from: "battleArea",
          to: "trash",
        },
      ],
    };
  }

  opponent.battleArea.push(firstEligible, secondEligible, tooExpensive);
  state.players.push(you, opponent);
  return {
    state,
    decision: {
      decisionId: "demo-metallicdramon-delete",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Escolha 1 Digimon do oponente com custo de jogo 5 ou menos para deletar",
      sourceCardId: "EX3-053",
      options: {
        candidateInstanceIds: [firstEligible.permanentId, secondEligible.permanentId],
        visibleInstanceIds: [firstEligible.permanentId, secondEligible.permanentId, tooExpensive.permanentId],
        min: 1,
        max: 1,
        timing: "OnPlay",
        effectText:
          "[On Play] De-Digivolve 1 all of your opponent's Digimon. Then, delete 1 of your opponent's Digimon with a play cost of 5 or less. If no Digimon is deleted by this effect, none of your opponent's unsuspended Digimon can digivolve until the end of your opponent's turn.",
      },
    },
  };
}
