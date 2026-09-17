import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function angewomonDemo(effect: string | null): CardEffectsFixture {
  const whenDigivolving =
    "[When Digivolving] If you don't have a [Trial of the Four Great Dragons] in play, you may place 1 [Trial of the Four Great Dragons] from your hand in your battle area.";
  const watcher =
    "[Your Turn][Once Per Turn] When you play a Digimon with [Four Great Dragons] in its traits or place [Trial of the Four Great Dragons] in your battle area, 1 of your opponent's Digimon gets -3000 DP for the turn.";
  const inherited =
    "[Your Turn][Once Per Turn] When you play a Digimon with [Four Great Dragons] in its traits or place a [Trial of the Four Great Dragons] in your battle area, 1 of your opponent's Digimon gets -3000 DP for the turn.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = effect === "expired" ? 9 : 8;
  state.turnSeat = 0;
  state.memory = 1;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "angewomon-opponent");
  const firstTrial = card("demo-angewomon-trial-one", "EX3-069", 0);
  const secondTrial = card("demo-angewomon-trial-two", "EX3-069", 0);
  const filler = card("demo-angewomon-filler", "BT1-010", 0);
  const angewomon = permanent("demo-angewomon-audit", "EX3-034", 0, 7000, [
    { instanceId: "demo-angewomon-base", cardId: "EX3-031" },
  ]);
  you.battleArea.push(angewomon);

  if (
    ["watcher", "watcher-play", "watcher-place", "inherited", "inherited-place", "once-per-turn", "expired"].includes(
      effect ?? "",
    )
  ) {
    if (effect === "inherited" || effect === "inherited-place") {
      you.battleArea.length = 0;
      you.battleArea.push(
        permanent("demo-angewomon-inherited-host", "EX3-036", 0, 12000, [
          { instanceId: "demo-angewomon-inherited", cardId: "EX3-034" },
        ]),
      );
    }
    if (effect === "watcher-place" || effect === "inherited-place")
      you.battleArea.push(permanent("demo-angewomon-placed-trial", "EX3-069", 0, 0));
    const chosen = permanent("demo-angewomon-chosen", "BT1-028", 1, effect === "expired" ? 2000 : 5000);
    const unchosen = permanent("demo-angewomon-unchosen", "BT1-029", 1, 8000);
    opponent.battleArea.push(chosen, unchosen);
    state.players.push(you, opponent);
    if (effect === "watcher") {
      return {
        state,
        decision: {
          decisionId: "demo-angewomon-watcher-target",
          seat: 0,
          kind: "chooseTargets",
          promptText: "Escolha 1 Digimon do oponente para receber -3000 DP",
          sourceCardId: "EX3-034",
          options: {
            candidateInstanceIds: [chosen.permanentId, unchosen.permanentId],
            visibleInstanceIds: [chosen.permanentId, unchosen.permanentId],
            min: 1,
            max: 1,
            timing: "YourTurn",
            effectText: watcher,
          },
        },
      };
    }
    const reason =
      effect === "watcher-place"
        ? "Trial of the Four Great Dragons foi colocada na área de batalha"
        : effect === "inherited-place"
          ? "O efeito herdado de Angewomon observou Trial of the Four Great Dragons ser colocada na área de batalha"
          : effect === "inherited"
            ? "O efeito herdado de Angewomon observou o Digimon Four Great Dragons jogado"
            : "Um Digimon Four Great Dragons foi jogado";
    const description =
      effect === "expired"
        ? "O turno terminou; a redução de -3000 DP de Angewomon expirou."
        : effect === "once-per-turn"
          ? "Angewomon já ativou neste turno; o segundo evento não abriu outra escolha nem aplicou outro -3000 DP."
          : `${reason}; Elecmon recebeu -3000 DP até o fim do turno.`;
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-034",
          effectKey: `EX3-034/${effect}`,
          description: `${description} ${effect === "inherited" || effect === "inherited-place" ? inherited : watcher}`,
          timing: "YourTurn",
        },
      ],
    };
  }

  if (effect === "accepted") {
    const placed = permanent("demo-angewomon-accepted-trial", "EX3-069", 0, 0);
    placed.topCard.instanceId = firstTrial.instanceId;
    you.battleArea.push(placed);
    you.hand.push(secondTrial, filler);
    you.handCount = 2;
    state.players.push(you, opponent);
    return {
      state,
      events: [
        { kind: "cardsMoved", instanceIds: [firstTrial.instanceId], from: "hand", to: "battleArea" },
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-034",
          effectKey: "EX3-034/when-digivolving-place-trial",
          description:
            "Angewomon colocou 1 Trial of the Four Great Dragons na área de batalha sem ativar o efeito Main nem comprar uma carta.",
          timing: "WhenDigivolving",
        },
      ],
    };
  }

  if (effect === "existing-trial") {
    you.battleArea.push(permanent("demo-angewomon-existing-trial", "EX3-069", 0, 0));
    you.hand.push(firstTrial);
    you.handCount = 1;
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-034",
          effectKey: "EX3-034/gated",
          description: "Já havia uma Trial of the Four Great Dragons em jogo; Angewomon não abriu a ação opcional.",
          timing: "WhenDigivolving",
        },
      ],
    };
  }

  you.hand.push(firstTrial, secondTrial, filler);
  you.handCount = 3;
  state.players.push(you, opponent);
  if (effect === "declined") {
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-034",
          effectKey: "EX3-034/declined",
          description: "A colocação opcional foi recusada; as duas cópias de Trial permaneceram na mão.",
          timing: "WhenDigivolving",
        },
      ],
    };
  }
  if (effect === "trial-choice") {
    return {
      state,
      decision: {
        decisionId: "demo-angewomon-trial-choice",
        seat: 0,
        kind: "selectCards",
        promptText: "Escolha 1 Trial of the Four Great Dragons para colocar na área de batalha",
        sourceCardId: "EX3-034",
        options: {
          candidateInstanceIds: [firstTrial.instanceId, secondTrial.instanceId],
          visibleInstanceIds: [firstTrial.instanceId, secondTrial.instanceId, filler.instanceId],
          min: 1,
          max: 1,
          timing: "WhenDigivolving",
          effectText: whenDigivolving,
        },
      },
    };
  }
  return {
    state,
    decision: {
      decisionId: "demo-angewomon-optional",
      seat: 0,
      kind: "optional",
      promptText: "Colocar 1 Trial of the Four Great Dragons da mão na área de batalha?",
      sourceCardId: "EX3-034",
      options: { timing: "WhenDigivolving", effectText: whenDigivolving },
    },
  };
}
