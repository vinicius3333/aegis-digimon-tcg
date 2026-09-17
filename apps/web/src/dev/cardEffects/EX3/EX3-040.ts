import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function parasaurmonDemo(effect: string | null): CardEffectsFixture {
  const reducer =
    "[Your Turn] When you would play a green Digimon card, by suspending this Digimon, reduce the cost by 1.";
  const inherited =
    "[Your Turn][Once Per Turn] When an effect suspends one of your Digimon, suspend 1 of your opponent's Digimon.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = effect === "offturn" ? 1 : 0;
  state.memory = effect === "reduced" ? 2 : 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "parasaurmon-opponent");
  const parasaurmonOne = permanent("demo-parasaurmon-one", "EX3-040", 0, 4000, [
    { instanceId: "demo-parasaurmon-one-source", cardId: "EX3-038" },
  ]);
  const parasaurmonTwo = permanent("demo-parasaurmon-two", "EX3-040", 0, 4000, [
    { instanceId: "demo-parasaurmon-two-source-a", cardId: "BT1-072" },
    { instanceId: "demo-parasaurmon-two-source-b", cardId: "EX3-039" },
  ]);
  const elecmon = permanent("demo-parasaurmon-elecmon", "BT1-028", 1, 2000);
  const gomamon = permanent("demo-parasaurmon-gomamon", "BT1-030", 1, 3000, [
    { instanceId: "demo-parasaurmon-gomamon-source", cardId: "BT1-003" },
  ]);
  const gabumon = permanent("demo-parasaurmon-gabumon", "BT1-029", 1, 1000);

  if (effect === "reducer") {
    parasaurmonOne.isSuspended = true;
    you.battleArea.push(parasaurmonOne, parasaurmonTwo);
    state.players.push(you, opponent);
    return {
      state,
      decision: {
        decisionId: "demo-parasaurmon-second-reducer",
        seat: 0,
        kind: "optional",
        promptText: "Suspender o segundo Parasaurmon para reduzir o custo deste Digimon verde em mais 1?",
        sourceCardId: "EX3-040",
        options: { timing: "YourTurn", effectText: reducer },
      },
    };
  }

  if (effect === "reduced") {
    parasaurmonTwo.isSuspended = true;
    const goblimon = permanent("demo-parasaurmon-played", "BT1-064", 0, 2000);
    you.battleArea.push(parasaurmonOne, parasaurmonTwo, goblimon);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "memoryChanged",
          from: 3,
          to: 2,
          reason: "Goblimon foi jogado por custo 1 após a redução de Parasaurmon",
        },
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-040",
          effectKey: "EX3-040/play-cost-reducer",
          description: "Parasaurmon foi suspenso e reduziu o custo de jogo em 1.",
          timing: "YourTurn",
        },
      ],
    };
  }

  if (effect === "inactive" || effect === "suspended" || effect === "offturn" || effect === "ineligible") {
    if (effect === "suspended") parasaurmonOne.isSuspended = true;
    if (effect === "ineligible") you.hand.push(card("demo-parasaurmon-blue", "BT1-029", 0));
    if (effect === "suspended" || effect === "offturn") {
      you.hand.push(card("demo-parasaurmon-green", "BT1-064", 0));
    }
    you.handCount = you.hand.length;
    you.battleArea.push(parasaurmonOne);
    state.players.push(you, opponent);
    return { state };
  }

  if (effect === "inherited-resolved") {
    const host = permanent("demo-parasaurmon-inherited-host", "EX3-043", 0, 8000, [
      { instanceId: "demo-parasaurmon-inherited-source", cardId: "EX3-040" },
    ]);
    elecmon.isSuspended = true;
    you.battleArea.push(host);
    opponent.battleArea.push(elecmon, gomamon);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-040",
          effectKey: "EX3-040/inherited-suspend",
          description: "O efeito herdado de Parasaurmon suspendeu Elecmon.",
          timing: "YourTurn",
        },
      ],
    };
  }

  if (effect === "inherited") {
    const host = permanent("demo-parasaurmon-inherited-host", "EX3-043", 0, 8000, [
      { instanceId: "demo-parasaurmon-inherited-source", cardId: "EX3-040" },
    ]);
    gabumon.isSuspended = true;
    you.battleArea.push(host);
    opponent.battleArea.push(elecmon, gomamon, gabumon);
    state.players.push(you, opponent);
    return {
      state,
      decision: {
        decisionId: "demo-parasaurmon-inherited-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Escolha 1 Digimon ativo do oponente para suspender",
        sourceCardId: "EX3-040",
        options: {
          candidateInstanceIds: [elecmon.permanentId, gomamon.permanentId],
          visibleInstanceIds: [elecmon.permanentId, gomamon.permanentId, gabumon.permanentId],
          min: 1,
          max: 1,
          timing: "YourTurn",
          effectText: inherited,
          isInherited: true,
        },
      },
    };
  }

  you.battleArea.push(parasaurmonOne, parasaurmonTwo);
  state.players.push(you, opponent);
  return {
    state,
    decision: {
      decisionId: "demo-parasaurmon-reducer-optional",
      seat: 0,
      kind: "optional",
      promptText: "Suspender Parasaurmon para reduzir em 1 o custo deste Digimon verde?",
      sourceCardId: "EX3-040",
      options: { timing: "YourTurn", effectText: reducer },
    },
  };
}
