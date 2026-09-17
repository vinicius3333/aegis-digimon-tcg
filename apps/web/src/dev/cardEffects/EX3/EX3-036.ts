import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function magnadramonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const onPlay =
    "[On Play] All of your opponent's Digimon gain ＜Security Attack -1＞ until the end of your opponent's turn. (This Digimon checks 1 fewer security cards.) If this card was played by [Trial of the Four Great Dragons]'s effect, all of your opponent's Digimon gain ＜Security Attack -2＞ until the end of your opponent's turn instead.";
  const onDeletion =
    "[On Deletion] If you don't have a [Trial of the Four Great Dragons] in play, you may place 1 [Trial of the Four Great Dragons] from your hand in your battle area.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = effect === "expired" ? 8 : 7;
  state.turnSeat = effect === "expired" ? 0 : 1;
  state.memory = 1;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "magnadramon-opponent");

  if (!effect || effect === "trial" || effect === "expired") {
    you.battleArea.push(permanent("demo-magnadramon", "EX3-036", 0, 12000));
    if (effect === "trial") you.battleArea.push(permanent("demo-magnadramon-trial", "EX3-069", 0, 0));
    opponent.battleArea.push(
      permanent("demo-magnadramon-elecmon", "BT1-028", 1, 2000),
      permanent("demo-magnadramon-gabumon", "BT1-029", 1, 2000, [
        { instanceId: "demo-magnadramon-gabumon-source", cardId: "BT1-003" },
      ]),
      permanent("demo-magnadramon-agumon", "BT1-010", 1, 2000),
    );
    state.players.push(you, opponent);
    const description =
      effect === "trial"
        ? "Magnadramon foi jogada pelo efeito de Trial of the Four Great Dragons: todos os Digimon do oponente receberam Security Attack -2 até o fim do turno do oponente."
        : effect === "expired"
          ? "O turno do oponente terminou; a redução de Security Attack de Magnadramon expirou para todos os Digimon do oponente."
          : "Magnadramon foi jogada normalmente: todos os Digimon do oponente receberam Security Attack -1 até o fim do turno do oponente.";
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-036",
          effectKey: effect === "expired" ? "EX3-036/on-play-expired" : "EX3-036/on-play-security-attack",
          description: `${description} ${onPlay}`,
          timing: "OnPlay",
        },
      ],
    };
  }

  you.trash.push(card("demo-magnadramon-deleted", "EX3-036", 0));
  const firstTrial = card("demo-magnadramon-trial-one", "EX3-069", 0);
  const secondTrial = card("demo-magnadramon-trial-two", "EX3-069", 0);
  const filler = card("demo-magnadramon-filler", "BT1-010", 0);

  if (effect === "accepted") {
    const placedTrial = permanent("demo-magnadramon-placed-trial", "EX3-069", 0, 0);
    placedTrial.topCard.instanceId = firstTrial.instanceId;
    you.battleArea.push(placedTrial);
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
          sourceCardId: "EX3-036",
          effectKey: "EX3-036/on-deletion-place-trial",
          description: "Magnadramon colocou 1 Trial of the Four Great Dragons da mão na área de batalha.",
          timing: "OnDestroyedAnyone",
        },
      ],
    };
  }

  if (effect === "trial-in-play") {
    you.battleArea.push(permanent("demo-magnadramon-existing-trial", "EX3-069", 0, 0));
    you.hand.push(firstTrial);
    you.handCount = 1;
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-036",
          effectKey: "EX3-036/on-deletion-gated",
          description: "Já havia uma Trial of the Four Great Dragons em jogo; o efeito On Deletion não abriu uma ação.",
          timing: "OnDestroyedAnyone",
        },
      ],
    };
  }

  if (effect === "no-trial-hand") {
    you.hand.push(filler);
    you.handCount = 1;
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-036",
          effectKey: "EX3-036/on-deletion-no-card",
          description: "Não havia Trial of the Four Great Dragons na mão; nenhuma ação foi aberta.",
          timing: "OnDestroyedAnyone",
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
          sourceCardId: "EX3-036",
          effectKey: "EX3-036/on-deletion-declined",
          description:
            "A colocação opcional de Trial of the Four Great Dragons foi recusada; as cartas permaneceram na mão.",
          timing: "OnDestroyedAnyone",
        },
      ],
    };
  }

  if (effect === "trial-choice" || step === "trial-choice") {
    return {
      state,
      decision: {
        decisionId: "demo-magnadramon-trial-choice",
        seat: 0,
        kind: "selectCards",
        promptText: "Escolha 1 Trial of the Four Great Dragons para colocar na área de batalha",
        sourceCardId: "EX3-036",
        options: {
          candidateInstanceIds: [firstTrial.instanceId, secondTrial.instanceId],
          visibleInstanceIds: [firstTrial.instanceId, secondTrial.instanceId, filler.instanceId],
          min: 1,
          max: 1,
          timing: "OnDestroyedAnyone",
          effectText: onDeletion,
        },
      },
    };
  }

  return {
    state,
    decision: {
      decisionId: "demo-magnadramon-on-deletion",
      seat: 0,
      kind: "optional",
      promptText: "Colocar 1 Trial of the Four Great Dragons da mão na área de batalha?",
      sourceCardId: "EX3-036",
      options: { timing: "OnDestroyedAnyone", effectText: onDeletion },
    },
  };
}
