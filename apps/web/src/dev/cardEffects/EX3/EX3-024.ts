import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function slayerdramonDemo(effect: string | null): CardEffectsFixture {
  const startMain =
    "[Start of Opponent's Main Phase] By suspending 1 of your Digimon with [Dramon] or [Examon] in its name, your opponent attacks with 1 of their Digimon.";
  const mode = effect ?? "start-main";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = mode.startsWith("unsuspend") || mode === "evade" || mode === "alternate" ? 0 : 1;
  state.memory = mode === "alternate" ? 0 : 3;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "slayerdramon-opponent");
  const slayer = permanent("demo-slayer-main", "EX3-024", 0, 12000);
  const wing = permanent("demo-slayer-wing", "EX3-020", 0, 7000);
  const examon = permanent("demo-slayer-examon", "EX3-074", 0, 15000);
  const invalid = permanent("demo-slayer-invalid", "BT1-025", 0, 5000);
  const firstAttacker = permanent("demo-slayer-first-attacker", "BT1-029", 1, 2000);
  const secondAttacker = permanent("demo-slayer-second-attacker", "BT1-030", 1, 3000);
  opponent.handCount = 5;

  if (mode === "alternate") {
    slayer.stack.push(card("demo-slayer-wing-source", "EX3-020", 0));
    you.battleArea.push(slayer);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-024",
          effectKey: "EX3-024/alternate",
          description: "Slayerdramon digievoluiu de Wingdramon pelo custo alternativo de 3.",
          timing: "Static",
        },
      ],
    };
  }
  if (["unsuspend", "unsuspend-opt", "evade"].includes(mode)) {
    if (mode === "evade") slayer.stack.push(card("demo-slayer-evade-source", "EX3-020", 0));
    slayer.isSuspended = mode === "unsuspend-opt";
    you.battleArea.push(slayer);
    state.players.push(you, opponent);
    const description =
      mode === "unsuspend-opt"
        ? "Slayerdramon já usou seu Once Per Turn para se reativar; ao ser suspenso novamente, permaneceu suspenso."
        : mode === "evade"
          ? "Slayerdramon usou Evade herdado de Wingdramon, ficou suspenso e então seu efeito All Turns o reativou."
          : "Slayerdramon ficou suspenso e seu efeito All Turns o reativou uma vez neste turno.";
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-024",
          effectKey: `EX3-024/${mode}`,
          description,
          timing: "AllTurns",
        },
      ],
    };
  }

  const inheritedHost = permanent("demo-slayer-inherited-host", "BT1-033", 0, 6000, [
    { instanceId: "demo-slayer-inherited-source", cardId: "EX3-024" },
  ]);
  if (mode === "inherited") you.battleArea.push(inheritedHost, wing);
  else if (mode === "main-inherited" || mode === "two-copies") you.battleArea.push(slayer, inheritedHost, wing);
  else you.battleArea.push(slayer, wing, examon, invalid);
  if (mode !== "zero-opponent") opponent.battleArea.push(firstAttacker, secondAttacker);
  state.players.push(you, opponent);

  if (mode === "start-main") {
    return {
      state,
      decision: {
        decisionId: "demo-slayer-activate",
        seat: 0,
        kind: "optional",
        promptText: "Suspender 1 dos seus Digimon com Dramon ou Examon no nome para forçar um ataque?",
        sourceCardId: "EX3-024",
        options: { timing: "StartOfOpponentsMainPhase", effectText: startMain },
      },
    };
  }
  if (mode === "cost") {
    return {
      state,
      decision: {
        decisionId: "demo-slayer-cost",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Escolha 1 dos seus Digimon com Dramon ou Examon no nome para suspender como custo.",
        sourceCardId: "EX3-024",
        options: {
          candidateInstanceIds: [slayer.permanentId, wing.permanentId, examon.permanentId],
          visibleInstanceIds: [slayer.permanentId, wing.permanentId, examon.permanentId, invalid.permanentId],
          min: 1,
          max: 1,
          timing: "StartOfOpponentsMainPhase",
          effectText: startMain,
        },
      },
    };
  }
  if (mode === "attacker-choice" || mode === "disabled-choice") {
    wing.isSuspended = true;
    return {
      state,
      sessionId: "slayerdramon-opponent",
      decision: {
        decisionId: "demo-slayer-attacker",
        seat: 1,
        kind: "chooseTargets",
        promptText:
          mode === "disabled-choice"
            ? "Escolha 1 dos seus Digimon. Um Digimon que não pode atacar ainda pode ser escolhido; nesse caso, nenhum ataque acontece."
            : "Escolha qual dos seus Digimon realizará o ataque forçado.",
        sourceCardId: "EX3-024",
        options: {
          candidateInstanceIds: [firstAttacker.permanentId, secondAttacker.permanentId],
          visibleInstanceIds: [firstAttacker.permanentId, secondAttacker.permanentId],
          min: 1,
          max: 1,
          timing: "StartOfOpponentsMainPhase",
          effectText: startMain,
        },
      },
    };
  }

  wing.isSuspended = true;
  let description: string;
  if (mode === "zero-opponent")
    description = "Wingdramon pagou o custo, mas não havia Digimon do oponente; o efeito terminou sem ataque.";
  else if (mode === "disabled-resolved")
    description =
      "O oponente escolheu um Digimon impedido de atacar; a escolha era válida, mas nenhum ataque foi realizado.";
  else if (mode === "declined") {
    wing.isSuspended = false;
    description = "A ativação opcional de Slayerdramon foi recusada; nenhum custo foi pago e nenhum ataque ocorreu.";
  } else if (mode === "inherited")
    description =
      "O efeito herdado de Slayerdramon em Dolphmon suspendeu Wingdramon e fez o oponente escolher seu atacante.";
  else if (mode === "main-inherited")
    description =
      "Slayerdramon principal e a cópia herdada ativaram, mas após o primeiro ataque começar a segunda não pôde declarar outro ataque.";
  else if (mode === "two-copies")
    description =
      "Duas cópias de Slayerdramon ativaram; a primeira iniciou um ataque e a segunda não criou um segundo ataque durante o combate.";
  else {
    secondAttacker.isSuspended = true;
    description = "Wingdramon foi suspenso como custo; o oponente escolheu Gomamon, que realizou o ataque forçado.";
  }
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "EX3-024",
        effectKey: `EX3-024/${mode}`,
        description: `${description} ${startMain}`,
        timing: "StartOfOpponentsMainPhase",
      },
    ],
  };
}
