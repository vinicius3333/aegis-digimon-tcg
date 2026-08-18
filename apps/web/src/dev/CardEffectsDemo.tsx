import { useMemo, useState } from "react";
import {
  CardInstance,
  GameState,
  Permanent,
  Phase,
  PlayerState,
  type DecisionRequest,
  type ServerEvent,
} from "@aegis/shared";
import { GameScreen } from "../game/GameScreen";
import type { UseRoomResult } from "../net/useRoom";

type DemoConnection = Pick<
  UseRoomResult,
  "room" | "status" | "state" | "events" | "decision" | "acknowledgeDecision" | "error" | "sessionId" | "roomCode"
> & {
  acknowledgeBlockWindow?: (blockerPermanentId?: string) => void;
};

interface CardEffectsFixture {
  state: GameState;
  decision?: DecisionRequest;
  events?: ServerEvent[];
  sessionId?: string;
}

function card(instanceId: string, cardId: string, ownerSeat: 0 | 1): CardInstance {
  const instance = new CardInstance();
  instance.instanceId = instanceId;
  instance.cardId = cardId;
  instance.ownerSeat = ownerSeat;
  return instance;
}

function permanent(
  permanentId: string,
  cardId: string,
  controllerSeat: 0 | 1,
  currentDP: number,
  under: Array<{ instanceId: string; cardId: string }> = [],
): Permanent {
  const result = new Permanent();
  result.permanentId = permanentId;
  result.controllerSeat = controllerSeat;
  result.topCard = card(`${permanentId}-top`, cardId, controllerSeat);
  result.baseDP = currentDP;
  result.currentDP = currentDP;
  result.stack.push(...under.map((source) => card(source.instanceId, source.cardId, controllerSeat)));
  return result;
}

function fighterModeDemo(effect: string | null): { state: GameState; decision: DecisionRequest } {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(
    permanent("demo-fighter-mode", "EX3-073", 0, 13000, [{ instanceId: "demo-dragon-mode-source", cardId: "EX3-063" }]),
  );
  you.battleArea.push(permanent("demo-veemon-ally", "EX3-004", 0, 2000));
  opponent.battleArea.push(permanent("demo-elecmon", "BT1-028", 1, 2000));
  opponent.battleArea.push(permanent("demo-gabumon", "BT1-029", 1, 2000));
  you.trash.push(card("demo-wormmon-trash", "EX3-055", 0));
  you.trash.push(card("demo-veemon-trash", "EX3-004", 0));
  you.trash.push(card("demo-unrelated-trash", "BT1-028", 0));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === "on-deletion") {
    return {
      state,
      decision: {
        decisionId: "demo-fighter-mode-on-deletion-wormmon",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Select cards",
        sourceCardId: "EX3-073",
        options: {
          candidateInstanceIds: ["demo-wormmon-trash"],
          visibleInstanceIds: ["demo-wormmon-trash", "demo-veemon-trash", "demo-unrelated-trash"],
          min: 0,
          max: 1,
          timing: "OnDeletion",
          effectText: "[On Deletion] You may play 1 [Wormmon] and 1 [Veemon] from your trash without paying the costs.",
        },
      },
    };
  }

  return {
    state,
    decision: {
      decisionId: "demo-fighter-mode-when-digivolving",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose targets",
      sourceCardId: "EX3-073",
      options: {
        candidateInstanceIds: ["demo-dragon-mode-source"],
        min: 1,
        max: 1,
        timing: "WhenDigivolving",
        effectText:
          "[When Digivolving] By returning 1 [Imperialdramon: Dragon Mode] from this Digimon's digivolution cards to the bottom of its owner's deck, none of your opponent's [Security] effects can activate for the turn.",
      },
    },
  };
}

function megiddoFlameDemo(effect: string | null): { state: GameState; decision: DecisionRequest } {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 4;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect !== "security") you.battleArea.push(permanent("demo-guilmon-cost", "EX3-056", 0, 2000));
  opponent.battleArea.push(permanent("demo-growlmon", "EX3-057", 1, 4000));
  opponent.battleArea.push(permanent("demo-megidramon", "EX3-064", 1, 12000));
  opponent.battleArea.push(permanent("demo-examon", "EX3-074", 1, 15000));
  you.trash.push(card("demo-guilmon-trash", "EX3-056", 0));
  you.trash.push(card("demo-guilmon-x-trash", "BT9-009", 0));
  you.trash.push(card("demo-growlmon-trash", "EX3-057", 0));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  const effectText =
    "[Main] Delete 1 of your opponent's level 4 or lower Digimon. By deleting 1 of your Digimon, delete 1 of your opponent's level 6 or lower Digimon instead.";
  if (effect === "security") {
    return {
      state,
      decision: {
        decisionId: "demo-megiddo-flame-security",
        seat: 0,
        kind: "selectCards",
        promptText: "Select cards",
        sourceCardId: "EX3-072",
        options: {
          candidateInstanceIds: ["demo-guilmon-trash", "demo-guilmon-x-trash"],
          visibleInstanceIds: ["demo-guilmon-trash", "demo-guilmon-x-trash", "demo-growlmon-trash"],
          min: 1,
          max: 1,
          timing: "Security",
          effectText: "[Security] You may play 1 [Guilmon] from your trash without paying the cost.",
        },
      },
    };
  }

  return {
    state,
    decision: {
      decisionId: "demo-megiddo-flame-main",
      seat: 0,
      kind: "chooseOption",
      promptText: "Choose one effect to activate",
      sourceCardId: "EX3-072",
      options: {
        choices: [
          "Delete 1 opponent's level 4 or lower Digimon",
          "Delete 1 of your Digimon to delete 1 opponent's level 6 or lower Digimon instead",
        ],
        timing: "Main",
        effectText,
      },
    },
  };
}

function laserCannonDemo(effect: string | null, step: string | null): { state: GameState; decision: DecisionRequest } {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "security" ? 0 : 5;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-commandramon", "EX3-046", 0, 2000));
  opponent.battleArea.push(
    permanent("demo-metallicdramon", "EX3-053", 1, 12000, [
      { instanceId: "demo-cyberdramon-source", cardId: "EX3-050" },
    ]),
  );
  opponent.battleArea.push(permanent("demo-sealsdramon", "EX3-049", 1, 4000));
  opponent.battleArea.push(permanent("demo-examon", "EX3-074", 1, 15000));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  const mainText =
    "[Main] ＜De-Digivolve 1＞ 1 of your opponent's Digimon. (Trash 1 card from the top of 1 of your opponent's Digimon. Stop trashing when you would trash a level 3 card or the Digimon's last card.) Then, delete 1 of your opponent's Digimon with a play cost of 5 or less.";
  const effectText = effect === "security" ? `[Security] Activate this card's [Main] effect. ${mainText}` : mainText;
  const isDeleteStep = step === "delete";

  return {
    state,
    decision: {
      decisionId: isDeleteStep ? "demo-laser-cannon-delete" : "demo-laser-cannon-de-digivolve",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose targets",
      sourceCardId: "EX3-071",
      options: {
        candidateInstanceIds: isDeleteStep
          ? ["demo-sealsdramon"]
          : ["demo-metallicdramon", "demo-sealsdramon", "demo-examon"],
        visibleInstanceIds: ["demo-metallicdramon", "demo-sealsdramon", "demo-examon"],
        min: 1,
        max: 1,
        timing: effect === "security" ? "Security" : "Main",
        effectText,
      },
    },
  };
}

function avalonsGateDemo(effect: string | null, step: string | null): { state: GameState; decision: DecisionRequest } {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "security" ? 0 : 7;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-slayerdramon", "EX3-024", 0, 12000));
  const dracomon = permanent("demo-dracomon", "EX3-037", 0, 2000);
  dracomon.isSuspended = true;
  you.battleArea.push(dracomon);
  if (effect === "examon") you.battleArea.push(permanent("demo-examon", "EX3-074", 0, 15000));
  opponent.battleArea.push(permanent("demo-pomumon", "EX3-038", 1, 2000));
  opponent.battleArea.push(permanent("demo-metallicdramon", "EX3-053", 1, 12000));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  const mainText =
    "[Main] Activate 1 of the effects below. If you have a Digimon with [Examon] in its name in play, activate all of the effects below instead. ・ Suspend 1 of your opponent's Digimon, and 1 of your Digimon gains ＜Piercing＞ for the turn. ・ Unsuspend 1 of your Digimon.";
  const securityText = "[Security] Suspend 1 of your opponent's Digimon, and unsuspend 1 of your Digimon.";
  const timing = effect === "security" ? "Security" : "Main";

  if (!effect && !step) {
    return {
      state,
      decision: {
        decisionId: "demo-avalons-gate-mode",
        seat: 0,
        kind: "chooseOption",
        promptText: "Choose one effect to activate",
        sourceCardId: "EX3-070",
        options: {
          choices: ["Suspend an opponent's Digimon and grant ＜Piercing＞", "Unsuspend one of your Digimon"],
          timing,
          effectText: mainText,
        },
      },
    };
  }

  const isPiercing = step === "piercing";
  const isUnsuspend = step === "unsuspend";
  const candidateInstanceIds = isPiercing
    ? ["demo-slayerdramon", "demo-dracomon"]
    : isUnsuspend
      ? ["demo-dracomon"]
      : ["demo-pomumon", "demo-metallicdramon"];
  const visibleInstanceIds =
    isPiercing || isUnsuspend
      ? effect === "examon"
        ? ["demo-slayerdramon", "demo-dracomon", "demo-examon"]
        : ["demo-slayerdramon", "demo-dracomon"]
      : ["demo-pomumon", "demo-metallicdramon"];

  return {
    state,
    decision: {
      decisionId: `demo-avalons-gate-${step ?? effect ?? "suspend"}`,
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose targets",
      sourceCardId: "EX3-070",
      options: {
        candidateInstanceIds,
        visibleInstanceIds,
        min: 1,
        max: 1,
        timing,
        effectText: effect === "security" ? securityText : mainText,
      },
    },
  };
}

function trialOfTheFourGreatDragonsDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = effect === "main" ? 5 : 6;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === "main") {
    you.battleArea.push(permanent("demo-trial", "EX3-069", 0, 0));
    you.hand.push(card("demo-drawn-azulongmon", "EX3-025", 0));
    you.handCount = 1;
    return {
      state,
      events: [
        { kind: "cardsMoved", instanceIds: ["demo-drawn-azulongmon"], from: "deck", to: "hand" },
        { kind: "cardsMoved", instanceIds: ["demo-trial-top"], from: "hand", to: "battleArea" },
      ],
    };
  }

  if (effect === "security") {
    you.battleArea.push(permanent("demo-trial", "EX3-069", 0, 0));
    return {
      state,
      events: [{ kind: "cardsMoved", instanceIds: ["demo-trial-top"], from: "security", to: "battleArea" }],
    };
  }

  you.trash.push(card("demo-trial-trash", "EX3-069", 0));
  you.hand.push(card("demo-azulongmon", "EX3-025", 0));
  you.hand.push(card("demo-magnadramon", "EX3-036", 0));
  you.hand.push(card("demo-agumon", "BT1-010", 0));
  you.handCount = you.hand.length;

  return {
    state,
    decision: {
      decisionId: "demo-trial-delay",
      seat: 0,
      kind: "selectCards",
      promptText: "Select cards",
      sourceCardId: "EX3-069",
      options: {
        candidateInstanceIds: ["demo-azulongmon", "demo-magnadramon"],
        visibleInstanceIds: ["demo-azulongmon", "demo-magnadramon", "demo-agumon"],
        min: 1,
        max: 1,
        timing: "Main",
        effectText:
          "[Main] ＜Delay＞ Play 1 Digimon card with [Four Great Dragons] in its traits from your hand without paying the cost. The Digimon played by this effect can't digivolve to level 7, and at the next end of your opponent's turn, delete that Digimon.",
      },
    },
  };
}

function godFlameDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = effect === "security" ? 0 : 5;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-angewomon", "EX3-034", 0, 6000));
  const megidramon = permanent("demo-megidramon", "EX3-064", 1, 12000);
  if (step === "optional" || step === "recovery") megidramon.currentDP = 6000;
  opponent.battleArea.push(megidramon);
  opponent.battleArea.push(permanent("demo-examon", "EX3-074", 1, 15000));
  you.trash.push(card("demo-azulongmon-trash", "EX3-025", 0));
  you.trash.push(card("demo-trial-trash", "EX3-069", 0));
  you.trash.push(card("demo-agumon-trash", "BT1-010", 0));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  const mainText =
    "[Main] 1 of your opponent's Digimon gets -6000 DP for the turn. Then, you may return 1 card with the [Four Great Dragons] trait from your trash to your hand.";
  const effectText = effect === "security" ? `[Security] Activate this card's [Main] effect. ${mainText}` : mainText;
  const timing = effect === "security" ? "Security" : "Main";

  if (step === "optional") {
    return {
      state,
      decision: {
        decisionId: "demo-god-flame-optional",
        seat: 0,
        kind: "optional",
        promptText: "Return a Four Great Dragons card to your hand?",
        sourceCardId: "EX3-068",
        options: { timing, effectText },
      },
    };
  }

  if (step === "recovery") {
    return {
      state,
      decision: {
        decisionId: "demo-god-flame-recovery",
        seat: 0,
        kind: "selectCards",
        promptText: "Select cards",
        sourceCardId: "EX3-068",
        options: {
          candidateInstanceIds: ["demo-azulongmon-trash", "demo-trial-trash"],
          visibleInstanceIds: ["demo-azulongmon-trash", "demo-trial-trash", "demo-agumon-trash"],
          min: 1,
          max: 1,
          timing,
          effectText,
        },
      },
    };
  }

  return {
    state,
    decision: {
      decisionId: "demo-god-flame-dp",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose targets",
      sourceCardId: "EX3-068",
      options: {
        candidateInstanceIds: ["demo-megidramon", "demo-examon"],
        visibleInstanceIds: ["demo-megidramon", "demo-examon"],
        min: 1,
        max: 1,
        timing,
        effectText,
      },
    },
  };
}

function souraiDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-gabumon-blue", "BT1-029", 0, 2000));
  opponent.battleArea.push(
    permanent(
      "demo-paildramon",
      "EX3-010",
      1,
      12000,
      step === "resolved"
        ? []
        : [
            { instanceId: "demo-paildramon-source-1", cardId: "EX3-004" },
            { instanceId: "demo-paildramon-source-2", cardId: "EX3-018" },
            { instanceId: "demo-paildramon-source-3", cardId: "EX3-019" },
            { instanceId: "demo-paildramon-source-4", cardId: "EX3-020" },
            { instanceId: "demo-paildramon-source-5", cardId: "EX3-063" },
          ],
    ),
  );
  opponent.battleArea.push(
    permanent("demo-coredramon", "EX3-018", 1, 5000, [
      { instanceId: "demo-coredramon-source-1", cardId: "EX3-016" },
      { instanceId: "demo-coredramon-source-2", cardId: "EX3-002" },
    ]),
  );
  opponent.battleArea.push(permanent("demo-gabumon-empty", "BT1-029", 1, 2000));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  const mainText =
    "[Main] Trash the top 4 digivolution cards of 1 of your opponent's Digimon. Until the end of your opponent's turn, all of your opponent's Digimon with no digivolution cards can't attack.";
  const effectText = effect === "security" ? `[Security] Activate this card's [Main] effect. ${mainText}` : mainText;

  if (step === "resolved") {
    return {
      state,
      events: [
        {
          kind: "effectActivated",
          seat: 0,
          sourceCardId: "EX3-067",
          effectKey: "EX3-067/0",
          description:
            "Removed Paildramon's sources. Paildramon and Gabumon can't attack until the end of the opponent's turn.",
        },
      ],
    };
  }

  return {
    state,
    decision: {
      decisionId: "demo-sourai-source-target",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose targets",
      sourceCardId: "EX3-067",
      options: {
        candidateInstanceIds: ["demo-paildramon", "demo-coredramon"],
        visibleInstanceIds: ["demo-paildramon", "demo-coredramon", "demo-gabumon-empty"],
        min: 1,
        max: 1,
        timing: effect === "security" ? "Security" : "Main",
        effectText,
      },
    },
  };
}

function hyperInfinityCannonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = effect === "security" ? 0 : 4;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const costPaid = step === "delete";
  you.battleArea.push(
    permanent(
      "demo-machinedramon",
      "EX1-073",
      0,
      12000,
      costPaid
        ? [
            { instanceId: "demo-metalgreymon-cost", cardId: "BT1-021" },
            { instanceId: "demo-machinedramon-source", cardId: "BT1-114" },
          ]
        : [{ instanceId: "demo-machinedramon-source", cardId: "BT1-114" }],
    ),
  );
  you.battleArea.push(permanent("demo-machinedramon-alternative", "BT2-066", 0, 12000));
  if (!costPaid) you.hand.push(card("demo-metalgreymon-cost", "BT1-021", 0));
  you.hand.push(card("demo-agumon-hand", "BT1-010", 0));
  you.trash.push(card("demo-sealsdramon-cost", "EX3-049", 0));
  you.trash.push(card("demo-trial-trash", "EX3-069", 0));
  you.handCount = you.hand.length;

  const afterDeDigivolve = step !== null;
  opponent.battleArea.push(
    permanent(
      "demo-stacked-wargreymon",
      "BT1-025",
      1,
      11000,
      afterDeDigivolve
        ? [{ instanceId: "demo-stacked-bottom", cardId: "BT1-024" }]
        : [
            { instanceId: "demo-stacked-bottom", cardId: "BT1-024" },
            { instanceId: "demo-stacked-source-2", cardId: "BT1-021" },
            { instanceId: "demo-stacked-source-3", cardId: "BT1-020" },
            { instanceId: "demo-stacked-source-4", cardId: "BT1-015" },
          ],
    ),
  );
  opponent.battleArea.push(permanent("demo-weak", "BT1-028", 1, 3000));
  opponent.battleArea.push(permanent("demo-boundary", "BT1-030", 1, 6000));
  opponent.battleArea.push(permanent("demo-large", "BT1-029", 1, 7000));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  const mainText =
    "[Main] ＜De-Digivolve 3＞ 1 of your opponent's Digimon. Then, by placing 1 card with [Cyborg] in its traits from your hand or trash under 1 of your level 6 Digimon with [Machine] in its traits as its bottom digivolution card, delete 1 of your opponent's Digimon with 6000 DP or less.";
  const effectText = effect === "security" ? `[Security] Activate this card's [Main] effect. ${mainText}` : mainText;
  const timing = effect === "security" ? "Security" : "Main";

  if (step === "optional") {
    return {
      state,
      decision: {
        decisionId: "demo-hyper-infinity-optional",
        seat: 0,
        kind: "optional",
        promptText: "Place a Cyborg card to delete a 6000 DP or lower Digimon?",
        sourceCardId: "EX3-066",
        options: { timing, effectText },
      },
    };
  }

  if (step === "cyborg") {
    return {
      state,
      decision: {
        decisionId: "demo-hyper-infinity-cyborg",
        seat: 0,
        kind: "selectCards",
        promptText: "Select cards",
        sourceCardId: "EX3-066",
        options: {
          candidateInstanceIds: ["demo-metalgreymon-cost", "demo-sealsdramon-cost"],
          visibleInstanceIds: [
            "demo-metalgreymon-cost",
            "demo-agumon-hand",
            "demo-sealsdramon-cost",
            "demo-trial-trash",
          ],
          min: 1,
          max: 1,
          timing,
          effectText,
        },
      },
    };
  }

  if (step === "host") {
    return {
      state,
      decision: {
        decisionId: "demo-hyper-infinity-host",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Choose targets",
        sourceCardId: "EX3-066",
        options: {
          candidateInstanceIds: ["demo-machinedramon", "demo-machinedramon-alternative"],
          visibleInstanceIds: ["demo-machinedramon", "demo-machinedramon-alternative"],
          min: 1,
          max: 1,
          timing,
          effectText,
        },
      },
    };
  }

  const opponentIds = ["demo-stacked-wargreymon", "demo-weak", "demo-boundary", "demo-large"];
  return {
    state,
    decision: {
      decisionId: step === "delete" ? "demo-hyper-infinity-delete" : "demo-hyper-infinity-de-digivolve",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose targets",
      sourceCardId: "EX3-066",
      options: {
        candidateInstanceIds: step === "delete" ? ["demo-weak", "demo-boundary"] : opponentIds,
        visibleInstanceIds: opponentIds,
        min: 1,
        max: 1,
        timing,
        effectText,
      },
    },
  };
}

function hinaKuriharaDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const dragonWatcherText =
    "[Your Turn] When one of your Digimon digivolves into a Digimon with [Rock Dragon], " +
    "[Earth Dragon], [Machine Dragon], or [Sky Dragon] in its traits, by suspending this Tamer, " +
    "activate 1 of that Digimon's [On Play] effects.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = step === "start-turn" ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const hina = permanent("demo-hina", "EX3-065", 0, 0);
  if (step === "resolved") hina.isSuspended = true;
  you.battleArea.push(hina);
  opponent.handCount = 5;

  if (effect !== "security") {
    you.battleArea.push(
      permanent("demo-volcanicdramon", "BT2-018", 0, 12000, [
        { instanceId: "demo-monochromon-source", cardId: "BT2-014" },
      ]),
    );
    if (step !== "resolved") opponent.battleArea.push(permanent("demo-elecmon", "BT1-028", 1, 3000));
  }
  state.players.push(you, opponent);

  if (effect === "security") {
    return {
      state,
      events: [{ kind: "cardsMoved", instanceIds: ["demo-hina-top"], from: "security", to: "battleArea" }],
    };
  }

  if (step === "start-turn") {
    opponent.battleArea.push(permanent("demo-gabumon", "BT1-029", 1, 2000));
    return {
      state,
      events: [{ kind: "memoryChanged", from: 0, to: 1, reason: "Hina Kurihara: opponent has a Digimon in play" }],
    };
  }

  if (step === "resolved") {
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "EX3-065",
          effectKey: "EX3-065/digivolve-dragon-trait-reactivate-onplay",
          description: "Suspended Hina Kurihara and activated Volcanicdramon's On Play effect.",
          timing: "OnEnterFieldAnyone",
        },
      ],
    };
  }

  return {
    state,
    decision: {
      decisionId: "demo-hina-dragon-on-play",
      seat: 0,
      kind: "optional",
      promptText: "Activate Hina Kurihara's effect?",
      sourceCardId: "EX3-065",
      options: {
        timing: "OnEnterFieldAnyone",
        effectText: dragonWatcherText,
      },
    },
  };
}

function megidramonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const megidramon = permanent("demo-megidramon", "EX3-064", 0, 12000);
  const onDeletionText =
    "[On Deletion] If you don't have Trial of the Four Great Dragons in play, you may place 1 Trial of the Four Great Dragons from your hand in your battle area.";

  if (step === "optional" || step === "trial" || step === "resolved") {
    you.trash.push(megidramon.topCard!);
    if (step === "resolved") you.battleArea.push(permanent("demo-trial", "EX3-069", 0, 0));
    else you.hand.push(card("demo-trial-hand", "EX3-069", 0), card("demo-agumon-hand", "BT1-010", 0));
    you.handCount = you.hand.length;
    state.players.push(you, opponent);
    if (step === "resolved") {
      return {
        state,
        events: [{ kind: "cardsMoved", instanceIds: ["demo-trial-hand"], from: "hand", to: "battleArea" }],
      };
    }
    return {
      state,
      decision:
        step === "optional"
          ? {
              decisionId: "demo-megidramon-place-trial-optional",
              seat: 0,
              kind: "optional",
              promptText: "Place Trial of the Four Great Dragons in your battle area?",
              sourceCardId: "EX3-064",
              options: { timing: "OnDeletion", effectText: onDeletionText },
            }
          : {
              decisionId: "demo-megidramon-select-trial",
              seat: 0,
              kind: "selectCards",
              promptText: "Choose Trial of the Four Great Dragons",
              sourceCardId: "EX3-064",
              options: {
                candidateInstanceIds: ["demo-trial-hand"],
                visibleInstanceIds: ["demo-trial-hand", "demo-agumon-hand"],
                min: 1,
                max: 1,
                timing: "OnDeletion",
                effectText: onDeletionText,
              },
            },
    };
  }

  you.battleArea.push(megidramon);
  opponent.battleArea.push(permanent("demo-level-5", "BT1-020", 1, 7000));
  opponent.battleArea.push(permanent("demo-level-6", "BT1-025", 1, 10000));
  opponent.battleArea.push(permanent("demo-level-7", "AD1-025", 1, 14000));
  state.players.push(you, opponent);
  return {
    state,
    decision: {
      decisionId: "demo-megidramon-on-play",
      seat: 0,
      kind: "chooseTargets",
      promptText:
        effect === "trial"
          ? "Choose a level 6 or lower Digimon to delete"
          : "Choose a level 5 or lower Digimon to delete",
      sourceCardId: "EX3-064",
      options: {
        candidateInstanceIds: effect === "trial" ? ["demo-level-5", "demo-level-6"] : ["demo-level-5"],
        visibleInstanceIds: ["demo-level-5", "demo-level-6", "demo-level-7"],
        min: 1,
        max: 1,
        timing: "OnPlay",
        effectText:
          "[On Play] Delete 1 of your opponent's level 5 or lower Digimon. If this card was played by Trial of the Four Great Dragons' effect, delete 1 of your opponent's level 6 or lower Digimon instead.",
      },
    },
  };
}

function imperialdramonDragonModeDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 5;
  const you = player(
    0,
    "Dragon Mode player",
    effect === "dna" || effect === null ? "dragon-mode-player" : "card-effects-viewer",
  );
  const opponent = player(
    1,
    "Effect tester",
    effect === "dna" || effect === null ? "card-effects-viewer" : "dragon-mode-opponent",
  );
  const dragonMode = permanent("demo-dragon-mode", "EX3-063", 0, 12000, [
    { instanceId: "demo-paildramon-source", cardId: "EX3-010" },
    { instanceId: "demo-dinobeemon-source", cardId: "EX3-061" },
  ]);
  you.battleArea.push(dragonMode);

  if (effect === "dna" || effect === null) {
    opponent.battleArea.push(permanent("demo-groundramon", "BT1-020", 1, 7000));
    opponent.battleArea.push(permanent("demo-wargreymon", "BT1-025", 1, 10000));
    opponent.battleArea.push(permanent("demo-omnimon", "AD1-025", 1, 14000));
    state.players.push(you, opponent);
    return {
      state,
      sessionId: "card-effects-viewer",
      decision: {
        decisionId: "demo-dragon-mode-dna-survivor",
        seat: 1,
        kind: "chooseTargets",
        promptText: "Choose 1 of your Digimon to keep",
        sourceCardId: "EX3-063",
        options: {
          candidateInstanceIds: ["demo-groundramon", "demo-wargreymon", "demo-omnimon"],
          min: 1,
          max: 1,
          timing: "WhenDigivolving",
          effectText:
            "[When Digivolving] If DNA digivolving, your opponent chooses 1 of their Digimon. Delete all of their other Digimon. Then, Blitz.",
        },
      },
    };
  }

  you.hand.push(
    card("demo-fighter-mode", "EX3-073", 0),
    card("demo-other-fighter-mode", "EX3-073", 0),
    card("demo-other-dragon-mode", "BT3-031", 0),
  );
  you.handCount = you.hand.length;
  opponent.securityCount = 4;
  state.players.push(you, opponent);
  const effectText =
    "[When Attacking] [Once Per Turn] This Digimon gets +2000 DP for the turn. Then, this Digimon may digivolve into Imperialdramon: Fighter Mode in your hand for the digivolution cost.";
  if (step === "fighter") {
    dragonMode.currentDP = 14000;
    return {
      state,
      decision: {
        decisionId: "demo-dragon-mode-select-fighter",
        seat: 0,
        kind: "selectCards",
        promptText: "Choose an Imperialdramon: Fighter Mode",
        sourceCardId: "EX3-063",
        options: {
          candidateInstanceIds: ["demo-fighter-mode", "demo-other-fighter-mode"],
          visibleInstanceIds: ["demo-fighter-mode", "demo-other-fighter-mode", "demo-other-dragon-mode"],
          min: 1,
          max: 1,
          timing: "WhenAttacking",
          effectText,
        },
      },
    };
  }
  return {
    state,
    decision: {
      decisionId: "demo-dragon-mode-attack-optional",
      seat: 0,
      kind: "optional",
      promptText: "Digivolve into Imperialdramon: Fighter Mode?",
      sourceCardId: "EX3-063",
      options: { timing: "WhenAttacking", effectText },
    },
  };
}

function warGrowlmonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 3;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "wargrowlmon-opponent");
  you.deckCount = 32;
  opponent.deckCount = 33;
  you.battleArea.push(
    permanent("demo-wargrowlmon", "EX3-062", 0, 8000, [{ instanceId: "demo-growlmon-source", cardId: "EX3-057" }]),
  );
  you.hand.push(card("demo-takato-hand", "EX2-056", 0), card("demo-guilmon-x-hand", "BT9-009", 0));
  you.trash.push(
    card("demo-guilmon-trash", "EX3-056", 0),
    card("demo-cyborg-trash", "BT1-021", 0),
    card("demo-own-mill-three", "BT1-002", 0),
    card("demo-own-old-trash-one", "BT1-004", 0),
    card("demo-own-old-trash-two", "BT1-005", 0),
  );
  opponent.trash.push(
    card("demo-opponent-mill-one", "BT1-006", 1),
    card("demo-opponent-mill-two", "BT1-007", 1),
    card("demo-opponent-mill-three", "BT1-008", 1),
  );
  if (effect === "opponent-threshold") {
    you.trash.splice(3, 2);
    opponent.trash.push(
      card("demo-opponent-old-trash-one", "BT1-009", 1),
      card("demo-opponent-old-trash-two", "BT1-010", 1),
    );
  }
  you.handCount = you.hand.length;
  state.players.push(you, opponent);
  const effectText =
    "[When Digivolving] Trash the top 3 cards of both players' decks. Then, if either player has 5 or more cards in their trash, you may play 1 Guilmon or Takato Matsuki from your hand or trash without paying the cost.";
  const events: ServerEvent[] = [
    {
      kind: "cardsMoved",
      instanceIds: [
        "demo-guilmon-trash",
        "demo-cyborg-trash",
        "demo-own-mill-three",
        "demo-opponent-mill-one",
        "demo-opponent-mill-two",
        "demo-opponent-mill-three",
      ],
      from: "deck",
      to: "trash",
    },
  ];
  if (step === "choice") {
    return {
      state,
      events,
      decision: {
        decisionId: "demo-wargrowlmon-play-choice",
        seat: 0,
        kind: "selectCards",
        promptText: "Choose Guilmon or Takato Matsuki to play",
        sourceCardId: "EX3-062",
        options: {
          candidateInstanceIds: ["demo-takato-hand", "demo-guilmon-trash"],
          visibleInstanceIds: [
            "demo-takato-hand",
            "demo-guilmon-x-hand",
            ...you.trash.map(({ instanceId }) => instanceId),
          ],
          min: 1,
          max: 1,
          timing: "WhenDigivolving",
          effectText,
        },
      },
    };
  }
  return {
    state,
    events,
    decision: {
      decisionId: "demo-wargrowlmon-optional-play",
      seat: 0,
      kind: "optional",
      promptText: "Play 1 Guilmon or Takato Matsuki for free?",
      sourceCardId: "EX3-062",
      options: { timing: "WhenDigivolving", effectText },
    },
  };
}

function dinobeemonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 3;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "dinobeemon-opponent");

  if (effect === "inherited") {
    const imperialdramon = permanent("demo-imperialdramon", "EX3-063", 0, 12000, [
      { instanceId: "demo-dinobeemon-source", cardId: "EX3-061" },
    ]);
    const unsuspended = permanent("demo-unsuspended-target", "BT1-028", 1, 2000);
    imperialdramon.attackablePermanentIds.push(unsuspended.permanentId);
    you.battleArea.push(imperialdramon);
    opponent.battleArea.push(unsuspended);
    state.players.push(you, opponent);
    return { state };
  }

  const dnaText =
    "[When Digivolving] When DNA digivolving, you may play 1 Paildramon from your trash without paying the cost.";
  const deletionText = "[On Deletion] You may play 1 Wormmon from your trash without paying the cost.";
  if (effect === "deletion") {
    you.trash.push(
      card("demo-deleted-dinobeemon", "EX3-061", 0),
      card("demo-stack-wormmon", "EX3-055", 0),
      card("demo-trash-wormmon", "BT3-047", 0),
      card("demo-other-larva", "BT11-075", 0),
    );
    state.players.push(you, opponent);
    return {
      state,
      decision:
        step === "wormmon"
          ? {
              decisionId: "demo-dinobeemon-wormmon-choice",
              seat: 0,
              kind: "selectCards",
              promptText: "Choose a Wormmon to play",
              sourceCardId: "EX3-061",
              options: {
                candidateInstanceIds: ["demo-stack-wormmon", "demo-trash-wormmon"],
                visibleInstanceIds: you.trash.map(({ instanceId }) => instanceId),
                min: 1,
                max: 1,
                timing: "OnDeletion",
                effectText: deletionText,
              },
            }
          : {
              decisionId: "demo-dinobeemon-wormmon-optional",
              seat: 0,
              kind: "optional",
              promptText: "Play 1 Wormmon from your trash for free?",
              sourceCardId: "EX3-061",
              options: { timing: "OnDeletion", effectText: deletionText },
            },
    };
  }

  you.battleArea.push(
    permanent("demo-dinobeemon", "EX3-061", 0, 8000, [
      { instanceId: "demo-shadramon-source", cardId: "EX3-058" },
      { instanceId: "demo-flamedramon-source", cardId: "EX3-008" },
    ]),
  );
  you.trash.push(
    card("demo-paildramon", "EX3-010", 0),
    card("demo-other-paildramon", "ST9-05", 0),
    card("demo-other-dinobeemon", "BT3-055", 0),
  );
  state.players.push(you, opponent);
  return {
    state,
    decision:
      step === "paildramon"
        ? {
            decisionId: "demo-dinobeemon-paildramon-choice",
            seat: 0,
            kind: "selectCards",
            promptText: "Choose a Paildramon to play",
            sourceCardId: "EX3-061",
            options: {
              candidateInstanceIds: ["demo-paildramon", "demo-other-paildramon"],
              visibleInstanceIds: you.trash.map(({ instanceId }) => instanceId),
              min: 1,
              max: 1,
              timing: "WhenDigivolving",
              effectText: dnaText,
            },
          }
        : {
            decisionId: "demo-dinobeemon-paildramon-optional",
            seat: 0,
            kind: "optional",
            promptText: "Play 1 Paildramon from your trash for free?",
            sourceCardId: "EX3-061",
            options: { timing: "WhenDigivolving", effectText: dnaText },
          },
  };
}

function exTyrannomonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.memory = 3;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "extyrannomon-opponent");
  const exTyrannomon = permanent(
    "demo-extyrannomon",
    "EX3-060",
    0,
    9000,
    effect === "no-sources" ? [] : [{ instanceId: "demo-darktyrannomon-source", cardId: "EX3-059" }],
  );
  exTyrannomon.keywords.push("Blocker");
  you.battleArea.push(exTyrannomon);

  if (effect === "no-sources") {
    state.turnSeat = 0;
    state.players.push(you, opponent);
    return { state };
  }

  state.turnSeat = 1;
  const attacker = permanent("demo-attacking-elecmon", "BT1-028", 1, 2000);
  attacker.isSuspended = true;
  opponent.battleArea.push(attacker);
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "blockWindowOpened",
        attackerPermanentId: attacker.permanentId,
        eligibleBlockerIds: [exTyrannomon.permanentId],
      },
    ],
  };
}

function darkTyrannomonDemo(): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 3;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "darktyrannomon-opponent");
  you.trash.push(card("demo-deleted-mastertyrannomon", "BT8-016", 0), card("demo-darktyrannomon-source", "EX3-059", 0));
  const elecmon = permanent("demo-ready-elecmon", "BT1-028", 1, 2000);
  const gabumon = permanent("demo-suspended-gabumon", "BT1-029", 1, 2000);
  gabumon.isSuspended = true;
  const agumon = permanent("demo-ready-agumon", "BT1-010", 1, 2000);
  opponent.battleArea.push(elecmon, gabumon, agumon);
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "cardsMoved",
        instanceIds: ["demo-deleted-mastertyrannomon", "demo-darktyrannomon-source"],
        from: "battleArea",
        to: "trash",
      },
    ],
    decision: {
      decisionId: "demo-darktyrannomon-on-deletion",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose an opposing Digimon to suspend",
      sourceCardId: "EX3-059",
      options: {
        candidateInstanceIds: [elecmon.permanentId, agumon.permanentId],
        visibleInstanceIds: [elecmon.permanentId, gabumon.permanentId, agumon.permanentId],
        min: 1,
        max: 1,
        timing: "OnDeletion",
        effectText: "[On Deletion] Suspend 1 of your opponent's Digimon.",
      },
    },
  };
}

function flamedramonDemo(step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 4;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "flamedramon-opponent");
  const flamedramon = permanent("demo-flamedramon", "EX3-008", 0, 5000);
  const shadramonOne = permanent("demo-shadramon-one", "EX3-058", 0, 5000);
  const shadramonTwo = permanent("demo-shadramon-two", "EX3-058", 0, 5000, [
    { instanceId: "demo-shadramon-source", cardId: "EX3-055" },
  ]);
  const incompatible = permanent("demo-flamedramon-incompatible", "EX3-008", 0, 5000);
  you.battleArea.push(flamedramon, shadramonOne, shadramonTwo, incompatible);
  you.hand.push(
    card("demo-paildramon-one", "EX3-010", 0),
    card("demo-paildramon-two", "EX3-010", 0),
    card("demo-breakdramon-normal", "EX3-044", 0),
  );
  you.handCount = you.hand.length;
  state.players.push(you, opponent);
  const effectText =
    "[When Digivolving] You may DNA digivolve this Digimon and one of your other Digimon into a Digimon card in your hand for the cost.";

  return {
    state,
    decision:
      step === "result"
        ? {
            decisionId: "demo-flamedramon-dna-result",
            seat: 0,
            kind: "selectCards",
            promptText: "Choose a Digimon with a compatible DNA requirement",
            sourceCardId: "EX3-008",
            options: {
              candidateInstanceIds: ["demo-paildramon-one", "demo-paildramon-two"],
              visibleInstanceIds: you.hand.map(({ instanceId }) => instanceId),
              min: 1,
              max: 1,
              timing: "WhenDigivolving",
              effectText,
            },
          }
        : {
            decisionId: "demo-flamedramon-dna-partner",
            seat: 0,
            kind: "chooseTargets",
            promptText: "Choose another Digimon that completes a DNA requirement",
            sourceCardId: "EX3-008",
            options: {
              candidateInstanceIds: [shadramonOne.permanentId, shadramonTwo.permanentId],
              visibleInstanceIds: [shadramonOne.permanentId, shadramonTwo.permanentId, incompatible.permanentId],
              min: 1,
              max: 1,
              timing: "WhenDigivolving",
              effectText,
            },
          },
  };
}

function shadramonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = effect === "inherited" ? -1 : 4;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "shadramon-opponent");
  const shadramon = permanent("demo-shadramon", "EX3-058", 0, 5000, [
    { instanceId: "demo-guilmon-source", cardId: "EX3-056" },
  ]);
  const wormmon = permanent("demo-wormmon-partner", "EX3-055", 0, 2000);
  const agumon = permanent("demo-agumon-partner", "BT1-010", 0, 2000);
  you.battleArea.push(shadramon, wormmon, agumon);
  const effectText =
    "[When Digivolving] Activate 1 of the effects below. ・You may digivolve 1 of your other Digimon into a level 4 red Digimon card with the [Free] trait from your trash for the cost. ・You may DNA digivolve this Digimon and one of your other Digimon into a Digimon card in your hand for the cost.";

  if (effect === "inherited") {
    const inheritedHost = permanent("demo-inherited-host", "EX3-061", 0, 8000, [
      { instanceId: "demo-inherited-shadramon", cardId: "EX3-058" },
    ]);
    you.battleArea.splice(0, you.battleArea.length, inheritedHost, permanent("demo-red-partner", "EX3-008", 0, 5000));
    you.hand.push(card("demo-dragon-mode-hand", "EX3-063", 0));
    you.handCount = 1;
    state.players.push(you, opponent);
    return {
      state,
      decision: {
        decisionId: "demo-shadramon-inherited-dna",
        seat: 0,
        kind: "optional",
        promptText: "DNA digivolve at the end of your turn?",
        sourceCardId: "EX3-058",
        options: {
          timing: "EndOfYourTurn",
          effectText:
            "[End of Your Turn] This Digimon and one of your other Digimon may DNA digivolve into a Digimon card in your hand for the cost.",
        },
      },
    };
  }

  if (effect === "trash") {
    you.trash.push(
      card("demo-flamedramon-trash", "EX3-008", 0),
      card("demo-darktyrannomon-trash", "EX3-059", 0),
      card("demo-guilmon-trash", "EX3-056", 0),
    );
    state.players.push(you, opponent);
    if (step === "base") {
      return {
        state,
        decision: {
          decisionId: "demo-shadramon-trash-base",
          seat: 0,
          kind: "chooseTargets",
          promptText: "Choose another Digimon to digivolve",
          sourceCardId: "EX3-058",
          options: {
            candidateInstanceIds: [wormmon.permanentId, agumon.permanentId],
            visibleInstanceIds: [shadramon.permanentId, wormmon.permanentId, agumon.permanentId],
            min: 1,
            max: 1,
            timing: "WhenDigivolving",
            effectText,
          },
        },
      };
    }
    if (step === "card") {
      return {
        state,
        decision: {
          decisionId: "demo-shadramon-trash-card",
          seat: 0,
          kind: "selectCards",
          promptText: "Choose a red level 4 Free Digimon from your trash",
          sourceCardId: "EX3-058",
          options: {
            candidateInstanceIds: ["demo-flamedramon-trash"],
            visibleInstanceIds: you.trash.map(({ instanceId }) => instanceId),
            min: 1,
            max: 1,
            timing: "WhenDigivolving",
            effectText,
          },
        },
      };
    }
    return {
      state,
      decision: {
        decisionId: "demo-shadramon-trash-optional",
        seat: 0,
        kind: "optional",
        promptText: "Digivolve another Digimon from your trash?",
        sourceCardId: "EX3-058",
        options: { timing: "WhenDigivolving", effectText },
      },
    };
  }

  if (effect === "dna") {
    you.hand.push(card("demo-dinobeemon-hand", "EX3-061", 0), card("demo-dragon-mode-hand", "EX3-063", 0));
    you.handCount = 2;
    state.players.push(you, opponent);
    return {
      state,
      decision:
        step === "result"
          ? {
              decisionId: "demo-shadramon-dna-result",
              seat: 0,
              kind: "selectCards",
              promptText: "Choose a compatible DNA Digimon from your hand",
              sourceCardId: "EX3-058",
              options: {
                candidateInstanceIds: ["demo-dinobeemon-hand"],
                visibleInstanceIds: you.hand.map(({ instanceId }) => instanceId),
                min: 1,
                max: 1,
                timing: "WhenDigivolving",
                effectText,
              },
            }
          : {
              decisionId: "demo-shadramon-dna-optional",
              seat: 0,
              kind: "optional",
              promptText: "DNA digivolve Shadramon with another Digimon?",
              sourceCardId: "EX3-058",
              options: { timing: "WhenDigivolving", effectText },
            },
    };
  }

  state.players.push(you, opponent);
  return {
    state,
    decision: {
      decisionId: "demo-shadramon-modal",
      seat: 0,
      kind: "chooseOption",
      promptText: "Choose one effect to activate",
      sourceCardId: "EX3-058",
      options: {
        choices: ["Digivolve", "DNA digivolve"],
        timing: "WhenDigivolving",
        effectText,
      },
    },
  };
}

function growlmonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 2;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "growlmon-opponent");
  const growlmon = permanent("demo-growlmon", "EX3-057", 0, 5000, [
    { instanceId: "demo-guilmon-source", cardId: "EX3-056" },
  ]);
  const elecmon = permanent("demo-elecmon", "BT1-028", 1, 2000);
  const guilmon = permanent("demo-guilmon", "EX3-056", 1, 3000);
  const tooLarge = permanent("demo-too-large", "EX3-058", 1, 5000);
  you.battleArea.push(growlmon);
  opponent.battleArea.push(elecmon, guilmon, tooLarge);

  const whenDigivolvingText =
    "[When Digivolving] Delete 1 of your opponent's Digimon with 3000 DP or less. If no Digimon was deleted by this effect, trash the top 2 cards of both players' decks.";
  if (effect === "mill") {
    you.deckCount = 34;
    opponent.deckCount = 34;
    you.trash.push(card("demo-own-milled-one", "BT1-010", 0), card("demo-own-milled-two", "BT1-020", 0));
    opponent.trash.push(card("demo-opponent-milled-one", "BT1-028", 1), card("demo-opponent-milled-two", "BT1-029", 1));
    opponent.battleArea.splice(0, 2);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        { kind: "cardsMoved", instanceIds: ["demo-own-milled-one", "demo-own-milled-two"], from: "deck", to: "trash" },
        {
          kind: "cardsMoved",
          instanceIds: ["demo-opponent-milled-one", "demo-opponent-milled-two"],
          from: "deck",
          to: "trash",
        },
      ],
    };
  }

  if (effect === "inherited") {
    const host = permanent("demo-virus-host", "BT1-020", 0, 6000, [
      { instanceId: "demo-growlmon-source", cardId: "EX3-057" },
    ]);
    const guilmonCost = permanent("demo-guilmon-cost", "EX3-056", 0, 2000);
    const agumonCost = permanent("demo-agumon-cost", "BT1-010", 0, 2000);
    you.battleArea.splice(0, you.battleArea.length);
    you.battleArea.push(host, guilmonCost, agumonCost);
    opponent.battleArea.splice(0, opponent.battleArea.length);
    state.players.push(you, opponent);
    const inheritedText =
      "[When Attacking] [Once Per Turn] By deleting 1 of your other Digimon, this Digimon gains Security Attack +1 for the turn.";
    return {
      state,
      decision:
        step === "cost"
          ? {
              decisionId: "demo-growlmon-inherited-cost",
              seat: 0,
              kind: "chooseTargets",
              promptText: "Choose another Digimon to delete",
              sourceCardId: "EX3-057",
              options: {
                candidateInstanceIds: [guilmonCost.permanentId, agumonCost.permanentId],
                visibleInstanceIds: [host.permanentId, guilmonCost.permanentId, agumonCost.permanentId],
                min: 1,
                max: 1,
                timing: "WhenAttacking",
                effectText: inheritedText,
              },
            }
          : {
              decisionId: "demo-growlmon-inherited-optional",
              seat: 0,
              kind: "optional",
              promptText: "Delete another Digimon to gain Security Attack +1?",
              sourceCardId: "EX3-057",
              options: { timing: "WhenAttacking", effectText: inheritedText },
            },
    };
  }

  state.players.push(you, opponent);
  return {
    state,
    decision: {
      decisionId: "demo-growlmon-delete",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose an opposing Digimon with 3000 DP or less to delete",
      sourceCardId: "EX3-057",
      options: {
        candidateInstanceIds: [elecmon.permanentId, guilmon.permanentId],
        visibleInstanceIds: [elecmon.permanentId, guilmon.permanentId, tooLarge.permanentId],
        min: 1,
        max: 1,
        timing: "WhenDigivolving",
        effectText: whenDigivolvingText,
      },
    },
  };
}

function guilmonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 2;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "guilmon-opponent");
  const elecmon = permanent("demo-guilmon-elecmon", "BT1-028", 1, 2000);
  const boundary = permanent("demo-guilmon-boundary", "EX3-056", 1, 3000);
  const tooLarge = permanent("demo-guilmon-too-large", "EX3-058", 1, 5000);
  you.trash.push(card("demo-deleted-guilmon", "EX3-056", 0));
  opponent.battleArea.push(elecmon, boundary, tooLarge);

  const effectText =
    "[On Deletion] Delete 1 of your opponent's Digimon with 3000 DP or less. If no Digimon is deleted by this effect, trash the top 2 cards of both players' decks.";
  if (effect === "mill" || effect === "evade") {
    you.deckCount = 34;
    opponent.deckCount = 34;
    you.trash.push(card("demo-guilmon-own-mill-one", "BT1-010", 0), card("demo-guilmon-own-mill-two", "BT1-020", 0));
    opponent.trash.push(
      card("demo-guilmon-opponent-mill-one", "BT1-028", 1),
      card("demo-guilmon-opponent-mill-two", "BT1-029", 1),
    );
    opponent.battleArea.splice(0, opponent.battleArea.length);
    if (effect === "evade") {
      const survivor = permanent("demo-guilmon-evade-survivor", "BT14-021", 1, 3000);
      survivor.isSuspended = true;
      opponent.battleArea.push(survivor);
    } else {
      opponent.battleArea.push(tooLarge);
    }
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "cardsMoved",
          instanceIds: ["demo-guilmon-own-mill-one", "demo-guilmon-own-mill-two"],
          from: "deck",
          to: "trash",
        },
        {
          kind: "cardsMoved",
          instanceIds: ["demo-guilmon-opponent-mill-one", "demo-guilmon-opponent-mill-two"],
          from: "deck",
          to: "trash",
        },
      ],
    };
  }

  state.players.push(you, opponent);
  return {
    state,
    decision: {
      decisionId: "demo-guilmon-on-deletion",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose an opposing Digimon with 3000 DP or less to delete",
      sourceCardId: "EX3-056",
      options: {
        candidateInstanceIds: [elecmon.permanentId, boundary.permanentId],
        visibleInstanceIds: [elecmon.permanentId, boundary.permanentId, tooLarge.permanentId],
        min: 1,
        max: 1,
        timing: "OnDeletion",
        effectText,
      },
    },
  };
}

function wormmonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "wormmon-opponent");
  const effectText =
    "[On Play] Reveal the top 3 cards of your deck. Add 1 purple or red card with the [Free] trait or 1 card with [Imperialdramon] in its name among them to your hand, and trash 1 such card among them. Place the rest at the bottom of your deck in any order.";

  if (effect === "inherited") {
    const host = permanent("demo-wormmon-host", "EX3-061", 0, 8000, [
      { instanceId: "demo-wormmon-source", cardId: "EX3-055" },
    ]);
    host.grantedKeywords.push("Retaliation");
    you.battleArea.push(host);
    opponent.battleArea.push(permanent("demo-wormmon-battle-target", "EX3-060", 1, 9000));
    state.players.push(you, opponent);
    return { state };
  }

  const visibleCards = [
    { instanceId: "demo-wormmon-dinobeemon", cardId: "EX3-061" },
    { instanceId: "demo-wormmon-imperialdramon", cardId: "EX3-063" },
    { instanceId: "demo-wormmon-agumon", cardId: "BT1-010" },
  ];
  if (step === "order") {
    const orderCards = [
      { instanceId: "demo-wormmon-blue-free", cardId: "BT1-027" },
      { instanceId: "demo-wormmon-blue-imperialdramon", cardId: "BT3-031" },
      { instanceId: "demo-wormmon-red-ineligible", cardId: "BT1-010" },
    ];
    state.players.push(you, opponent);
    return {
      state,
      decision: {
        decisionId: "demo-wormmon-order",
        seat: 0,
        kind: "orderCards",
        promptText: "Choose the order for the remaining cards",
        sourceCardId: "EX3-055",
        options: {
          candidateInstanceIds: orderCards.map(({ instanceId }) => instanceId),
          visibleInstanceIds: orderCards.map(({ instanceId }) => instanceId),
          visibleCards: orderCards,
          min: 3,
          max: 3,
          orderDestination: "deckBottom",
          timing: "OnPlay",
          effectText,
        },
      },
    };
  }

  if (step === "trash") you.hand.push(card("demo-wormmon-dinobeemon", "EX3-061", 0));
  state.players.push(you, opponent);
  return {
    state,
    decision: {
      decisionId: step === "trash" ? "demo-wormmon-trash" : "demo-wormmon-hand",
      seat: 0,
      kind: "selectCards",
      promptText:
        step === "trash"
          ? "Choose 1 other eligible revealed card to trash"
          : "Choose 1 revealed purple or red Free or Imperialdramon card for your hand",
      sourceCardId: "EX3-055",
      options: {
        candidateInstanceIds:
          step === "trash"
            ? ["demo-wormmon-imperialdramon"]
            : ["demo-wormmon-dinobeemon", "demo-wormmon-imperialdramon"],
        visibleInstanceIds: visibleCards.map(({ instanceId }) => instanceId),
        visibleCards,
        min: 1,
        max: 1,
        timing: "OnPlay",
        effectText,
      },
    },
  };
}

function tankdramonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 3;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "tankdramon-opponent");

  if (effect === "inherited") {
    const host = permanent("demo-tankdramon-host", "EX3-054", 0, 12000, [
      { instanceId: "demo-tankdramon-source", cardId: "EX3-051" },
    ]);
    const attacker = permanent("demo-tankdramon-attacker", "EX3-049", 0, 4000);
    attacker.isSuspended = true;
    you.battleArea.push(host, attacker);
    const revealed = [
      { instanceId: "demo-tankdramon-commandramon", cardId: "BT4-063" },
      { instanceId: "demo-tankdramon-inherited-filler", cardId: "BT1-010" },
    ];
    if (step === "declined") {
      you.trash.push(...revealed.map(({ instanceId, cardId }) => card(instanceId, cardId, 0)));
      state.players.push(you, opponent);
      return {
        state,
        events: [
          {
            kind: "cardsMoved",
            instanceIds: revealed.map(({ instanceId }) => instanceId),
            from: "deck",
            to: "trash",
          },
        ],
      };
    }
    state.players.push(you, opponent);
    return {
      state,
      decision: {
        decisionId: "demo-tankdramon-inherited-reveal",
        seat: 0,
        kind: "selectCards",
        promptText: "Você pode jogar 1 Commandramon revelado sem pagar o custo",
        sourceCardId: "EX3-051",
        options: {
          candidateInstanceIds: [revealed[0]!.instanceId],
          visibleInstanceIds: revealed.map(({ instanceId }) => instanceId),
          visibleCards: revealed,
          min: 0,
          max: 1,
          timing: "YourTurn",
          effectText:
            "[Your Turn] [Once Per Turn] When one of your Digimon with [D-Brigade] in its traits attacks, reveal the top 2 cards of your deck. You may play 1 [Commandramon] among them without paying the cost. Trash the rest.",
        },
      },
    };
  }

  you.battleArea.push(
    permanent("demo-tankdramon", "EX3-051", 0, 7000, [{ instanceId: "demo-tankdramon-base", cardId: "EX3-049" }]),
  );
  const revealed = [
    { instanceId: "demo-tankdramon-sealsdramon", cardId: "EX3-049" },
    { instanceId: "demo-tankdramon-too-expensive", cardId: "EX3-051" },
    { instanceId: "demo-tankdramon-hina", cardId: "EX3-065" },
  ];
  state.players.push(you, opponent);
  return {
    state,
    decision: {
      decisionId: "demo-tankdramon-when-digivolving",
      seat: 0,
      kind: "selectCards",
      promptText: "Você pode jogar 1 Digimon D-Brigade com custo de jogo 5 ou menos",
      sourceCardId: "EX3-051",
      options: {
        candidateInstanceIds: [revealed[0]!.instanceId],
        visibleInstanceIds: revealed.map(({ instanceId }) => instanceId),
        visibleCards: revealed,
        min: 0,
        max: 1,
        timing: "WhenDigivolving",
        effectText:
          "[When Digivolving] Reveal the top 3 cards of your deck. You may play 1 Digimon card with [D-Brigade] in its traits and a play cost of 5 or less among them without paying the cost. Trash the rest.",
      },
    },
  };
}

function jazarichmonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 2;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "jazarichmon-opponent");
  const effectText =
    "[On Play] De-Digivolve 1 1 of your opponent's Digimon. Then, you may play 1 [Hina Kurihara] from your hand without paying the cost.";

  if (effect === "inherited") {
    const host = permanent("demo-jazarichmon-host", "EX3-053", 0, 12000, [
      { instanceId: "demo-jazarichmon-source", cardId: "EX3-052" },
    ]);
    host.grantedKeywords.push("SecurityAttack");
    you.battleArea.push(host);
    opponent.securityCount = 3;
    state.players.push(you, opponent);
    return { state };
  }

  you.battleArea.push(permanent("demo-jazarichmon", "EX3-052", 0, 7000));
  const hina = card("demo-jazarichmon-hina", "EX3-065", 0);
  const firstTarget = permanent("demo-jazarichmon-first", "EX3-053", 1, 12000, [
    { instanceId: "demo-jazarichmon-first-source", cardId: "EX3-049" },
  ]);
  const secondTarget = permanent("demo-jazarichmon-second", "EX3-053", 1, 12000, [
    { instanceId: "demo-jazarichmon-second-bottom", cardId: "EX3-048" },
    { instanceId: "demo-jazarichmon-second-source", cardId: "EX3-049" },
  ]);
  const levelThree = permanent("demo-jazarichmon-level-three", "EX3-046", 1, 2000);

  if (step === "hina" || step === "resolved") {
    firstTarget.topCard = card("demo-jazarichmon-promoted", "EX3-049", 1);
    firstTarget.currentDP = 4000;
    firstTarget.baseDP = 4000;
    firstTarget.stack.length = 0;
    opponent.battleArea.push(firstTarget, secondTarget, levelThree);
    if (step === "resolved") you.battleArea.push(permanent("demo-jazarichmon-hina-played", "EX3-065", 0, 0));
    else you.hand.push(hina);
    state.players.push(you, opponent);
    return {
      state,
      ...(step === "hina"
        ? {
            decision: {
              decisionId: "demo-jazarichmon-hina-optional",
              seat: 0 as const,
              kind: "optional" as const,
              promptText: "Jogar Hina Kurihara da sua mão sem pagar o custo?",
              sourceCardId: "EX3-052",
              options: { timing: "OnPlay", effectText },
            },
          }
        : {
            events: [
              {
                kind: "cardsMoved" as const,
                instanceIds: [hina.instanceId],
                from: "hand",
                to: "battleArea",
              },
            ],
          }),
    };
  }

  you.hand.push(hina);
  opponent.battleArea.push(firstTarget, secondTarget, levelThree);
  state.players.push(you, opponent);
  return {
    state,
    decision: {
      decisionId: "demo-jazarichmon-de-digivolve",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Escolha 1 Digimon do oponente para receber De-Digivolve 1",
      sourceCardId: "EX3-052",
      options: {
        candidateInstanceIds: [firstTarget.permanentId, secondTarget.permanentId],
        visibleInstanceIds: [firstTarget.permanentId, secondTarget.permanentId, levelThree.permanentId],
        min: 1,
        max: 1,
        timing: "OnPlay",
        effectText,
      },
    },
  };
}

function metallicdramonDemo(effect: string | null): CardEffectsFixture {
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

function darkdramonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "darkdramon-opponent");
  const reductionText =
    "When you would digivolve into this card, by returning up to 5 cards with [D-Brigade] in their traits from your trash to the top of your deck, reduce the digivolution cost by 1 for each returned card.";
  const yourTurnText =
    "[Your Turn] [Once Per Turn] When you play another Digimon with [D-Brigade] in its traits, delete 1 of your opponent's Digimon with a play cost less than or equal to the Digimon you played, and unsuspend this Digimon.";

  if (effect === "your-turn" || effect === "resolved") {
    const darkdramon = permanent("demo-darkdramon", "EX3-054", 0, 12000);
    darkdramon.isSuspended = effect !== "resolved";
    you.battleArea.push(darkdramon, permanent("demo-darkdramon-played", "EX3-046", 0, 2000));
    const eligible = permanent("demo-darkdramon-eligible", "BT1-010", 1, 2000);
    const tooExpensive = permanent("demo-darkdramon-too-expensive", "EX3-049", 1, 4000);
    if (effect === "your-turn") opponent.battleArea.push(eligible);
    else opponent.trash.push(eligible.topCard!);
    opponent.battleArea.push(tooExpensive);
    state.players.push(you, opponent);
    return {
      state,
      ...(effect === "your-turn"
        ? {
            decision: {
              decisionId: "demo-darkdramon-delete",
              seat: 0 as const,
              kind: "chooseTargets" as const,
              promptText: "Choose an opposing Digimon with play cost 3 or less to delete",
              sourceCardId: "EX3-054",
              options: {
                candidateInstanceIds: [eligible.permanentId],
                visibleInstanceIds: [eligible.permanentId, tooExpensive.permanentId],
                min: 1,
                max: 1,
                timing: "YourTurn",
                effectText: yourTurnText,
              },
            },
          }
        : {
            events: [
              {
                kind: "cardsMoved" as const,
                instanceIds: [eligible.topCard!.instanceId],
                from: "battleArea",
                to: "trash",
              },
            ],
          }),
    };
  }

  const trashCards = [
    { instanceId: "demo-darkdramon-commandramon", cardId: "EX3-046" },
    { instanceId: "demo-darkdramon-sealsdramon", cardId: "EX3-049" },
    { instanceId: "demo-darkdramon-cyberdramon", cardId: "EX3-050" },
    { instanceId: "demo-darkdramon-tankdramon", cardId: "EX3-051" },
    { instanceId: "demo-darkdramon-jazarichmon", cardId: "EX3-052" },
    { instanceId: "demo-darkdramon-metallicdramon", cardId: "EX3-053" },
    { instanceId: "demo-darkdramon-agumon", cardId: "BT1-010" },
  ];
  you.battleArea.push(permanent("demo-darkdramon-evolution-base", "EX3-051", 0, 7000));
  you.hand.push(card("demo-darkdramon-hand", "EX3-054", 0));
  you.trash.push(...trashCards.map(({ instanceId, cardId }) => card(instanceId, cardId, 0)));
  state.players.push(you, opponent);

  if (step === "order") {
    const orderCards = trashCards.slice(0, 3);
    return {
      state,
      decision: {
        decisionId: "demo-darkdramon-order",
        seat: 0,
        kind: "orderCards",
        promptText: "Choose the order for the returned D-Brigade cards",
        sourceCardId: "EX3-054",
        options: {
          candidateInstanceIds: orderCards.map(({ instanceId }) => instanceId),
          visibleInstanceIds: orderCards.map(({ instanceId }) => instanceId),
          visibleCards: orderCards,
          min: 3,
          max: 3,
          orderDestination: "deckTop",
          timing: "Static",
          effectText: reductionText,
        },
      },
    };
  }

  if (step === "select") {
    return {
      state,
      decision: {
        decisionId: "demo-darkdramon-select",
        seat: 0,
        kind: "selectCards",
        promptText: "Choose 1 to 5 D-Brigade cards to return to the top of your deck",
        sourceCardId: "EX3-054",
        options: {
          candidateInstanceIds: trashCards.slice(0, 6).map(({ instanceId }) => instanceId),
          visibleInstanceIds: trashCards.map(({ instanceId }) => instanceId),
          min: 1,
          max: 5,
          timing: "Static",
          effectText: reductionText,
        },
      },
    };
  }

  return {
    state,
    decision: {
      decisionId: "demo-darkdramon-optional",
      seat: 0,
      kind: "optional",
      promptText: "Return D-Brigade cards from your trash to reduce the digivolution cost?",
      sourceCardId: "EX3-054",
      options: { timing: "Static", effectText: reductionText },
    },
  };
}

function player(seat: 0 | 1, displayName: string, sessionId: string): PlayerState {
  const result = new PlayerState();
  result.seat = seat;
  result.displayName = displayName;
  result.sessionId = sessionId;
  result.connected = true;
  result.deckCount = 36;
  result.eggDeckCount = 4;
  result.securityCount = 5;
  return result;
}

function cyberdramonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const host = permanent("demo-cyberdramon-host", "EX3-054", 0, 12000, [
    { instanceId: "demo-cyberdramon-source", cardId: "EX3-050" },
  ]);
  const hina = permanent("demo-cyberdramon-hina", "EX3-065", 0, 0);
  if (effect !== "inactive") {
    hina.isSuspended = true;
    host.currentDP = 14000;
  }
  you.battleArea.push(host, hina);
  opponent.battleArea.push(permanent("demo-cyberdramon-opponent", "EX3-053", 1, 12000));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  return { state };
}

function sealsdramonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "inherited") {
    const host = permanent("demo-sealsdramon-host", "EX3-050", 0, 7000, [
      { instanceId: "demo-sealsdramon-source", cardId: "EX3-049" },
    ]);
    const commandramon = permanent("demo-sealsdramon-commandramon", "EX3-046", 0, 2000);
    commandramon.grantedKeywords.push("Rush");
    commandramon.canAttackPlayer = true;
    you.battleArea.push(host, commandramon);
  } else {
    const sealsdramon = permanent("demo-sealsdramon", "EX3-049", 0, 4000);
    sealsdramon.grantedKeywords.push("Jamming");
    you.battleArea.push(sealsdramon);
  }
  opponent.battleArea.push(permanent("demo-sealsdramon-opponent", "EX3-044", 1, 11000));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  return { state };
}

function jazardmonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "inherited") {
    const onPlayHost = permanent("demo-jazardmon-on-play-host", "EX3-052", 0, 7000, [
      { instanceId: "demo-jazardmon-active-source", cardId: "EX3-048" },
    ]);
    onPlayHost.currentDP = 8000;
    const plainHost = permanent("demo-jazardmon-plain-host", "EX3-049", 0, 4000, [
      { instanceId: "demo-jazardmon-inactive-source", cardId: "EX3-048" },
    ]);
    you.battleArea.push(onPlayHost, plainHost);
    opponent.battleArea.push(permanent("demo-jazardmon-opponent", "EX3-044", 1, 11000));
    state.players.push(you, opponent);
    return { state };
  }

  you.battleArea.push(permanent("demo-jazardmon", "EX3-048", 0, 4000));
  const revealed = [
    { instanceId: "demo-jazardmon-dragon", cardId: "EX3-047" },
    { instanceId: "demo-jazardmon-hina", cardId: "EX3-065" },
    { instanceId: "demo-jazardmon-filler-one", cardId: "BT1-010" },
    { instanceId: "demo-jazardmon-filler-two", cardId: "BT1-011" },
  ];
  if (step === "hina" || step === "order") you.hand.push(card(revealed[0]!.instanceId, revealed[0]!.cardId, 0));
  if (step === "order") you.hand.push(card(revealed[1]!.instanceId, revealed[1]!.cardId, 0));
  state.players.push(you, opponent);
  const effectText =
    "[On Play] Reveal the top 4 cards of your deck. Add 1 Digimon card with [Rock Dragon], [Earth Dragon], [Bird Dragon], [Machine Dragon], or [Sky Dragon] in its traits and 1 [Hina Kurihara] among them to your hand. Place the rest at the bottom of your deck in any order.";

  if (step === "order") {
    return {
      state,
      decision: {
        decisionId: "demo-jazardmon-order",
        seat: 0,
        kind: "orderCards",
        promptText: "Escolha a ordem das cartas que irão para o fundo do baralho",
        sourceCardId: "EX3-048",
        options: {
          candidateInstanceIds: revealed.slice(2).map(({ instanceId }) => instanceId),
          visibleInstanceIds: revealed.slice(2).map(({ instanceId }) => instanceId),
          visibleCards: revealed.slice(2),
          min: 2,
          max: 2,
          orderDestination: "deckBottom",
          timing: "OnPlay",
          effectText,
        },
      },
    };
  }

  const choosingHina = step === "hina";
  return {
    state,
    decision: {
      decisionId: choosingHina ? "demo-jazardmon-hina" : "demo-jazardmon-dragon",
      seat: 0,
      kind: "selectCards",
      promptText: choosingHina
        ? "Escolha Hina Kurihara para adicionar à mão"
        : "Escolha 1 Digimon com uma das traits Dragon indicadas",
      sourceCardId: "EX3-048",
      options: {
        candidateInstanceIds: [revealed[choosingHina ? 1 : 0]!.instanceId],
        visibleInstanceIds: revealed.map(({ instanceId }) => instanceId),
        visibleCards: revealed,
        min: 1,
        max: 1,
        timing: "OnPlay",
        effectText,
      },
    },
  };
}

function jazamonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 1;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "inherited") {
    const onPlayHost = permanent("demo-jazamon-on-play-host", "EX3-048", 0, 4000, [
      { instanceId: "demo-jazamon-active-source", cardId: "EX3-047" },
    ]);
    onPlayHost.currentDP = 5000;
    const plainHost = permanent("demo-jazamon-plain-host", "EX3-049", 0, 4000, [
      { instanceId: "demo-jazamon-inactive-source", cardId: "EX3-047" },
    ]);
    you.battleArea.push(onPlayHost, plainHost);
    opponent.battleArea.push(permanent("demo-jazamon-opponent", "EX3-044", 1, 11000));
    state.players.push(you, opponent);
    return { state };
  }

  you.battleArea.push(permanent("demo-jazamon", "EX3-047", 0, 1000), permanent("demo-jazamon-hina", "EX3-065", 0, 0));
  opponent.handCount = 5;
  state.players.push(you, opponent);
  return {
    state,
    events: [{ kind: "memoryChanged", from: 0, to: 1, reason: "Jazamon: Hina Kurihara foi jogada" }],
  };
}

function commandramonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 1;
  state.memory = -2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const plainDecoy = permanent("demo-commandramon-plain", "EX3-046", 0, 2000);
  const stackedDecoy = permanent("demo-commandramon-stacked", "EX3-046", 0, 2000, [
    { instanceId: "demo-commandramon-source", cardId: "EX3-002" },
  ]);
  const protectedDigimon = permanent("demo-commandramon-protected", "EX3-049", 0, 4000);
  opponent.battleArea.push(permanent("demo-commandramon-opponent", "EX3-053", 1, 12000));
  opponent.handCount = 5;

  if (effect === "protected") {
    you.battleArea.push(plainDecoy, protectedDigimon);
    you.trash.push(stackedDecoy.topCard, ...stackedDecoy.stack);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "cardsMoved",
          instanceIds: [stackedDecoy.topCard.instanceId, ...stackedDecoy.stack.map(({ instanceId }) => instanceId)],
          from: "battleArea",
          to: "trash",
        },
      ],
    };
  }

  if (effect === "declined") {
    you.battleArea.push(plainDecoy, stackedDecoy);
    you.trash.push(protectedDigimon.topCard);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "cardsMoved",
          instanceIds: [protectedDigimon.topCard.instanceId],
          from: "battleArea",
          to: "trash",
        },
      ],
    };
  }

  you.battleArea.push(plainDecoy, stackedDecoy, protectedDigimon);
  state.players.push(you, opponent);
  return {
    state,
    decision: {
      decisionId: "demo-commandramon-decoy",
      seat: 0,
      kind: "selectCards",
      promptText: "＜Decoy＞: excluir este Digimon para impedir que o outro Digimon seja excluído?",
      sourceCardId: "EX3-046",
      options: {
        candidateInstanceIds: [plainDecoy.topCard.instanceId, stackedDecoy.topCard.instanceId],
        min: 0,
        max: 1,
        timing: "Static",
        effectText:
          "＜Decoy ([D-Brigade])＞ (When one of your other Digimon with [D-Brigade] in its traits would be deleted by an opponent's effect, you may delete this Digimon to prevent that deletion.)",
      },
    },
  };
}

function toropiamonDemo(effect: string | null): CardEffectsFixture {
  const whenDigivolving = "[When Digivolving] If this Digimon is suspended, suspend 1 of your opponent's Digimon.";
  const inherited =
    "[Your Turn][Once Per Turn] When an effect suspends one of your Digimon, suspend 1 of your opponent's Digimon.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const toropiamon = permanent("demo-toropiamon", "EX3-042", 0, 7000, [
    { instanceId: "demo-toropiamon-base", cardId: "BT1-072" },
  ]);
  const elecmon = permanent("demo-toropiamon-elecmon", "BT1-028", 1, 3000);
  const gabumon = permanent("demo-toropiamon-gabumon", "BT1-029", 1, 1000);
  const gomamon = permanent("demo-toropiamon-gomamon", "BT1-030", 1, 3000);
  opponent.handCount = 5;

  if (effect === "inactive") {
    you.battleArea.push(toropiamon);
    opponent.battleArea.push(elecmon);
    state.players.push(you, opponent);
    return { state };
  }

  if (effect === "evade") {
    const host = permanent("demo-toropiamon-evade-host", "EX3-041", 0, 7000, [
      { instanceId: "demo-toropiamon-inherited", cardId: "EX3-042" },
    ]);
    host.isSuspended = true;
    elecmon.isSuspended = true;
    you.battleArea.push(host);
    opponent.battleArea.push(elecmon, gabumon);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "EX3-042",
          effectKey: "EX3-042/q3416-evade",
          description: "Evade suspendeu Groundramon, então Toropiamon suspendeu Elecmon.",
          timing: "YourTurn",
        },
      ],
    };
  }

  const source =
    effect === "inherited"
      ? permanent("demo-toropiamon-host", "EX3-041", 0, 7000, [
          { instanceId: "demo-toropiamon-source", cardId: "EX3-042" },
        ])
      : toropiamon;
  const ally = permanent("demo-toropiamon-pomumon", "EX3-038", 0, 2000);
  if (effect === "inherited") ally.isSuspended = true;
  else source.isSuspended = true;
  gabumon.isSuspended = true;
  you.battleArea.push(source, ally);
  opponent.battleArea.push(elecmon, gomamon, gabumon);
  state.players.push(you, opponent);

  return {
    state,
    decision: {
      decisionId: effect === "inherited" ? "demo-toropiamon-inherited" : "demo-toropiamon-digivolving",
      seat: 0,
      kind: "chooseTargets",
      promptText:
        effect === "inherited"
          ? "Um efeito suspendeu seu Digimon. Escolha 1 Digimon ativo do oponente para suspender"
          : "Toropiamon digievoluiu suspensa. Escolha 1 Digimon ativo do oponente para suspender",
      sourceCardId: "EX3-042",
      options: {
        candidateInstanceIds: [elecmon.topCard.instanceId, gomamon.topCard.instanceId],
        visibleInstanceIds: [elecmon.topCard.instanceId, gomamon.topCard.instanceId, gabumon.topCard.instanceId],
        min: 1,
        max: 1,
        timing: effect === "inherited" ? "YourTurn" : "WhenDigivolving",
        effectText: effect === "inherited" ? inherited : whenDigivolving,
      },
    },
  };
}

function groundramonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const endTurnDna =
    "[End of Your Turn] This Digimon and 1 of your other Digimon with [Dramon] in its name may DNA digivolve into a Digimon card in your hand by paying its DNA digivolve cost.";
  const inherited = "[All Turns] While this Digimon has [Dramon] or [Examon] in its name, it gains ＜Blocker＞.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = effect === "blocker" ? 1 : 0;
  state.memory = 1;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "groundramon-opponent");
  const groundramon = permanent("demo-groundramon", "EX3-041", 0, 7000, [
    { instanceId: "demo-groundramon-coredramon", cardId: "EX3-039" },
  ]);
  groundramon.keywords.push("Blocker");
  const slayerOne = permanent("demo-slayerdramon-one", "EX3-024", 0, 12000, [
    { instanceId: "demo-slayerdramon-one-source", cardId: "EX3-018" },
  ]);
  const slayerTwo = permanent("demo-slayerdramon-two", "EX3-024", 0, 12000, [
    { instanceId: "demo-slayerdramon-two-source-a", cardId: "EX3-018" },
    { instanceId: "demo-slayerdramon-two-source-b", cardId: "EX3-019" },
  ]);
  const breakdramon = permanent("demo-groundramon-breakdramon", "EX3-044", 0, 12000);

  if (effect === "resolved") {
    const examon = permanent("demo-groundramon-examon", "EX3-074", 0, 15000, [
      groundramon.topCard,
      ...groundramon.stack,
      slayerTwo.topCard,
      ...slayerTwo.stack,
    ]);
    you.battleArea.push(examon);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "EX3-041",
          effectKey: "EX3-041/end-turn-dna",
          description: "Groundramon e Slayerdramon DNA digievoluíram em Examon.",
          timing: "EndOfYourTurn",
        },
      ],
    };
  }

  if (effect === "blocker") {
    const attacker = permanent("demo-groundramon-attacker", "BT1-028", 1, 2000);
    attacker.isSuspended = true;
    you.battleArea.push(groundramon);
    opponent.battleArea.push(attacker);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "blockWindowOpened",
          attackerPermanentId: attacker.permanentId,
          eligibleBlockerIds: [groundramon.permanentId],
        },
      ],
    };
  }

  if (effect === "inherited" || effect === "inherited-negative") {
    const hasEligibleName = effect === "inherited";
    const host = permanent(
      "demo-groundramon-inherited-host",
      hasEligibleName ? "EX3-074" : "BT1-084",
      0,
      hasEligibleName ? 15000 : 10000,
      [{ instanceId: "demo-groundramon-inherited-source", cardId: "EX3-041" }],
    );
    if (hasEligibleName) host.grantedKeywords.push("Blocker");
    you.battleArea.push(host);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "EX3-041",
          effectKey: "EX3-041/inherited-blocker",
          description: hasEligibleName
            ? "Examon tem Examon no nome e recebeu Blocker de Groundramon."
            : "Omnimon não tem Dramon nem Examon no nome; Groundramon não concedeu Blocker.",
          timing: "AllTurns",
        },
      ],
    };
  }

  you.battleArea.push(groundramon, slayerOne, slayerTwo, breakdramon);
  you.hand.push(
    card("demo-examon-one", "EX3-074", 0),
    card("demo-examon-two", "EX3-074", 0),
    card("demo-imperialdramon", "EX3-063", 0),
    card("demo-breakdramon-hand", "EX3-044", 0),
  );
  you.handCount = you.hand.length;
  state.players.push(you, opponent);

  if (effect === "dna" && step === "partner") {
    return {
      state,
      decision: {
        decisionId: "demo-groundramon-dna-partner",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Escolha outro Digimon com Dramon no nome para DNA digievoluir com Groundramon",
        sourceCardId: "EX3-041",
        options: {
          candidateInstanceIds: [slayerOne.permanentId, slayerTwo.permanentId],
          visibleInstanceIds: [slayerOne.permanentId, slayerTwo.permanentId, breakdramon.permanentId],
          min: 1,
          max: 1,
          timing: "EndOfYourTurn",
          effectText: endTurnDna,
        },
      },
    };
  }

  if (effect === "dna" && step === "result") {
    return {
      state,
      decision: {
        decisionId: "demo-groundramon-dna-result",
        seat: 0,
        kind: "selectCards",
        promptText: "Escolha um Examon compatível da sua mão",
        sourceCardId: "EX3-041",
        options: {
          candidateInstanceIds: ["demo-examon-one", "demo-examon-two"],
          visibleInstanceIds: you.hand.map(({ instanceId }) => instanceId),
          min: 1,
          max: 1,
          timing: "EndOfYourTurn",
          effectText: endTurnDna,
        },
      },
    };
  }

  return {
    state,
    decision: {
      decisionId: "demo-groundramon-dna-optional",
      seat: 0,
      kind: "optional",
      promptText: "DNA digievoluir Groundramon no fim do seu turno?",
      sourceCardId: "EX3-041",
      options: { timing: "EndOfYourTurn", effectText: effect === "inherited-text" ? inherited : endTurnDna },
    },
  };
}

function coredramonDemo(effect: string | null): CardEffectsFixture {
  const inherited = "[All Turns] While this Digimon has [Dramon] or [Examon] in its name, it gains ＜Blocker＞.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 1;
  state.memory = -1;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "coredramon-opponent");
  const attacker = permanent("demo-coredramon-attacker", "BT1-028", 1, 2000);
  attacker.isSuspended = true;
  opponent.battleArea.push(attacker);

  if (effect === "inherited" || effect === "inherited-negative") {
    const eligible = effect === "inherited";
    const host = permanent("demo-coredramon-host", eligible ? "EX3-020" : "BT1-084", 0, eligible ? 7000 : 15000, [
      { instanceId: "demo-coredramon-inherited-source", cardId: "EX3-039" },
    ]);
    if (eligible) host.grantedKeywords.push("Blocker");
    you.battleArea.push(host);
    state.players.push(you, opponent);
    return {
      state,
      events: eligible
        ? [
            {
              kind: "effectResolved",
              seat: 0,
              sourceCardId: "EX3-039",
              effectKey: "EX3-039/inherited-blocker",
              description: `Wingdramon tem Dramon no nome e recebeu Blocker de Coredramon. ${inherited}`,
              timing: "AllTurns",
            },
            {
              kind: "blockWindowOpened",
              attackerPermanentId: attacker.permanentId,
              eligibleBlockerIds: [host.permanentId],
            },
          ]
        : [
            {
              kind: "effectResolved",
              seat: 0,
              sourceCardId: "EX3-039",
              effectKey: "EX3-039/inherited-blocker",
              description: `Omnimon não tem Dramon nem Examon no nome; Coredramon não concedeu Blocker. ${inherited}`,
              timing: "AllTurns",
            },
          ],
    };
  }

  if (effect === "promoted") {
    const wingdramon = permanent("demo-coredramon-promoted", "EX3-020", 0, 7000, [
      { instanceId: "demo-coredramon-promoted-source", cardId: "EX3-039" },
    ]);
    wingdramon.grantedKeywords.push("Blocker");
    you.battleArea.push(wingdramon);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "EX3-039",
          effectKey: "EX3-039/armor-purge-promoted-blocker",
          description: `Após Armor Purge, Wingdramon ficou no topo com Coredramon como fonte e passou a ter Blocker. ${inherited}`,
          timing: "AllTurns",
        },
        {
          kind: "blockWindowOpened",
          attackerPermanentId: attacker.permanentId,
          eligibleBlockerIds: [wingdramon.permanentId],
        },
      ],
    };
  }

  const coredramon = permanent("demo-coredramon", "EX3-039", 0, 6000);
  coredramon.keywords.push("Blocker");
  if (effect === "blocked") coredramon.isSuspended = true;
  you.battleArea.push(coredramon);
  if (effect === "declined") you.securityCount = 4;
  state.players.push(you, opponent);

  if (effect === "blocked") {
    return { state, events: [{ kind: "blocked", blockerPermanentId: coredramon.permanentId }] };
  }
  if (effect === "declined") {
    return {
      state,
      events: [
        { kind: "blockDeclined", attackerPermanentId: attacker.permanentId },
        { kind: "securityChecked", seat: 0, revealedCardId: "BT1-010", resolution: "battle" },
      ],
    };
  }
  return {
    state,
    events: [
      {
        kind: "blockWindowOpened",
        attackerPermanentId: attacker.permanentId,
        eligibleBlockerIds: [coredramon.permanentId],
      },
    ],
  };
}

function pomumonDemo(effect: string | null): CardEffectsFixture {
  const effectText = "[Your Turn] When an effect suspends this Digimon, suspend 1 of your opponent's Digimon.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "pomumon-opponent");
  const pomumon = permanent("demo-pomumon", "EX3-038", 0, 2000);
  pomumon.isSuspended = true;
  const elecmon = permanent("demo-pomumon-elecmon", "BT1-028", 1, 2000);
  const gabumon = permanent("demo-pomumon-gabumon", "BT1-029", 1, 2000, [
    { instanceId: "demo-pomumon-gabumon-source", cardId: "BT1-003" },
  ]);
  const agumon = permanent("demo-pomumon-agumon", "BT1-010", 1, 2000);
  agumon.isSuspended = true;
  you.battleArea.push(pomumon);
  opponent.battleArea.push(elecmon, gabumon, agumon);
  state.players.push(you, opponent);

  if (effect === "resolved") {
    gabumon.isSuspended = true;
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "EX3-038",
          effectKey: "EX3-038/your-turn-suspend",
          description: "Pomumon's [Your Turn] effect suspended Gabumon.",
          timing: "YourTurn",
        },
      ],
    };
  }

  if (effect === "not-effect" || effect === "opponent-turn") {
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "EX3-038",
          effectKey: `EX3-038/${effect}`,
          description:
            effect === "not-effect"
              ? "Pomumon was suspended by a game action, not an effect, so its effect did not trigger."
              : "Pomumon was suspended during the opponent's turn, so its [Your Turn] effect did not trigger.",
          timing: "YourTurn",
        },
      ],
    };
  }

  if (effect === "no-active-targets") {
    elecmon.isSuspended = true;
    gabumon.isSuspended = true;
    return { state };
  }

  return {
    state,
    decision: {
      decisionId: "demo-pomumon-suspend-target",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Escolha 1 Digimon ativo do oponente para suspender.",
      sourceCardId: "EX3-038",
      options: {
        candidateInstanceIds: [elecmon.permanentId, gabumon.permanentId],
        visibleInstanceIds: [elecmon.permanentId, gabumon.permanentId, agumon.permanentId],
        min: 1,
        max: 1,
        timing: "YourTurn",
        effectText,
      },
    },
  };
}

function parasaurmonDemo(effect: string | null): CardEffectsFixture {
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
          kind: "effectResolved",
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
          kind: "effectResolved",
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

function entmonDemo(effect: string | null): CardEffectsFixture {
  const digisorption =
    "＜Digisorption -3＞ (When one of your Digimon digivolves into this card from your hand, you may suspend 1 of your Digimon to reduce the digivolution cost by 3.)";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = effect === "threshold" ? -3 : effect === "reduced" ? 0 : 1;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const entmon = permanent("demo-entmon", "EX3-043", 0, 8000, [{ instanceId: "demo-entmon-base", cardId: "BT1-072" }]);
  const pomumon = permanent("demo-entmon-pomumon", "EX3-038", 0, 2000);
  const mushroomon = permanent("demo-entmon-mushroomon", "BT1-065", 0, 2000);
  opponent.handCount = 5;

  if (effect === "reduced") {
    pomumon.isSuspended = true;
    you.battleArea.push(entmon, pomumon, mushroomon);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        { kind: "memoryChanged", from: 1, to: 0, reason: "Entmon: Digisorption reduziu o custo de evolução em 3" },
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "EX3-043",
          effectKey: "EX3-043/when-digivolving-unsuspend",
          description: "Entmon contou consigo mesma e 1 aliado suspenso, então foi dessuspensa.",
          timing: "WhenDigivolving",
        },
      ],
    };
  }

  if (effect === "threshold") {
    entmon.isSuspended = true;
    you.battleArea.push(entmon, pomumon);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        { kind: "memoryChanged", from: 1, to: -3, reason: "Entmon: Digisorption recusada; custo completo pago" },
      ],
    };
  }

  mushroomon.isSuspended = true;
  you.battleArea.push(entmon, pomumon, mushroomon);
  state.players.push(you, opponent);

  if (effect === "cost") {
    return {
      state,
      decision: {
        decisionId: "demo-entmon-digisorption-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Escolha 1 dos seus Digimon ativos para suspender e reduzir o custo em 3",
        sourceCardId: "EX3-043",
        options: {
          candidateInstanceIds: [entmon.topCard.instanceId, pomumon.topCard.instanceId],
          visibleInstanceIds: [entmon.topCard.instanceId, pomumon.topCard.instanceId, mushroomon.topCard.instanceId],
          min: 1,
          max: 1,
          timing: "Static",
          effectText: digisorption,
        },
      },
    };
  }

  return {
    state,
    decision: {
      decisionId: "demo-entmon-digisorption-optional",
      seat: 0,
      kind: "optional",
      promptText: "Usar Digisorption -3 de Entmon?",
      sourceCardId: "EX3-043",
      options: { timing: "Static", effectText: digisorption },
    },
  };
}

function breakdramonDemo(effect: string | null): CardEffectsFixture {
  const suspensionEffect =
    "[All Turns][Once Per Turn] When this Digimon becomes suspended, suspend 1 of your opponent's Digimon.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const breakdramon = permanent("demo-breakdramon", "EX3-044", 0, 12000, [
    { instanceId: "demo-breakdramon-base", cardId: "EX3-041" },
  ]);
  const elecmon = permanent("demo-breakdramon-elecmon", "BT1-028", 1, 2000);
  const gabumon = permanent("demo-breakdramon-gabumon", "BT1-029", 1, 2000);
  const agumon = permanent("demo-breakdramon-agumon", "BT1-010", 1, 2000);
  opponent.handCount = 5;

  if (effect === "security") {
    breakdramon.isSuspended = true;
    you.battleArea.push(breakdramon);
    opponent.securityCount = 4;
    opponent.trash.push(
      card("demo-breakdramon-defender", "BT1-028", 1),
      card("demo-breakdramon-security", "BT1-003", 1),
    );
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "EX3-044",
          effectKey: "EX3-044/security-trash",
          description: "Breakdramon venceu a batalha e descartou a carta do topo da segurança do oponente.",
          timing: "AllTurns",
        },
        { kind: "cardsMoved", instanceIds: ["demo-breakdramon-defender"], from: "battleArea", to: "trash" },
        { kind: "cardsMoved", instanceIds: ["demo-breakdramon-security"], from: "security", to: "trash" },
      ],
    };
  }

  if (effect === "inherited") {
    const wingdramon = permanent("demo-breakdramon-wingdramon", "EX3-020", 0, 7000, [
      { instanceId: "demo-breakdramon-inherited", cardId: "EX3-044" },
    ]);
    wingdramon.isSuspended = true;
    you.battleArea.push(wingdramon);
    opponent.securityCount = 4;
    opponent.trash.push(
      card("demo-breakdramon-inherited-defender", "BT1-028", 1),
      card("demo-breakdramon-inherited-security", "BT1-003", 1),
    );
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "EX3-044",
          effectKey: "EX3-044/inherited-security-trash",
          description: "O efeito herdado de Breakdramon descartou a carta do topo da segurança do oponente.",
          timing: "AllTurns",
        },
        {
          kind: "cardsMoved",
          instanceIds: ["demo-breakdramon-inherited-defender"],
          from: "battleArea",
          to: "trash",
        },
        {
          kind: "cardsMoved",
          instanceIds: ["demo-breakdramon-inherited-security"],
          from: "security",
          to: "trash",
        },
      ],
    };
  }

  breakdramon.isSuspended = true;
  gabumon.isSuspended = true;
  you.battleArea.push(breakdramon);
  opponent.battleArea.push(elecmon, gabumon, agumon);
  state.players.push(you, opponent);
  return {
    state,
    decision: {
      decisionId: "demo-breakdramon-suspend",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Escolha 1 Digimon ativo do oponente para suspender",
      sourceCardId: "EX3-044",
      options: {
        candidateInstanceIds: [elecmon.permanentId, agumon.permanentId],
        visibleInstanceIds: [elecmon.permanentId, gabumon.permanentId, agumon.permanentId],
        min: 1,
        max: 1,
        timing: "AllTurns",
        effectText: suspensionEffect,
      },
    },
  };
}

function hydramonDemo(effect: string | null): CardEffectsFixture {
  const whenDigivolving = "[When Digivolving] You may suspend 1 Digimon.";
  const endTurn =
    "[End of Your Turn][Once Per Turn] If you have 2 or more suspended Digimon with [Vegetation], [Plant], or [Fairy] in one of their traits, return 1 of your opponent's suspended Digimon to the bottom of its owner's deck.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = effect === "memory" ? 2 : 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const hydramon = permanent("demo-hydramon", "EX3-045", 0, 13000, [
    { instanceId: "demo-hydramon-base", cardId: "EX3-043" },
  ]);
  const pomumon = permanent("demo-hydramon-pomumon", "EX3-038", 0, 2000);
  const tinkermon = permanent("demo-hydramon-tinkermon", "BT1-047", 0, 2000);
  const elecmon = permanent("demo-hydramon-elecmon", "BT1-028", 1, 2000, [
    { instanceId: "demo-hydramon-elecmon-source", cardId: "BT1-003" },
  ]);
  const gabumon = permanent("demo-hydramon-gabumon", "BT1-029", 1, 2000);
  const agumon = permanent("demo-hydramon-agumon", "BT1-010", 1, 2000);
  opponent.handCount = 5;

  if (effect === "memory") {
    hydramon.isSuspended = true;
    pomumon.isSuspended = true;
    tinkermon.isSuspended = true;
    elecmon.isSuspended = true;
    you.battleArea.push(hydramon, pomumon, tinkermon);
    opponent.battleArea.push(elecmon);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "memoryChanged",
          from: 0,
          to: 2,
          reason: "Hydramon: 2 outros Digimon Vegetation/Fairy estão suspensos",
        },
      ],
    };
  }

  if (effect === "returned") {
    hydramon.isSuspended = true;
    pomumon.isSuspended = true;
    gabumon.isSuspended = true;
    you.battleArea.push(hydramon, pomumon);
    opponent.battleArea.push(gabumon);
    opponent.deck.push(elecmon.topCard);
    opponent.deckCount = 37;
    opponent.trash.push(...elecmon.stack);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        { kind: "cardsMoved", instanceIds: [elecmon.topCard.instanceId], from: "battleArea", to: "deck" },
        {
          kind: "cardsMoved",
          instanceIds: elecmon.stack.map(({ instanceId }) => instanceId),
          from: "digivolutionCards",
          to: "trash",
        },
      ],
    };
  }

  if (effect === "end-turn") {
    hydramon.isSuspended = true;
    pomumon.isSuspended = true;
    elecmon.isSuspended = true;
    gabumon.isSuspended = true;
    you.battleArea.push(hydramon, pomumon);
    opponent.battleArea.push(elecmon, gabumon, agumon);
    state.players.push(you, opponent);
    return {
      state,
      decision: {
        decisionId: "demo-hydramon-end-turn",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Escolha 1 Digimon suspenso do oponente para devolver ao fundo do baralho",
        sourceCardId: "EX3-045",
        options: {
          candidateInstanceIds: [elecmon.permanentId, gabumon.permanentId],
          visibleInstanceIds: [elecmon.permanentId, gabumon.permanentId, agumon.permanentId],
          min: 1,
          max: 1,
          timing: "OnEndTurn",
          effectText: endTurn,
        },
      },
    };
  }

  const alreadySuspended = gabumon;
  alreadySuspended.isSuspended = true;
  you.battleArea.push(hydramon, pomumon);
  opponent.battleArea.push(elecmon, alreadySuspended);
  state.players.push(you, opponent);

  if (effect === "suspend") {
    return {
      state,
      decision: {
        decisionId: "demo-hydramon-suspend",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Escolha 1 Digimon ativo para suspender",
        sourceCardId: "EX3-045",
        options: {
          candidateInstanceIds: [hydramon.permanentId, pomumon.permanentId, elecmon.permanentId],
          visibleInstanceIds: [
            hydramon.permanentId,
            pomumon.permanentId,
            elecmon.permanentId,
            alreadySuspended.permanentId,
          ],
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
      decisionId: "demo-hydramon-optional",
      seat: 0,
      kind: "optional",
      promptText: "Ativar o efeito de Hydramon para suspender 1 Digimon?",
      sourceCardId: "EX3-045",
      options: { timing: "WhenDigivolving", effectText: whenDigivolving },
    },
  };
}

function goldramonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const whenDigivolving =
    "[When Digivolving] You may return 1 card with the [Four Great Dragons] trait from your trash to your hand.";
  const whenAttacking =
    "[When Attacking] 1 of your opponent's Digimon gets -6000 for the turn. Then, by returning 1 [Magnadramon], 1 [Azulongmon], and 1 [Megidramon] from your trash to the bottom of your deck in any order, trash the top 2 cards of your opponent's security stack.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = effect === "expired" ? 8 : 7;
  state.turnSeat = 0;
  state.memory = 2;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "goldramon-opponent");
  const goldramon = permanent("demo-goldramon", "EX3-035", 0, 11000);
  you.battleArea.push(goldramon);

  if (
    !effect ||
    effect === "return-choice" ||
    effect === "accepted" ||
    effect === "declined" ||
    effect === "no-dragon"
  ) {
    const firstDragon = card("demo-goldramon-magna-one", "EX3-036", 0);
    const secondDragon = card("demo-goldramon-magna-two", "EX3-036", 0);
    const trial = card("demo-goldramon-trial", "EX3-069", 0);
    const filler = card("demo-goldramon-filler", "BT1-010", 0);
    you.trash.push(firstDragon, secondDragon, trial, filler);
    if (effect === "no-dragon") you.trash.splice(0, 3);
    if (effect === "accepted") {
      you.trash.splice(0, 1);
      you.hand.push(firstDragon);
      you.handCount = 1;
    }
    state.players.push(you, opponent);
    if (effect === "accepted" || effect === "declined" || effect === "no-dragon") {
      const description =
        effect === "accepted"
          ? "Goldramon devolveu 1 Magnadramon do lixo para a mão."
          : effect === "declined"
            ? "A devolução opcional foi recusada; as cartas permaneceram no lixo."
            : "Não havia carta com Four Great Dragons no lixo; nenhuma ação foi aberta.";
      return {
        state,
        events: [
          {
            kind: "effectResolved",
            seat: 0,
            sourceCardId: "EX3-035",
            effectKey: `EX3-035/${effect}`,
            description: `${description} ${whenDigivolving}`,
            timing: "WhenDigivolving",
          },
        ],
      };
    }
    if (effect === "return-choice") {
      return {
        state,
        decision: {
          decisionId: "demo-goldramon-return-choice",
          seat: 0,
          kind: "selectCards",
          promptText: "Escolha 1 carta Four Great Dragons para devolver do lixo à mão",
          sourceCardId: "EX3-035",
          options: {
            candidateInstanceIds: [firstDragon.instanceId, secondDragon.instanceId, trial.instanceId],
            visibleInstanceIds: [firstDragon.instanceId, secondDragon.instanceId, trial.instanceId, filler.instanceId],
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
        decisionId: "demo-goldramon-return-optional",
        seat: 0,
        kind: "optional",
        promptText: "Devolver 1 carta Four Great Dragons do lixo para a mão?",
        sourceCardId: "EX3-035",
        options: { timing: "WhenDigivolving", effectText: whenDigivolving },
      },
    };
  }

  const magnaOne = card("demo-goldramon-cost-magna-one", "EX3-036", 0);
  const magnaTwo = card("demo-goldramon-cost-magna-two", "EX3-036", 0);
  const azulongmon = card("demo-goldramon-cost-azulongmon", "EX3-025", 0);
  const megidramon = card("demo-goldramon-cost-megidramon", "EX3-064", 0);
  const filler = card("demo-goldramon-cost-filler", "BT1-010", 0);
  you.trash.push(magnaOne, magnaTwo, azulongmon, megidramon, filler);
  const targetResolved = step !== "target" && effect !== "expired";
  const target = permanent("demo-goldramon-target", "BT1-010", 1, targetResolved ? 4000 : 10000);
  const other = permanent("demo-goldramon-other", "BT1-011", 1, 10000);
  opponent.battleArea.push(target, other);
  state.players.push(you, opponent);

  if (effect === "paid" || effect === "declined-cost" || effect === "missing-name" || effect === "expired") {
    if (effect === "paid") {
      you.trash.splice(0, you.trash.length, magnaTwo, filler);
      you.deck.push(megidramon, azulongmon, magnaOne);
      you.deckCount = 39;
      opponent.securityCount = 3;
    }
    if (effect === "missing-name") you.trash.splice(3, 1);
    const description =
      effect === "paid"
        ? "Goldramon aplicou -6000 DP, devolveu os 3 nomes ao fundo na ordem escolhida e descartou as 2 cartas do topo da segurança do oponente."
        : effect === "declined-cost"
          ? "Goldramon aplicou -6000 DP; o custo de 3 nomes foi recusado e nenhuma segurança foi descartada pelo efeito."
          : effect === "missing-name"
            ? "Goldramon aplicou -6000 DP, mas faltava Megidramon no lixo; o custo não foi oferecido."
            : "O turno terminou e a redução de -6000 DP de Goldramon expirou.";
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "EX3-035",
          effectKey: `EX3-035/${effect}`,
          description: `${description} ${whenAttacking}`,
          timing: "WhenAttacking",
        },
      ],
    };
  }

  if (step === "target") {
    return {
      state,
      decision: {
        decisionId: "demo-goldramon-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Escolha 1 Digimon do oponente para receber -6000 DP neste turno",
        sourceCardId: "EX3-035",
        options: {
          candidateInstanceIds: [target.permanentId, other.permanentId],
          visibleInstanceIds: [target.permanentId, other.permanentId],
          min: 1,
          max: 1,
          timing: "WhenAttacking",
          effectText: whenAttacking,
        },
      },
    };
  }
  const selections = {
    azulongmon: { cards: [azulongmon], min: 1, prompt: "Escolha 1 Azulongmon para devolver ao fundo do baralho" },
    megidramon: { cards: [megidramon], min: 1, prompt: "Escolha 1 Megidramon para devolver ao fundo do baralho" },
    magnadramon: { cards: [magnaOne, magnaTwo], min: 0, prompt: "Você pode escolher 1 Magnadramon para pagar o custo" },
  } as const;
  if (step === "order") {
    return {
      state,
      decision: {
        decisionId: "demo-goldramon-order",
        seat: 0,
        kind: "orderCards",
        promptText: "Escolha a ordem dos 3 nomes no fundo do baralho",
        sourceCardId: "EX3-035",
        options: {
          candidateInstanceIds: [magnaOne.instanceId, azulongmon.instanceId, megidramon.instanceId],
          visibleInstanceIds: [magnaOne.instanceId, azulongmon.instanceId, megidramon.instanceId],
          min: 3,
          max: 3,
          orderDestination: "deckBottom",
          timing: "WhenAttacking",
          effectText: whenAttacking,
        },
      },
    };
  }
  const selection = selections[step === "azulongmon" || step === "megidramon" ? step : "magnadramon"];
  return {
    state,
    decision: {
      decisionId: `demo-goldramon-${step ?? "magnadramon"}`,
      seat: 0,
      kind: "selectCards",
      promptText: selection.prompt,
      sourceCardId: "EX3-035",
      options: {
        candidateInstanceIds: selection.cards.map(({ instanceId }) => instanceId),
        visibleInstanceIds: [
          magnaOne.instanceId,
          magnaTwo.instanceId,
          azulongmon.instanceId,
          megidramon.instanceId,
          filler.instanceId,
        ],
        min: selection.min,
        max: 1,
        timing: "WhenAttacking",
        effectText: whenAttacking,
      },
    },
  };
}

function magnadramonDemo(effect: string | null, step: string | null): CardEffectsFixture {
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
          kind: "effectResolved",
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
          kind: "effectResolved",
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
          kind: "effectResolved",
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
          kind: "effectResolved",
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
          kind: "effectResolved",
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

function angewomonDemo(effect: string | null): CardEffectsFixture {
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
          kind: "effectResolved",
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
          kind: "effectResolved",
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
          kind: "effectResolved",
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
          kind: "effectResolved",
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

function majiramonDemo(effect: string | null): CardEffectsFixture {
  const onPlay =
    "[On Play] 1 of your opponent's Digimon gains ＜Security Attack -2＞ (This Digimon checks 2 fewer security cards) until the end of your opponent's turn. If you have a Digimon with [Four Sovereigns] in its traits in play, gain 2 memory.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = effect === "expired" ? 9 : 8;
  state.turnSeat = effect === "active" ? 1 : 0;
  state.memory =
    effect === "active" || effect === "expired" ? 0 : effect === "four-sovereigns" || effect === "no-target" ? 5 : 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "majiramon-opponent");
  const majiramon = permanent("demo-majiramon", "EX3-032", 0, 7000);
  const azulongmon = permanent("demo-majiramon-azulongmon", "EX3-025", 0, 12000);
  const elecmon = permanent("demo-majiramon-elecmon", "BT1-028", 1, 2000);
  const gabumon = permanent("demo-majiramon-gabumon", "BT1-029", 1, 2000, [
    { instanceId: "demo-majiramon-gabumon-source", cardId: "BT1-003" },
  ]);
  you.battleArea.push(majiramon);

  if (effect === "four-sovereigns" || effect === "no-target") you.battleArea.push(azulongmon);
  if (effect !== "no-target") opponent.battleArea.push(elecmon, gabumon);
  state.players.push(you, opponent);

  if (!effect) {
    state.turnSeat = 0;
    state.memory = 3;
    return {
      state,
      decision: {
        decisionId: "demo-majiramon-security-attack-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Escolha 1 Digimon do oponente para receber Security Attack -2",
        sourceCardId: "EX3-032",
        options: {
          candidateInstanceIds: [elecmon.permanentId, gabumon.permanentId],
          min: 1,
          max: 1,
          timing: "OnPlay",
          effectText: onPlay,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    resolved:
      "Majiramon escolheu Elecmon: ele recebeu Security Attack -2 até o fim do turno do oponente. Sem Four Sovereigns em jogo, não ganhou memória; após pagar 7, a memória ficou em 3.",
    "no-sovereign":
      "Sem Four Sovereigns em jogo, Majiramon aplicou Security Attack -2 a Elecmon, mas não ganhou 2 de memória; após pagar 7, a memória ficou em 3.",
    "four-sovereigns":
      "Com Azulongmon, um Four Sovereigns, em jogo, Majiramon aplicou Security Attack -2 a Elecmon e ganhou 2 de memória; após pagar 7, a memória ficou em 5.",
    "no-target":
      "Não havia Digimon do oponente para receber Security Attack -2. O efeito não abriu uma escolha impossível, mas Azulongmon ainda permitiu ganhar 2 de memória; a memória ficou em 5.",
    active:
      "Durante o turno do oponente, Elecmon continua com Security Attack -2 por Majiramon; a redução só termina ao fim deste turno.",
    expired:
      "O turno do oponente terminou; o Security Attack -2 concedido por Majiramon expirou e Elecmon voltou ao valor normal.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "EX3-032",
        effectKey: `EX3-032/${effect}`,
        description: `${descriptions[effect] ?? descriptions.resolved} ${onPlay}`,
        timing: "OnPlay",
      },
    ],
  };
}

function veedramonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const whenDigivolving =
    "[When Digivolving] Reveal the top 4 cards of your deck. Add 1 yellow card with [Dramon] in its name and 1 card with [Four Great Dragons] in its traits among them to your hand. Place the rest at the bottom of your deck in any order.";
  const inherited =
    "[Your Turn] [Once Per Turn] When you play a Digimon with the [Four Great Dragons] trait, 1 of those Digimon gains <Rush> for the turn. (This Digimon may attack the turn it was played.)";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = effect === "inherited-expired" ? 9 : 8;
  state.turnSeat = 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "veedramon-opponent");
  const host = permanent("demo-veedramon-host", "EX3-033", 0, 7000, [
    { instanceId: "demo-veedramon-source", cardId: "EX3-031" },
  ]);
  const veedramon = permanent("demo-veedramon", "EX3-031", 0, 5000, [
    { instanceId: "demo-veedramon-base", cardId: "EX3-027" },
  ]);
  const revealed = [
    { instanceId: "demo-veedramon-overlap", cardId: "EX3-036" },
    { instanceId: "demo-veedramon-yellow-dramon", cardId: "EX3-031" },
    { instanceId: "demo-veedramon-four-dragons", cardId: "EX3-025" },
    { instanceId: "demo-veedramon-filler", cardId: "BT3-024" },
  ];

  if (effect?.startsWith("inherited")) {
    const firstDragon = permanent("demo-veedramon-first-dragon", "EX3-035", 0, 11000);
    const secondDragon = permanent("demo-veedramon-second-dragon", "EX3-036", 0, 12000);
    const commonDigimon = permanent("demo-veedramon-common", "BT1-010", 0, 2000);
    if (!["inherited-expired", "inherited-multi"].includes(effect)) {
      firstDragon.grantedKeywords.push("Rush");
      firstDragon.canAttackPlayer = true;
    }
    if (effect === "inherited-multi-resolved") {
      firstDragon.grantedKeywords.length = 0;
      firstDragon.canAttackPlayer = false;
      secondDragon.grantedKeywords.push("Rush");
      secondDragon.canAttackPlayer = true;
    }
    you.battleArea.push(host, firstDragon);
    if (["inherited-opt", "inherited-multi", "inherited-multi-resolved"].includes(effect)) {
      you.battleArea.push(secondDragon);
    }
    if (["inherited-multi", "inherited-multi-resolved"].includes(effect)) you.battleArea.push(commonDigimon);
    opponent.handCount = 5;
    state.players.push(you, opponent);
    if (effect === "inherited-multi") {
      return {
        state,
        decision: {
          decisionId: "demo-veedramon-multi-play-rush",
          seat: 0,
          kind: "chooseTargets",
          promptText: "Escolha 1 dos Four Great Dragons recém-jogados para receber Rush neste turno.",
          sourceCardId: "EX3-031",
          options: {
            candidateInstanceIds: [firstDragon.permanentId, secondDragon.permanentId],
            visibleInstanceIds: [firstDragon.permanentId, secondDragon.permanentId, commonDigimon.permanentId],
            min: 1,
            max: 1,
            timing: "YourTurn",
            effectText: inherited,
          },
        },
      };
    }
    const description =
      effect === "inherited-opt"
        ? "Veedramon concedeu Rush ao primeiro Four Great Dragons jogado. A segunda jogada não recebeu Rush porque o efeito é Once Per Turn."
        : effect === "inherited-multi-resolved"
          ? "Goldramon, Magnadramon e Agumon foram jogados simultaneamente; só os dois Four Great Dragons eram elegíveis, Magnadramon foi escolhido e somente ele recebeu Rush neste turno."
          : effect === "inherited-expired"
            ? "O turno terminou e o Rush concedido por Veedramon expirou; Goldramon não pode mais atacar por ter sido jogado naquele turno."
            : "O efeito herdado de Veedramon concedeu Rush ao Goldramon recém-jogado, que pode atacar neste turno; o host não recebeu Rush.";
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "EX3-031",
          effectKey: `EX3-031/${effect}`,
          description: `${description} ${inherited}`,
          timing: "YourTurn",
        },
      ],
    };
  }

  you.battleArea.push(veedramon);
  opponent.handCount = 5;
  if (effect === "no-dragon") {
    revealed[0] = { instanceId: "demo-veedramon-sole-dramon", cardId: "EX3-031" };
    revealed[1] = { instanceId: "demo-veedramon-no-second-dramon", cardId: "BT1-029" };
    revealed[2] = { instanceId: "demo-veedramon-no-dragon", cardId: "BT1-010" };
  }
  if (effect === "no-dramon") {
    revealed[0] = { instanceId: "demo-veedramon-no-overlap", cardId: "BT1-011" };
    revealed[1] = { instanceId: "demo-veedramon-no-dramon", cardId: "BT1-029" };
  }
  if (effect === "no-categories") {
    revealed[0] = { instanceId: "demo-veedramon-no-overlap", cardId: "BT1-011" };
    revealed[1] = { instanceId: "demo-veedramon-no-dramon", cardId: "BT1-029" };
    revealed[2] = { instanceId: "demo-veedramon-no-dragon", cardId: "BT1-010" };
  }

  const choosingDragon = step === "dragon" || effect === "no-dramon";
  const ordering = step === "order" || effect === "no-categories" || effect === "no-dragon";
  if (choosingDragon && effect !== "no-dramon") you.hand.push(card(revealed[0]!.instanceId, revealed[0]!.cardId, 0));
  if (ordering && effect !== "no-categories") {
    you.hand.push(card(revealed[0]!.instanceId, revealed[0]!.cardId, 0));
    if (effect !== "no-dragon") you.hand.push(card(revealed[2]!.instanceId, revealed[2]!.cardId, 0));
  }
  if (effect === "resolved") {
    you.hand.push(card(revealed[0]!.instanceId, revealed[0]!.cardId, 0));
    you.hand.push(card(revealed[2]!.instanceId, revealed[2]!.cardId, 0));
    you.deck.push(card(revealed[1]!.instanceId, revealed[1]!.cardId, 0));
    you.deck.push(card(revealed[3]!.instanceId, revealed[3]!.cardId, 0));
  }
  you.handCount = you.hand.length;
  you.deckCount = effect === "resolved" ? 34 : 36;
  state.players.push(you, opponent);

  if (effect === "resolved") {
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "EX3-031",
          effectKey: "EX3-031/when-digivolving",
          description:
            "Veedramon adicionou Magnadramon e Azulongmon à mão e colocou as outras 2 cartas no fundo do baralho na ordem escolhida. " +
            whenDigivolving,
          timing: "WhenDigivolving",
        },
      ],
    };
  }

  if (ordering) {
    const remaining =
      effect === "no-categories" ? revealed : effect === "no-dragon" ? revealed.slice(1) : [revealed[1]!, revealed[3]!];
    return {
      state,
      decision: {
        decisionId: "demo-veedramon-order",
        seat: 0,
        kind: "orderCards",
        promptText: "Escolha a ordem das cartas que irão para o fundo do baralho.",
        sourceCardId: "EX3-031",
        options: {
          candidateInstanceIds: remaining.map(({ instanceId }) => instanceId),
          visibleInstanceIds: remaining.map(({ instanceId }) => instanceId),
          visibleCards: remaining,
          min: remaining.length,
          max: remaining.length,
          orderDestination: "deckBottom",
          timing: "WhenDigivolving",
          effectText: whenDigivolving,
        },
      },
    };
  }

  const candidates = choosingDragon ? [revealed[2]!.instanceId] : [revealed[0]!.instanceId, revealed[1]!.instanceId];
  return {
    state,
    decision: {
      decisionId: choosingDragon ? "demo-veedramon-four-dragons" : "demo-veedramon-dramon",
      seat: 0,
      kind: "selectCards",
      promptText: choosingDragon
        ? "Escolha 1 carta com Four Great Dragons nos traits."
        : "Escolha 1 carta amarela com Dramon no nome.",
      sourceCardId: "EX3-031",
      options: {
        candidateInstanceIds: candidates,
        visibleInstanceIds: revealed.map(({ instanceId }) => instanceId),
        visibleCards: revealed,
        min: 1,
        max: 1,
        timing: "WhenDigivolving",
        effectText: whenDigivolving,
      },
    },
  };
}

function gatomonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const onPlay =
    "[On Play] Reveal the top 4 cards of your deck. Add 1 yellow card with [Angel], [Cherub], [Throne], [Authority], [Seraph] or [Virtue], other than [Three Great Angels], in one of its traits and 1 card with the [Four Great Dragons] trait among them to your hand. Place the rest at the bottom of your deck in any order.";
  const inherited =
    "[Your Turn] [Once Per Turn] When you play a Digimon with the [Four Great Dragons] trait, 1 of those Digimon gains ＜Rush＞ for the turn. (This Digimon may attack the turn it was played.)";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = effect === "inherited-expired" ? 9 : 8;
  state.turnSeat = 0;
  state.memory = 6;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "gatomon-opponent");
  const host = permanent("demo-gatomon-host", "BT1-056", 0, 6000, [
    { instanceId: "demo-gatomon-source", cardId: "EX3-030" },
  ]);
  const gatomon = permanent("demo-gatomon", "EX3-030", 0, 4000);
  const revealed = [
    { instanceId: "demo-gatomon-authority", cardId: "BT1-062" },
    { instanceId: "demo-gatomon-excluded", cardId: "BT1-063" },
    { instanceId: "demo-gatomon-four-dragons", cardId: "EX3-025" },
    { instanceId: "demo-gatomon-filler", cardId: "BT1-029" },
  ];

  if (effect?.startsWith("inherited")) {
    const firstDragon = permanent("demo-gatomon-first-dragon", "EX3-035", 0, 11000);
    const secondDragon = permanent("demo-gatomon-second-dragon", "EX3-036", 0, 12000);
    const commonDigimon = permanent("demo-gatomon-common", "BT1-010", 0, 2000);
    if (!["inherited-expired", "inherited-multi"].includes(effect)) {
      firstDragon.grantedKeywords.push("Rush");
      firstDragon.canAttackPlayer = true;
    }
    if (effect === "inherited-multi-resolved") {
      firstDragon.grantedKeywords.length = 0;
      firstDragon.canAttackPlayer = false;
      secondDragon.grantedKeywords.push("Rush");
      secondDragon.canAttackPlayer = true;
    }
    you.battleArea.push(host, firstDragon);
    if (["inherited-opt", "inherited-multi", "inherited-multi-resolved"].includes(effect)) {
      you.battleArea.push(secondDragon);
    }
    if (["inherited-multi", "inherited-multi-resolved"].includes(effect)) you.battleArea.push(commonDigimon);
    opponent.handCount = 5;
    state.players.push(you, opponent);
    if (effect === "inherited-multi") {
      return {
        state,
        decision: {
          decisionId: "demo-gatomon-multi-play-rush",
          seat: 0,
          kind: "chooseTargets",
          promptText: "Escolha 1 dos Four Great Dragons recém-jogados para receber Rush neste turno.",
          sourceCardId: "EX3-030",
          options: {
            candidateInstanceIds: [firstDragon.permanentId, secondDragon.permanentId],
            visibleInstanceIds: [firstDragon.permanentId, secondDragon.permanentId, commonDigimon.permanentId],
            min: 1,
            max: 1,
            timing: "YourTurn",
            effectText: inherited,
          },
        },
      };
    }
    const description =
      effect === "inherited-opt"
        ? "Gatomon concedeu Rush ao primeiro Four Great Dragons jogado. A segunda jogada não recebeu Rush porque o efeito é Once Per Turn."
        : effect === "inherited-multi-resolved"
          ? "Goldramon, Magnadramon e Agumon foram jogados simultaneamente; só os dois Four Great Dragons eram elegíveis, Magnadramon foi escolhido e somente ele recebeu Rush neste turno."
          : effect === "inherited-expired"
            ? "O turno terminou e o Rush concedido por Gatomon expirou; Goldramon não pode mais atacar por ter sido jogado naquele turno."
            : "O efeito herdado de Gatomon concedeu Rush ao Goldramon recém-jogado, que pode atacar neste turno; o host não recebeu Rush.";
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "EX3-030",
          effectKey: `EX3-030/${effect}`,
          description: `${description} ${inherited}`,
          timing: "YourTurn",
        },
      ],
    };
  }

  you.battleArea.push(gatomon);
  opponent.handCount = 5;
  if (effect === "no-dragon") {
    revealed[2] = { instanceId: "demo-gatomon-no-dragon", cardId: "BT1-010" };
  }
  if (effect === "no-angel") {
    revealed[0] = { instanceId: "demo-gatomon-no-angel", cardId: "BT1-011" };
  }
  if (effect === "no-categories") {
    revealed[0] = { instanceId: "demo-gatomon-no-angel", cardId: "BT1-011" };
    revealed[2] = { instanceId: "demo-gatomon-no-dragon", cardId: "BT1-010" };
  }

  const choosingDragon = step === "dragon" || effect === "no-angel";
  const ordering = step === "order" || effect === "no-categories" || effect === "no-dragon";
  if (choosingDragon && effect !== "no-angel") you.hand.push(card(revealed[0]!.instanceId, revealed[0]!.cardId, 0));
  if (ordering && effect !== "no-categories") {
    you.hand.push(card(revealed[0]!.instanceId, revealed[0]!.cardId, 0));
    if (effect !== "no-dragon") you.hand.push(card(revealed[2]!.instanceId, revealed[2]!.cardId, 0));
  }
  if (effect === "resolved") {
    you.hand.push(card(revealed[0]!.instanceId, revealed[0]!.cardId, 0));
    you.hand.push(card(revealed[2]!.instanceId, revealed[2]!.cardId, 0));
    you.deck.push(card(revealed[1]!.instanceId, revealed[1]!.cardId, 0));
    you.deck.push(card(revealed[3]!.instanceId, revealed[3]!.cardId, 0));
  }
  you.handCount = you.hand.length;
  you.deckCount = effect === "resolved" ? 34 : 36;
  state.players.push(you, opponent);

  if (effect === "resolved") {
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "EX3-030",
          effectKey: "EX3-030/on-play",
          description:
            "Gatomon adicionou SlashAngemon e Azulongmon à mão; Seraphimon foi excluído por ter Three Great Angels, e as outras 2 cartas foram ao fundo na ordem escolhida. " +
            onPlay,
          timing: "OnPlay",
        },
      ],
    };
  }

  if (ordering) {
    const remaining =
      effect === "no-categories" ? revealed : effect === "no-dragon" ? revealed.slice(1) : [revealed[1]!, revealed[3]!];
    return {
      state,
      decision: {
        decisionId: "demo-gatomon-order",
        seat: 0,
        kind: "orderCards",
        promptText: "Escolha a ordem das cartas que irão para o fundo do baralho.",
        sourceCardId: "EX3-030",
        options: {
          candidateInstanceIds: remaining.map(({ instanceId }) => instanceId),
          visibleInstanceIds: remaining.map(({ instanceId }) => instanceId),
          visibleCards: remaining,
          min: remaining.length,
          max: remaining.length,
          orderDestination: "deckBottom",
          timing: "OnPlay",
          effectText: onPlay,
        },
      },
    };
  }

  return {
    state,
    decision: {
      decisionId: choosingDragon ? "demo-gatomon-four-dragons" : "demo-gatomon-angel-family",
      seat: 0,
      kind: "selectCards",
      promptText: choosingDragon
        ? "Escolha 1 carta com Four Great Dragons nos traits."
        : "Escolha 1 carta amarela com Angel, Cherub, Throne, Authority, Seraph ou Virtue nos traits, exceto Three Great Angels.",
      sourceCardId: "EX3-030",
      options: {
        candidateInstanceIds: [revealed[choosingDragon ? 2 : 0]!.instanceId],
        visibleInstanceIds: revealed.map(({ instanceId }) => instanceId),
        visibleCards: revealed,
        min: 1,
        max: 1,
        timing: "OnPlay",
        effectText: onPlay,
      },
    },
  };
}

function airdramonDemo(effect: string | null): CardEffectsFixture {
  const onPlay =
    "[On Play] Search your security stack, reveal 1 card from it, and add it to your hand. If it's a yellow card, ＜Recovery +1 (Deck)＞. (Place the top card of your deck on top of your security stack.) Then, shuffle your security stack.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 5;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "airdramon-opponent");
  you.battleArea.push(permanent("demo-airdramon", "EX3-029", 0, 5000));
  const yellow = card("demo-airdramon-yellow", "BT1-045", 0);
  const red = card("demo-airdramon-red", "BT1-009", 0);
  const multicolor = card("demo-airdramon-multicolor", "BT10-055", 0);
  const recovery = card("demo-airdramon-recovery", "BT1-001", 0);
  const security = [yellow, red, multicolor];
  opponent.handCount = 5;

  if (!effect) {
    you.security.push(...security);
    you.securityCount = security.length;
    you.deck.push(recovery);
    you.deckCount = 35;
    state.players.push(you, opponent);
    return {
      state,
      decision: {
        decisionId: "demo-airdramon-search-security",
        seat: 0,
        kind: "selectCards",
        promptText: "Escolha 1 carta da sua segurança para revelar e adicionar à mão.",
        sourceCardId: "EX3-029",
        options: {
          candidateInstanceIds: security.map(({ instanceId }) => instanceId),
          visibleInstanceIds: security.map(({ instanceId }) => instanceId),
          visibleCards: security.map(({ instanceId, cardId }) => ({ instanceId, cardId })),
          min: 1,
          max: 1,
          timing: "OnPlay",
          effectText: onPlay,
        },
      },
    };
  }

  let description: string;
  let revealedCardId: string | undefined;
  if (effect === "empty-security") {
    you.deck.push(recovery);
    you.deckCount = 35;
    description =
      "A segurança estava vazia; Airdramon não abriu uma escolha impossível e o baralho permaneceu intacto.";
  } else if (effect === "non-yellow") {
    revealedCardId = red.cardId;
    red.faceUp = true;
    you.hand.push(red);
    you.security.push(yellow, multicolor);
    you.deck.push(recovery);
    you.deckCount = 35;
    description =
      "Airdramon revelou Monodramon e o adicionou à mão. Como a carta não era amarela, não houve Recovery; a segurança restante foi embaralhada e voltou a ficar oculta.";
  } else if (effect === "yellow-empty-deck") {
    revealedCardId = yellow.cardId;
    yellow.faceUp = true;
    you.hand.push(yellow);
    you.security.push(red, multicolor);
    you.deckCount = 0;
    description =
      "Airdramon revelou Tsukaimon e o adicionou à mão. A carta era amarela, mas o baralho estava vazio e Recovery +1 não moveu carta; a segurança restante foi embaralhada.";
  } else {
    const chosen = effect === "multicolor" ? multicolor : yellow;
    revealedCardId = chosen.cardId;
    chosen.faceUp = true;
    you.hand.push(chosen);
    you.security.push(effect === "multicolor" ? yellow : red, recovery);
    you.deckCount = 34;
    description =
      effect === "multicolor"
        ? "Airdramon revelou Gryphonmon, uma carta multicolorida que também é amarela, e a adicionou à mão. Recovery +1 colocou o topo do baralho na segurança; depois, ela foi embaralhada e voltou a ficar oculta."
        : "Airdramon revelou Tsukaimon e o adicionou à mão. Por ser uma carta amarela, Recovery +1 colocou o topo do baralho na segurança; depois, ela foi embaralhada e voltou a ficar oculta.";
  }
  you.handCount = you.hand.length;
  you.securityCount = you.security.length;
  state.players.push(you, opponent);
  return {
    state,
    events: [
      ...(revealedCardId === undefined
        ? []
        : ([{ kind: "cardRevealed", seat: 0, cardId: revealedCardId, sourceCardId: "EX3-029" }] as const)),
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "EX3-029",
        effectKey: `EX3-029/${effect}`,
        description: `${description} ${onPlay}`,
        timing: "OnPlay",
      },
    ],
  };
}

function patamonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const onPlay =
    "[On Play] Reveal the top 4 cards of your deck. Add 1 yellow card with [Angel], [Cherub], [Throne], [Authority], [Seraph] or [Virtue], other than [Three Great Angels], in one of its traits and 1 card with the [Four Great Dragons] trait among them to your hand. Place the rest at the bottom of your deck in any order.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 7;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "patamon-opponent");
  you.battleArea.push(permanent("demo-patamon", "EX3-028", 0, 2000));
  const revealed = [
    { instanceId: "demo-patamon-authority", cardId: "BT1-062" },
    { instanceId: "demo-patamon-excluded", cardId: "BT1-063" },
    { instanceId: "demo-patamon-four-dragons", cardId: "EX3-025" },
    { instanceId: "demo-patamon-filler", cardId: "BT1-029" },
  ];
  if (effect === "no-dragon") revealed[2] = { instanceId: "demo-patamon-no-dragon", cardId: "BT1-010" };
  if (effect === "no-angel") revealed[0] = { instanceId: "demo-patamon-no-angel", cardId: "BT1-011" };
  if (effect === "no-categories") {
    revealed[0] = { instanceId: "demo-patamon-no-angel", cardId: "BT1-011" };
    revealed[2] = { instanceId: "demo-patamon-no-dragon", cardId: "BT1-010" };
  }
  if (effect === "filter-boundary") {
    revealed.splice(
      0,
      revealed.length,
      { instanceId: "demo-patamon-purple-cherub", cardId: "ST17-09" },
      { instanceId: "demo-patamon-yellow-three-angels", cardId: "BT3-041" },
      { instanceId: "demo-patamon-boundary-filler", cardId: "BT1-029" },
    );
  }
  if (effect === "short-deck") revealed.splice(3, 1);

  const choosingDragon = step === "dragon" || effect === "no-angel";
  const ordering =
    step === "order" ||
    effect === "no-categories" ||
    effect === "no-dragon" ||
    effect === "filter-boundary" ||
    effect === "short-deck";
  if (choosingDragon && effect !== "no-angel") you.hand.push(card(revealed[0]!.instanceId, revealed[0]!.cardId, 0));
  if (ordering && !["no-categories", "filter-boundary"].includes(effect ?? "")) {
    you.hand.push(card(revealed[0]!.instanceId, revealed[0]!.cardId, 0));
    if (effect !== "no-dragon") you.hand.push(card(revealed[2]!.instanceId, revealed[2]!.cardId, 0));
  }
  if (effect === "resolved") {
    you.hand.push(card(revealed[0]!.instanceId, revealed[0]!.cardId, 0));
    you.hand.push(card(revealed[2]!.instanceId, revealed[2]!.cardId, 0));
    you.deck.push(card(revealed[1]!.instanceId, revealed[1]!.cardId, 0));
    you.deck.push(card(revealed[3]!.instanceId, revealed[3]!.cardId, 0));
  }
  you.handCount = you.hand.length;
  you.deckCount = effect === "resolved" ? 34 : effect === "short-deck" ? 0 : 36;
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === "resolved") {
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "EX3-028",
          effectKey: "EX3-028/on-play",
          description:
            "Patamon adicionou SlashAngemon e Azulongmon à mão; Seraphimon foi excluído por ter Three Great Angels, e as outras 2 cartas foram ao fundo na ordem escolhida. " +
            onPlay,
          timing: "OnPlay",
        },
      ],
    };
  }

  if (ordering) {
    const remaining =
      effect === "no-categories" || effect === "filter-boundary"
        ? revealed
        : effect === "no-dragon"
          ? revealed.slice(1)
          : [revealed[1]!, ...(revealed[3] === undefined ? [] : [revealed[3]!])];
    return {
      state,
      decision: {
        decisionId: "demo-patamon-order",
        seat: 0,
        kind: "orderCards",
        promptText:
          effect === "filter-boundary"
            ? "Nenhuma carta era elegível. Escolha a ordem de todas para o fundo do baralho."
            : "Escolha a ordem das cartas que irão para o fundo do baralho.",
        sourceCardId: "EX3-028",
        options: {
          candidateInstanceIds: remaining.map(({ instanceId }) => instanceId),
          visibleInstanceIds: remaining.map(({ instanceId }) => instanceId),
          visibleCards: remaining,
          min: remaining.length,
          max: remaining.length,
          orderDestination: "deckBottom",
          timing: "OnPlay",
          effectText: onPlay,
        },
      },
    };
  }

  return {
    state,
    decision: {
      decisionId: choosingDragon ? "demo-patamon-four-dragons" : "demo-patamon-angel-family",
      seat: 0,
      kind: "selectCards",
      promptText: choosingDragon
        ? "Escolha 1 carta com Four Great Dragons nos traits."
        : "Escolha 1 carta amarela com Angel, Cherub, Throne, Authority, Seraph ou Virtue nos traits, exceto Three Great Angels.",
      sourceCardId: "EX3-028",
      options: {
        candidateInstanceIds: [revealed[choosingDragon ? 2 : 0]!.instanceId],
        visibleInstanceIds: revealed.map(({ instanceId }) => instanceId),
        visibleCards: revealed,
        min: 1,
        max: 1,
        timing: "OnPlay",
        effectText: onPlay,
      },
    },
  };
}

function agumonInheritedDemo(effect: string | null): CardEffectsFixture {
  const inherited =
    "[Your Turn][Once Per Turn] When you play a Digimon with [Four Great Dragons] in its traits or place [Trial of the Four Great Dragons] in your battle area, ＜Draw 1＞.";
  const mode = effect ?? "dragon";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = mode === "next-turn" ? 9 : 8;
  state.turnSeat = mode === "opponent-turn" ? 1 : 0;
  state.memory = 3;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "agumon-opponent");
  const firstHost = permanent("demo-agumon-host-one", "BT1-050", 0, 6000, [
    { instanceId: "demo-agumon-source-one", cardId: "EX3-027" },
  ]);
  const secondHost = permanent("demo-agumon-host-two", "BT1-051", 0, 7000, [
    { instanceId: "demo-agumon-source-two", cardId: "EX3-027" },
  ]);
  const dragon = permanent("demo-agumon-dragon", "EX3-035", 0, 11000);
  const trial = permanent("demo-agumon-trial", "EX3-069", 0, 0);
  const unrelated = permanent("demo-agumon-unrelated", "BT1-029", 0, 2000);
  you.battleArea.push(firstHost);

  let draws = 1;
  let description: string;
  if (mode === "trial") {
    you.battleArea.push(trial);
    description =
      "Trial of the Four Great Dragons foi colocada na área de batalha e o efeito herdado de Agumon comprou 1 carta.";
  } else if (mode === "dragon-then-trial") {
    you.battleArea.push(dragon, trial);
    description =
      "Goldramon foi jogado e ativou o efeito herdado de Agumon primeiro. Trial foi colocada depois, mas a cota compartilhada de Once Per Turn já havia comprado 1 carta.";
  } else if (mode === "trial-then-dragon") {
    you.battleArea.push(trial, dragon);
    description =
      "Trial foi colocada e ativou o efeito herdado de Agumon primeiro. Goldramon foi jogado depois, mas a cota compartilhada de Once Per Turn já havia comprado 1 carta.";
  } else if (mode === "two-copies") {
    you.battleArea.push(secondHost, dragon);
    draws = 2;
    description =
      "Duas cópias herdadas de Agumon responderam independentemente ao mesmo Goldramon e compraram 2 cartas.";
  } else if (mode === "next-turn") {
    you.battleArea.push(dragon);
    draws = 2;
    description =
      "Após a troca de turno, o Once Per Turn de Agumon foi renovado e um novo Four Great Dragons permitiu a segunda compra.";
  } else if (mode === "opponent-turn") {
    you.battleArea.push(dragon);
    draws = 0;
    description = "Goldramon foi jogado no turno do oponente; o efeito Your Turn herdado de Agumon não comprou carta.";
  } else if (mode === "unrelated") {
    you.battleArea.push(unrelated);
    draws = 0;
    description = "Gabumon não possui Four Great Dragons; o efeito herdado de Agumon não comprou carta.";
  } else if (mode === "empty-deck") {
    you.battleArea.push(dragon);
    draws = 0;
    description =
      "Goldramon ativou o efeito herdado de Agumon, mas o baralho estava vazio e nenhuma carta foi comprada.";
  } else {
    you.battleArea.push(dragon);
    description = "Goldramon foi jogado no seu turno e o efeito herdado de Agumon comprou 1 carta.";
  }

  for (let index = 0; index < draws; index += 1) {
    you.hand.push(card(`demo-agumon-draw-${index}`, index === 0 ? "BT1-049" : "BT1-048", 0));
  }
  you.handCount = draws;
  you.deckCount = mode === "empty-deck" ? 0 : 36 - draws;
  opponent.handCount = 5;
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "EX3-027",
        effectKey: `EX3-027/${mode}`,
        description: `${description} ${inherited}`,
        timing: "YourTurn",
      },
    ],
  };
}

function aegisdramonDemo(effect: string | null): CardEffectsFixture {
  const whenDigivolving =
    "[When Digivolving] You may play 1 blue level 3 Digimon card or 1 Digimon card with [Seadramon] in its name or [Aqua] or [Sea Animal] in one of its traits from one of your blue Digimon's digivolution cards without paying its memory cost.";
  const opponentTurn =
    "[Opponent's Turn][Once Per Turn] When your opponent plays a Digimon, you may activate 1 of this Digimon's [When Digivolving] effects.";
  const mode = effect ?? "when-digivolving";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = mode === "reset" ? 9 : 8;
  state.turnSeat = mode.startsWith("opponent") || mode === "reset" || mode === "second-play" ? 1 : 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "aegisdramon-opponent");
  const aegis = permanent("demo-aegisdramon", "EX3-026", 0, 14000);
  const blueHost = permanent("demo-aegis-blue-host", "BT1-033", 0, 6000, [
    { instanceId: "demo-aegis-blue-l3", cardId: "BT1-029" },
    { instanceId: "demo-aegis-sea-animal", cardId: "BT14-008" },
    { instanceId: "demo-aegis-seadramon", cardId: "BT2-024" },
    { instanceId: "demo-aegis-blue-l4", cardId: "EX3-019" },
  ]);
  const redHost = permanent("demo-aegis-red-host", "BT1-010", 0, 2000, [
    { instanceId: "demo-aegis-under-red", cardId: "BT1-030" },
  ]);
  const visible = [
    { instanceId: "demo-aegis-blue-l3", cardId: "BT1-029" },
    { instanceId: "demo-aegis-sea-animal", cardId: "BT14-008" },
    { instanceId: "demo-aegis-seadramon", cardId: "BT2-024" },
    { instanceId: "demo-aegis-blue-l4", cardId: "EX3-019" },
    { instanceId: "demo-aegis-under-red", cardId: "BT1-030" },
  ];
  const candidates = visible.slice(0, 3).map(({ instanceId }) => instanceId);
  you.battleArea.push(aegis, blueHost, redHost);
  if (mode.startsWith("opponent") || mode === "second-play" || mode === "reset") {
    opponent.battleArea.push(permanent("demo-aegis-opponent-play", "BT1-010", 1, 2000));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (mode === "when-digivolving" || mode === "reset") {
    return {
      state,
      decision: {
        decisionId: `demo-aegis-${mode}`,
        seat: 0,
        kind: "optional",
        promptText:
          mode === "reset"
            ? "O turno mudou. Reativar o efeito When Digivolving de Aegisdramon para a nova jogada do oponente?"
            : "Jogar 1 carta elegível das fontes de um dos seus Digimon azuis sem pagar o custo?",
        sourceCardId: "EX3-026",
        options: {
          timing: mode === "reset" ? "OpponentsTurn" : "WhenDigivolving",
          effectText: mode === "reset" ? opponentTurn : whenDigivolving,
        },
      },
    };
  }
  if (mode === "opponent-reactivate") {
    return {
      state,
      decision: {
        decisionId: "demo-aegis-reactivate",
        seat: 0,
        kind: "optional",
        promptText: "Reativar o efeito When Digivolving deste Aegisdramon?",
        sourceCardId: "EX3-026",
        options: { timing: "OpponentsTurn", effectText: opponentTurn },
      },
    };
  }
  if (mode === "opponent-play") {
    return {
      state,
      decision: {
        decisionId: "demo-aegis-reactivated-play",
        seat: 0,
        kind: "optional",
        promptText: "O efeito foi reativado. Jogar 1 carta elegível das fontes de um Digimon azul?",
        sourceCardId: "EX3-026",
        options: { timing: "WhenDigivolving", effectText: whenDigivolving },
      },
    };
  }
  if (mode === "select" || mode === "opponent-select") {
    return {
      state,
      decision: {
        decisionId: `demo-aegis-${mode}`,
        seat: 0,
        kind: "selectCards",
        promptText: "Escolha 1 carta elegível das fontes dos seus Digimon azuis para jogar sem custo.",
        sourceCardId: "EX3-026",
        options: {
          candidateInstanceIds: candidates,
          visibleInstanceIds: visible.map(({ instanceId }) => instanceId),
          visibleCards: visible,
          min: 1,
          max: 1,
          timing: "WhenDigivolving",
          effectText: whenDigivolving,
        },
      },
    };
  }

  let description: string;
  if (mode === "resolved") {
    blueHost.stack.splice(1, 1);
    you.battleArea.push(permanent("demo-aegis-played-source", "BT14-008", 0, 3000));
    description =
      "Aegisdramon jogou Gizamon das fontes de Dolphmon sem pagar o custo; somente a fonte escolhida saiu da stack.";
  } else if (mode === "declined") {
    description = "O jogador recusou o efeito When Digivolving de Aegisdramon; nenhuma fonte saiu das stacks.";
  } else if (mode === "opponent-declined") {
    description = "A reativação opcional de Aegisdramon foi recusada; nenhuma fonte foi consumida.";
  } else if (mode === "second-play") {
    description =
      "Um segundo Digimon do oponente foi jogado no mesmo turno, mas o Once Per Turn de Aegisdramon já havia sido usado e não abriu nova ação.";
  } else {
    description =
      "O oponente jogou um Digimon durante o turno de Aegisdramon; o watcher de Opponent's Turn não ativou e nenhuma fonte foi consumida.";
  }
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "EX3-026",
        effectKey: `EX3-026/${mode}`,
        description: `${description} ${whenDigivolving} ${opponentTurn}`,
        timing: mode.startsWith("opponent") || mode === "second-play" ? "OpponentsTurn" : "WhenDigivolving",
      },
    ],
  };
}

function azulongmonDemo(effect: string | null): CardEffectsFixture {
  const onPlay =
    "[On Play] ＜Draw 2＞. (Draw 2 cards from your deck.) Then, if this card was played by [Trial of the Four Great Dragons]'s effect, gain 2 memory.";
  const onDeletion =
    "[On Deletion] If you don't have a [Trial of the Four Great Dragons] in play, you may place 1 [Trial of the Four Great Dragons] from your hand in your battle area.";
  const mode = effect ?? "on-deletion";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = mode === "trial-played" ? 2 : 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "azulongmon-opponent");
  const firstTrial = card("demo-azulongmon-trial-one", "EX3-069", 0);
  const secondTrial = card("demo-azulongmon-trial-two", "EX3-069", 0);
  const filler = card("demo-azulongmon-filler", "BT1-010", 0);
  opponent.handCount = 5;

  if (["trial-played", "effect-played", "manual", "one-card-deck", "empty-deck"].includes(mode)) {
    you.battleArea.push(permanent("demo-azulongmon", "EX3-025", 0, 12000));
    if (mode === "trial-played") you.battleArea.push(permanent("demo-azulongmon-origin-trial", "EX3-069", 0, 0));
    const draws = mode === "empty-deck" ? 0 : mode === "one-card-deck" ? 1 : 2;
    for (let index = 0; index < draws; index += 1) {
      you.hand.push(card(`demo-azulongmon-draw-${index}`, index === 0 ? "BT1-029" : "BT1-030", 0));
    }
    you.handCount = draws;
    you.deckCount = mode === "empty-deck" ? 0 : mode === "one-card-deck" ? 0 : 34;
    state.players.push(you, opponent);
    const descriptions: Record<string, string> = {
      "trial-played": "Trial jogou Azulongmon: ele comprou 2 cartas e ganhou 2 de memória pela origem correta.",
      "effect-played": "Outro efeito jogou Azulongmon: ele comprou 2 cartas, mas não ganhou memória sem origem Trial.",
      manual: "Azulongmon foi jogado manualmente, pagou 12, comprou 2 cartas e não ganhou o bônus de memória.",
      "one-card-deck": "Azulongmon tentou comprar 2, mas havia só 1 carta no baralho e comprou apenas essa carta.",
      "empty-deck": "Azulongmon tentou comprar 2 com o baralho vazio; nenhuma carta foi comprada e o jogo continuou.",
    };
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "EX3-025",
          effectKey: `EX3-025/${mode}`,
          description: `${descriptions[mode]} ${onPlay}`,
          timing: "OnPlay",
        },
      ],
    };
  }

  you.trash.push(card("demo-azulongmon-deleted", "EX3-025", 0));
  if (mode !== "no-trial-hand") you.hand.push(firstTrial, secondTrial, filler);
  if (mode === "trial-in-play") you.battleArea.push(permanent("demo-azulongmon-existing-trial", "EX3-069", 0, 0));
  if (mode === "accepted") {
    you.hand.splice(0, 1);
    you.battleArea.push(permanent("demo-azulongmon-placed-trial", "EX3-069", 0, 0));
  }
  you.handCount = you.hand.length;
  you.deckCount = 36;
  state.players.push(you, opponent);
  if (mode === "on-deletion") {
    return {
      state,
      decision: {
        decisionId: "demo-azulongmon-on-deletion",
        seat: 0,
        kind: "optional",
        promptText: "Colocar 1 Trial of the Four Great Dragons da mão na área de batalha?",
        sourceCardId: "EX3-025",
        options: { timing: "OnDeletion", effectText: onDeletion },
      },
    };
  }
  if (mode === "trial-choice") {
    return {
      state,
      decision: {
        decisionId: "demo-azulongmon-trial-choice",
        seat: 0,
        kind: "selectCards",
        promptText: "Escolha 1 Trial of the Four Great Dragons para colocar na área de batalha.",
        sourceCardId: "EX3-025",
        options: {
          candidateInstanceIds: [firstTrial.instanceId, secondTrial.instanceId],
          visibleInstanceIds: [firstTrial.instanceId, secondTrial.instanceId, filler.instanceId],
          visibleCards: [firstTrial, secondTrial, filler].map(({ instanceId, cardId }) => ({ instanceId, cardId })),
          min: 1,
          max: 1,
          timing: "OnDeletion",
          effectText: onDeletion,
        },
      },
    };
  }
  const descriptions: Record<string, string> = {
    accepted:
      "Q3402: Azulongmon apenas colocou Trial na área de batalha; o Main e o Draw 1 da Option não foram ativados, e o baralho ficou intacto.",
    declined: "A colocação opcional de Trial por Azulongmon foi recusada; as cartas permaneceram na mão.",
    "trial-in-play": "Já havia Trial na área de batalha; Azulongmon não abriu uma ação On Deletion impossível.",
    "no-trial-hand": "Não havia Trial na mão; Azulongmon não abriu uma escolha impossível.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "EX3-025",
        effectKey: `EX3-025/${mode}`,
        description: `${descriptions[mode]} ${onDeletion}`,
        timing: "OnDeletion",
      },
    ],
  };
}

function slayerdramonDemo(effect: string | null): CardEffectsFixture {
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
          kind: "effectResolved",
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
          kind: "effectResolved",
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
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "EX3-024",
        effectKey: `EX3-024/${mode}`,
        description: `${description} ${startMain}`,
        timing: "StartOfOpponentsMainPhase",
      },
    ],
  };
}

function wingdramonDemo(effect: string | null): CardEffectsFixture {
  const endTurn =
    "[End of Your Turn] This Digimon and 1 of your other Digimon with [Dramon] in its name may DNA digivolve into a Digimon card in your hand by paying its DNA digivolve cost.";
  const inherited =
    "[All Turns] While this Digimon has [Dramon] or [Examon] in its name, it gains ＜Evade＞. (When this Digimon would be deleted, you may suspend it to prevent that deletion.)";
  const mode = effect ?? "end-turn";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = mode === "treat-opponent" ? 1 : 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "wingdramon-opponent");
  const wing = permanent("demo-wingdramon", "EX3-020", 0, 7000, [
    { instanceId: "demo-wing-coredramon", cardId: "EX3-018" },
  ]);
  const firstPartner = permanent("demo-wing-first-partner", "BT20-044", 0, 12000);
  const secondPartner = permanent("demo-wing-second-partner", "EX3-024", 0, 12000);
  const incompatibleDramon = permanent("demo-wing-incompatible", "EX3-021", 0, 7000);
  const unrelated = permanent("demo-wing-unrelated", "BT1-032", 0, 5000);
  const firstExamon = card("demo-wing-examon-one", "EX3-074", 0);
  const secondExamon = card("demo-wing-examon-two", "EX3-074", 0);
  const incompatibleDna = card("demo-wing-incompatible-dna", "EX3-063", 0);
  const normalEvolution = card("demo-wing-normal-evolution", "EX3-024", 0);

  if (mode === "resolved") {
    const examon = permanent("demo-wing-resolved-examon", "EX3-074", 0, 15000, [
      wing.topCard,
      ...wing.stack,
      firstPartner.topCard,
    ]);
    you.battleArea.push(examon);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "EX3-020",
          effectKey: "EX3-020/resolved",
          description:
            "Wingdramon tratou-se como nível 6 para Examon, escolheu Breakdramon e os dois DNA digievoluíram em Examon no fim do turno.",
          timing: "EndOfYourTurn",
        },
      ],
    };
  }

  if (
    [
      "evade",
      "evade-declined",
      "evade-disabled",
      "inherited-evade",
      "inherited-negative",
      "inherited-disabled",
    ].includes(mode)
  ) {
    const inheritedMode = mode.startsWith("inherited");
    const eligible = mode !== "inherited-negative";
    const host = inheritedMode
      ? permanent("demo-wing-inherited-host", eligible ? "EX3-019" : "BT1-038", 0, eligible ? 6000 : 7000, [
          { instanceId: "demo-wing-inherited-source", cardId: "EX3-020" },
        ])
      : wing;
    host.isSuspended = mode === "evade" || mode === "inherited-evade" || mode.endsWith("disabled");
    if (eligible) host.grantedKeywords.push("Evade");
    if (!mode.includes("declined") && !mode.endsWith("disabled")) you.battleArea.push(host);
    else you.trash.push(host.topCard, ...host.stack);
    state.players.push(you, opponent);
    const descriptions: Record<string, string> = {
      evade: "Wingdramon aceitou Evade, suspendeu-se e evitou a deleção por efeito.",
      "evade-declined": "Wingdramon recusou Evade e foi enviado ao lixo pela deleção.",
      "evade-disabled": "Wingdramon já estava suspenso; Evade ficou indisponível e não evitou a deleção.",
      "inherited-evade": "Paledramon tem Dramon no nome, recebeu Evade herdado de Wingdramon e evitou a deleção.",
      "inherited-negative": "O host não tem Dramon nem Examon no nome; não recebeu Evade herdado de Wingdramon.",
      "inherited-disabled":
        "O host com Evade herdado já estava suspenso; a ação ficou indisponível e ele foi deletado.",
    };
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "EX3-020",
          effectKey: `EX3-020/${mode}`,
          description: `${descriptions[mode]} ${inheritedMode ? inherited : "＜Evade＞ (When this Digimon would be deleted, you may suspend it to prevent that deletion.)"}`,
          timing: inheritedMode ? "AllTurns" : "Static",
        },
      ],
    };
  }

  you.battleArea.push(wing, firstPartner, secondPartner, incompatibleDramon, unrelated);
  you.hand.push(firstExamon, secondExamon, incompatibleDna, normalEvolution);
  you.handCount = you.hand.length;
  state.players.push(you, opponent);
  if (mode === "partner") {
    return {
      state,
      decision: {
        decisionId: "demo-wing-partner",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Escolha 1 dos seus outros Digimon com Dramon no nome que forme uma DNA válida com Wingdramon.",
        sourceCardId: "EX3-020",
        options: {
          candidateInstanceIds: [firstPartner.permanentId, secondPartner.permanentId],
          visibleInstanceIds: [
            firstPartner.permanentId,
            secondPartner.permanentId,
            incompatibleDramon.permanentId,
            unrelated.permanentId,
          ],
          min: 1,
          max: 1,
          timing: "EndOfYourTurn",
          effectText: endTurn,
        },
      },
    };
  }
  if (mode === "result") {
    return {
      state,
      decision: {
        decisionId: "demo-wing-result",
        seat: 0,
        kind: "selectCards",
        promptText: "Escolha 1 Examon compatível da sua mão para a DNA Digivolution.",
        sourceCardId: "EX3-020",
        options: {
          candidateInstanceIds: [firstExamon.instanceId, secondExamon.instanceId],
          visibleInstanceIds: you.hand.map(({ instanceId }) => instanceId),
          min: 1,
          max: 1,
          timing: "EndOfYourTurn",
          effectText: endTurn,
        },
      },
    };
  }
  const descriptions: Record<string, string> = {
    declined: "A DNA Digivolution opcional de fim de turno foi recusada; os materiais e a mão não mudaram.",
    "no-legal": "Não havia resultado de DNA compatível na mão, então nenhuma ação opcional impossível foi aberta.",
    treat: "No próprio turno, Examon na mão pôde tratar Wingdramon como nível 6 somente para DNA Digivolution.",
    "treat-opponent": "No turno do oponente, Wingdramon não foi tratado como nível 6 para Examon.",
    "normal-negative": "Treat as level 6 não permite uma evolução normal; Slayerdramon permaneceu na mão.",
  };
  if (descriptions[mode]) {
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "EX3-020",
          effectKey: `EX3-020/${mode}`,
          description: `${descriptions[mode]} ${endTurn}`,
          timing: mode.startsWith("treat") || mode === "normal-negative" ? "YourTurn" : "EndOfYourTurn",
        },
      ],
    };
  }
  return {
    state,
    decision: {
      decisionId: "demo-wing-end-turn",
      seat: 0,
      kind: "optional",
      promptText: "DNA digievoluir Wingdramon e outro Dramon no fim do seu turno?",
      sourceCardId: "EX3-020",
      options: { timing: "EndOfYourTurn", effectText: endTurn },
    },
  };
}

function crysPaledramonDemo(effect: string | null): CardEffectsFixture {
  const effectText =
    "[When Digivolving] Trash any 2 digivolution cards under 1 of your opponent's Digimon. Then, 1 of your opponent's Digimon with no digivolution cards can't attack or block until the end of your opponent's turn.";
  const mode = effect ?? "host";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = mode === "expired" ? 10 : 8;
  state.turnSeat = mode === "opponent-turn" || mode === "expired" ? 1 : 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "cryspaledramon-opponent");
  const crys = permanent("demo-crys", "EX3-021", 0, 7000, [{ instanceId: "demo-crys-base", cardId: "BT1-032" }]);
  const sourceHost = permanent("demo-crys-source-host", "BT1-033", 1, 6000, [
    { instanceId: "demo-crys-bottom", cardId: "BT1-003" },
    { instanceId: "demo-crys-lower-middle", cardId: "BT1-029" },
    { instanceId: "demo-crys-upper-middle", cardId: "BT1-030" },
    { instanceId: "demo-crys-top", cardId: "BT1-031" },
  ]);
  const shortHost = permanent("demo-crys-short-host", "EX3-020", 1, 7000, [
    { instanceId: "demo-crys-only-source", cardId: "EX3-018" },
  ]);
  const emptyTarget = permanent("demo-crys-empty-target", "BT1-032", 1, 5000);
  const otherEmptyTarget = permanent("demo-crys-other-empty", "ST18-07", 1, 5000);
  you.battleArea.push(crys);
  opponent.battleArea.push(sourceHost, shortHost, emptyTarget, otherEmptyTarget);
  state.players.push(you, opponent);

  if (mode === "host") {
    return {
      state,
      decision: {
        decisionId: "demo-crys-host",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Escolha 1 Digimon do oponente que tenha fontes para remover até 2 delas.",
        sourceCardId: "EX3-021",
        options: {
          candidateInstanceIds: [sourceHost.permanentId, shortHost.permanentId],
          visibleInstanceIds: opponent.battleArea.map(({ permanentId }) => permanentId),
          min: 1,
          max: 1,
          timing: "WhenDigivolving",
          effectText,
        },
      },
    };
  }
  if (mode === "sources") {
    return {
      state,
      decision: {
        decisionId: "demo-crys-sources",
        seat: 0,
        kind: "selectCards",
        promptText: "Escolha quaisquer 2 fontes desse Digimon para enviar ao lixo; elas não precisam ser adjacentes.",
        sourceCardId: "EX3-021",
        options: {
          candidateInstanceIds: sourceHost.stack.map(({ instanceId }) => instanceId),
          visibleInstanceIds: sourceHost.stack.map(({ instanceId }) => instanceId),
          min: 2,
          max: 2,
          timing: "WhenDigivolving",
          effectText,
        },
      },
    };
  }
  if (mode === "restriction") {
    sourceHost.stack.splice(1, 1);
    sourceHost.stack.splice(2, 1);
    return {
      state,
      decision: {
        decisionId: "demo-crys-restriction",
        seat: 0,
        kind: "chooseTargets",
        promptText:
          "Agora escolha 1 Digimon adversário sem fontes. Os alvos foram reavaliados depois que as 2 fontes foram removidas.",
        sourceCardId: "EX3-021",
        options: {
          candidateInstanceIds: [emptyTarget.permanentId, otherEmptyTarget.permanentId],
          visibleInstanceIds: opponent.battleArea.map(({ permanentId }) => permanentId),
          min: 1,
          max: 1,
          timing: "WhenDigivolving",
          effectText,
        },
      },
    };
  }
  if (mode === "short-restriction") {
    shortHost.stack.splice(0, 1);
    return {
      state,
      decision: {
        decisionId: "demo-crys-short-restriction",
        seat: 0,
        kind: "chooseTargets",
        promptText:
          "Apenas 1 fonte existia e foi removida. Escolha esse Digimon agora vazio ou outro Digimon sem fontes para restringir.",
        sourceCardId: "EX3-021",
        options: {
          candidateInstanceIds: [shortHost.permanentId, emptyTarget.permanentId, otherEmptyTarget.permanentId],
          visibleInstanceIds: opponent.battleArea.map(({ permanentId }) => permanentId),
          min: 1,
          max: 1,
          timing: "WhenDigivolving",
          effectText,
        },
      },
    };
  }

  let description: string;
  if (mode === "resolved") {
    const removed = [sourceHost.stack[1]!, sourceHost.stack[3]!];
    sourceHost.stack.splice(3, 1);
    sourceHost.stack.splice(1, 1);
    opponent.trash.push(...removed);
    description =
      "CrysPaledramon removeu 2 fontes não adjacentes; Paledramon, escolhido depois da remoção, não pode atacar nem bloquear até o fim do turno do oponente.";
  } else if (mode === "short-source") {
    const removed = shortHost.stack.pop()!;
    opponent.trash.push(removed);
    description =
      "Havia apenas 1 fonte, então CrysPaledramon fez o máximo possível e removeu essa carta; Wingdramon agora vazio pôde ser o segundo alvo (Q3392).";
  } else if (mode === "no-sources")
    description =
      "Nenhum Digimon adversário tinha fontes: a primeira etapa foi ignorada, mas o efeito Then ainda restringiu Paledramon.";
  else if (mode === "combat") {
    otherEmptyTarget.isSuspended = false;
    description =
      "O Digimon restringido não apareceu na janela de Blocker e não pôde declarar ataque enquanto a restrição estava ativa.";
  } else if (mode === "opponent-turn")
    description = "Durante todo o turno do oponente, Paledramon continuou sem poder atacar ou bloquear.";
  else
    description =
      "Ao terminar o turno do oponente, as restrições de ataque e bloqueio expiraram; Paledramon voltou a poder agir.";
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "EX3-021",
        effectKey: `EX3-021/${mode}`,
        description: `${description} ${effectText}`,
        timing: "WhenDigivolving",
      },
    ],
  };
}

function megaSeadramonDemo(effect: string | null): CardEffectsFixture {
  const main =
    "[When Attacking] You may play 1 blue level 3 Digimon card from 1 of your blue Digimon's digivolution cards without paying its memory cost.";
  const inherited =
    "[When Attacking][Once Per Turn] You may play 1 blue level 3 Digimon card from 1 of your blue Digimon's digivolution cards without paying its memory cost.";
  const mode = effect ?? "attack";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = mode === "reset" ? 9 : 8;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "megaseadramon-opponent");
  const mega = permanent("demo-megaseadramon", "EX3-022", 0, 7000);
  mega.isSuspended = true;
  const blueHost = permanent("demo-megaseadramon-blue-host", "BT1-033", 0, 6000, [
    { instanceId: "demo-mega-first-blue-three", cardId: "BT1-029" },
    { instanceId: "demo-mega-invalid-blue-four", cardId: "EX3-019" },
    { instanceId: "demo-mega-second-blue-three", cardId: "BT1-030" },
    { instanceId: "demo-mega-invalid-red-three", cardId: "BT1-009" },
  ]);
  const redHost = permanent("demo-megaseadramon-red-host", "BT1-010", 0, 3000, [
    { instanceId: "demo-mega-blue-under-red", cardId: "BT1-031" },
  ]);
  const inheritedHost = permanent("demo-megaseadramon-inherited-host", "BT1-033", 0, 6000, [
    { instanceId: "demo-mega-inherited-source", cardId: "EX3-022" },
  ]);
  if (["inherited", "inherited-opt", "reset", "two-copies", "hand-negative", "other-attacker"].includes(mode)) {
    inheritedHost.isSuspended = true;
    if (mode === "two-copies") inheritedHost.stack.push(card("demo-mega-second-inherited-source", "EX3-022", 0));
    you.battleArea.push(inheritedHost, blueHost, redHost);
  } else you.battleArea.push(mega, blueHost, redHost);
  state.players.push(you, opponent);

  if (mode === "attack" || mode === "optional") {
    return {
      state,
      decision: {
        decisionId: "demo-megaseadramon-optional",
        seat: 0,
        kind: "optional",
        promptText:
          "MegaSeadramon atacou. Jogar gratuitamente 1 Digimon azul de nível 3 das fontes de um Digimon azul?",
        sourceCardId: "EX3-022",
        options: { timing: "WhenAttacking", effectText: main },
      },
    };
  }
  if (mode === "source-choice") {
    return {
      state,
      decision: {
        decisionId: "demo-megaseadramon-source-choice",
        seat: 0,
        kind: "selectCards",
        promptText: "Escolha 1 Digimon azul de nível 3 das fontes de um dos seus Digimon azuis para jogar sem custo.",
        sourceCardId: "EX3-022",
        options: {
          candidateInstanceIds: ["demo-mega-first-blue-three", "demo-mega-second-blue-three"],
          visibleInstanceIds: [...blueHost.stack, ...redHost.stack].map(({ instanceId }) => instanceId),
          min: 1,
          max: 1,
          timing: "WhenAttacking",
          effectText: main,
        },
      },
    };
  }

  let description: string;
  if (mode === "resolved") {
    const played = blueHost.stack.find(({ instanceId }) => instanceId === "demo-mega-first-blue-three")!;
    blueHost.stack.splice(blueHost.stack.indexOf(played), 1);
    you.battleArea.push(permanent("demo-mega-played", played.cardId, 0, 2000));
    description = "MegaSeadramon atacou e jogou Gabumon das fontes como um novo Digimon, sem pagar custo.";
  } else if (mode === "declined")
    description = "MegaSeadramon atacou, mas a ação opcional foi recusada; todas as fontes permaneceram no lugar.";
  else if (mode === "main-second-attack")
    description =
      "MegaSeadramon realizou um segundo ataque no mesmo turno e seu efeito principal, que não é Once Per Turn, ofereceu outro play.";
  else if (mode === "inherited")
    description = "No primeiro ataque, o efeito herdado de MegaSeadramon jogou 1 Digimon azul de nível 3 das fontes.";
  else if (mode === "inherited-opt")
    description =
      "No segundo ataque do turno, o efeito herdado de MegaSeadramon já estava usado e não abriu outra escolha.";
  else if (mode === "reset")
    description = "No turno seguinte, o Once Per Turn herdado de MegaSeadramon foi renovado e pôde ativar novamente.";
  else if (mode === "two-copies")
    description =
      "Duas cópias herdadas de MegaSeadramon ativaram no primeiro ataque e jogaram duas fontes; ambas ficaram usadas até o fim do turno.";
  else if (mode === "hand-negative")
    description = "Um Digimon jogado da mão não altera nem aciona o efeito de ataque herdado de MegaSeadramon.";
  else
    description =
      "Outro Digimon atacou; o efeito herdado só pertence ao Digimon cuja pilha contém MegaSeadramon e não ativou.";
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "EX3-022",
        effectKey: `EX3-022/${mode}`,
        description: `${description} ${mode.startsWith("inherited") || ["reset", "two-copies", "hand-negative", "other-attacker"].includes(mode) ? inherited : main}`,
        timing: "WhenAttacking",
      },
    ],
  };
}

function plesiomonDemo(effect: string | null): CardEffectsFixture {
  const whenDigivolving =
    "[When Digivolving] You may play 1 blue level 3 Digimon card or 1 level 4 or lower Digimon card with [Aqua] or [Sea Animal] in one of its traits from one of your blue Digimon's digivolution cards without paying its memory cost. Then, you may place 1 blue Digimon card from your hand under this Digimon as its bottom digivolution card.";
  const inherited =
    "[All Turns][Once Per Turn] When you play a Digimon from digivolution cards, you may return 1 of your opponent's Digimon of the same level to the bottom of its owner's deck.";
  const mode = effect ?? "play-optional";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "plesiomon-opponent");
  const plesiomon = permanent("demo-plesiomon", "EX3-023", 0, 11000, [
    { instanceId: "demo-plesiomon-base", cardId: "BT10-022" },
  ]);
  const sourceHost = permanent("demo-plesiomon-blue-host", "BT1-033", 0, 6000, [
    { instanceId: "demo-plesiomon-blue-level-three", cardId: "BT1-029" },
    { instanceId: "demo-plesiomon-sea-animal", cardId: "BT14-008" },
    { instanceId: "demo-plesiomon-invalid-blue-four", cardId: "EX3-019" },
    { instanceId: "demo-plesiomon-invalid-level-five", cardId: "BT2-029" },
  ]);
  const redHost = permanent("demo-plesiomon-red-host", "BT1-010", 0, 3000, [
    { instanceId: "demo-plesiomon-blue-under-red", cardId: "BT1-030" },
  ]);
  const firstBlue = card("demo-plesiomon-hand-blue-one", "BT1-030", 0);
  const secondBlue = card("demo-plesiomon-hand-blue-two", "BT1-031", 0);
  const invalidRed = card("demo-plesiomon-hand-red", "BT1-009", 0);
  const sameLevel = permanent("demo-plesiomon-opponent-level-three", "BT1-031", 1, 3000);
  const otherLevel = permanent("demo-plesiomon-opponent-level-four", "BT1-033", 1, 6000);
  you.battleArea.push(plesiomon, sourceHost, redHost);
  you.hand.push(firstBlue, secondBlue, invalidRed);
  you.handCount = you.hand.length;
  opponent.battleArea.push(sameLevel, otherLevel);
  state.players.push(you, opponent);

  if (mode === "play-optional" || mode === "place-optional") {
    return {
      state,
      decision: {
        decisionId: `demo-plesiomon-${mode}`,
        seat: 0,
        kind: "optional",
        promptText:
          mode === "play-optional"
            ? "Jogar gratuitamente 1 Digimon elegível das fontes de um dos seus Digimon azuis?"
            : "Colocar 1 Digimon azul da sua mão sob Plesiomon como a fonte de baixo? Esta segunda escolha é independente da primeira.",
        sourceCardId: "EX3-023",
        options: { timing: "WhenDigivolving", effectText: whenDigivolving },
      },
    };
  }
  if (mode === "source-choice") {
    const visible = [...sourceHost.stack, ...redHost.stack].map(({ instanceId }) => instanceId);
    return {
      state,
      decision: {
        decisionId: "demo-plesiomon-source-choice",
        seat: 0,
        kind: "selectCards",
        promptText: "Escolha 1 Digimon elegível das fontes de um dos seus Digimon azuis para jogar sem custo.",
        sourceCardId: "EX3-023",
        options: {
          candidateInstanceIds: ["demo-plesiomon-blue-level-three", "demo-plesiomon-sea-animal"],
          visibleInstanceIds: visible,
          min: 1,
          max: 1,
          timing: "WhenDigivolving",
          effectText: whenDigivolving,
        },
      },
    };
  }
  if (mode === "place-choice") {
    return {
      state,
      decision: {
        decisionId: "demo-plesiomon-place-choice",
        seat: 0,
        kind: "selectCards",
        promptText: "Escolha 1 Digimon azul da sua mão para colocar como a fonte de baixo de Plesiomon.",
        sourceCardId: "EX3-023",
        options: {
          candidateInstanceIds: [firstBlue.instanceId, secondBlue.instanceId],
          visibleInstanceIds: [firstBlue.instanceId, secondBlue.instanceId, invalidRed.instanceId],
          min: 1,
          max: 1,
          timing: "WhenDigivolving",
          effectText: whenDigivolving,
        },
      },
    };
  }
  if (mode === "inherited-target") {
    return {
      state,
      decision: {
        decisionId: "demo-plesiomon-inherited-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Devolver ao fundo do baralho 1 Digimon adversário de nível 3, igual ao Digimon jogado das fontes?",
        sourceCardId: "EX3-023",
        options: {
          candidateInstanceIds: [sameLevel.permanentId],
          visibleInstanceIds: [sameLevel.permanentId, otherLevel.permanentId],
          min: 0,
          max: 1,
          timing: "AllTurns",
          effectText: inherited,
        },
      },
    };
  }

  let description: string;
  if (mode === "resolved") {
    const playedIndex = sourceHost.stack.findIndex(({ instanceId }) => instanceId === "demo-plesiomon-sea-animal");
    sourceHost.stack.splice(playedIndex, 1);
    you.battleArea.push(permanent("demo-plesiomon-played", "BT14-008", 0, 3000));
    plesiomon.stack.unshift(firstBlue);
    you.hand.splice(0, you.hand.length, secondBlue, invalidRed);
    you.handCount = 2;
    description =
      "Plesiomon jogou o Sea Animal elegível das fontes e depois colocou Gomamon da mão como sua fonte de baixo; as duas ações opcionais resolveram em sequência.";
  } else if (mode === "declined-play-place") {
    plesiomon.stack.unshift(firstBlue);
    you.hand.splice(0, you.hand.length, secondBlue, invalidRed);
    you.handCount = 2;
    description =
      "A primeira ação opcional foi recusada, mas a segunda continuou independente e colocou Gomamon da mão sob Plesiomon.";
  } else if (mode === "inherited-resolved") {
    opponent.battleArea.splice(0, opponent.battleArea.length, otherLevel);
    description =
      "O efeito herdado de Plesiomon devolveu apenas o Digimon de nível 3, igual ao Digimon jogado das fontes, ao fundo do baralho adversário.";
  } else if (mode === "inherited-opt")
    description =
      "O efeito herdado de Plesiomon já foi usado neste turno; o segundo Digimon jogado das fontes não abriu outra escolha.";
  else if (mode === "q2109")
    description =
      "Q2109: Plesiomon foi colocado como fonte depois que o Digimon já havia sido jogado; o efeito herdado não ativou retroativamente.";
  else if (mode === "hand-negative")
    description = "Um Digimon jogado da mão não acionou o efeito herdado de Plesiomon, que exige origem nas fontes.";
  else if (mode === "no-same-level")
    description =
      "Nenhum Digimon adversário tinha o mesmo nível do Digimon jogado das fontes; nenhuma escolha foi aberta.";
  else
    description =
      "Duas cópias herdadas observaram o mesmo evento; cada uma manteve sua própria marca de Once Per Turn e resolveu separadamente.";
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "EX3-023",
        effectKey: `EX3-023/${mode}`,
        description: `${description} ${mode.startsWith("inherited") || ["q2109", "hand-negative", "no-same-level", "two-copies"].includes(mode) ? inherited : whenDigivolving}`,
        timing: mode.startsWith("inherited") ? "AllTurns" : "WhenDigivolving",
      },
    ],
  };
}

function aeroVeedramonDemo(effect: string | null): CardEffectsFixture {
  const whenDigivolving =
    "[When Digivolving] If you don't have a [Trial of the Four Great Dragons] in play, you may place 1 [Trial of the Four Great Dragons] from your hand in your battle area.";
  const ownBlocker =
    "[Opponent's Turn] While you have a Digimon with [Four Great Dragons] in its traits in play, or [Trial of the Four Great Dragons] is in your battle area, this Digimon gains ＜Blocker＞.";
  const inherited = "[Opponent's Turn] All of your Digimon with [Four Great Dragons] in their traits gain ＜Blocker＞.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = ["self-dragon", "self-trial", "blocker", "inherited", "inherited-blocker"].includes(effect ?? "")
    ? 1
    : 0;
  state.memory = 1;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "aeroveedramon-opponent");
  const firstTrial = card("demo-aeroveedramon-trial-one", "EX3-069", 0);
  const secondTrial = card("demo-aeroveedramon-trial-two", "EX3-069", 0);
  const filler = card("demo-aeroveedramon-filler", "BT1-010", 0);
  const aero = permanent("demo-aeroveedramon", "EX3-033", 0, 7000, [
    { instanceId: "demo-aeroveedramon-base", cardId: "EX3-031" },
  ]);

  if (["self-dragon", "self-trial", "self-negative", "blocker"].includes(effect ?? "")) {
    if (effect === "self-dragon") you.battleArea.push(permanent("demo-aero-goldramon", "EX3-035", 0, 11000));
    if (effect === "self-trial") you.battleArea.push(permanent("demo-aero-trial", "EX3-069", 0, 0));
    if (effect !== "self-negative") aero.grantedKeywords.push("Blocker");
    you.battleArea.unshift(aero);
    if (effect === "blocker") {
      const attacker = permanent("demo-aero-attacker", "BT1-028", 1, 2000);
      attacker.isSuspended = true;
      opponent.battleArea.push(attacker);
    }
    state.players.push(you, opponent);
    if (effect === "blocker") {
      return {
        state,
        events: [
          {
            kind: "blockWindowOpened",
            attackerPermanentId: "demo-aero-attacker",
            eligibleBlockerIds: [aero.permanentId],
          },
        ],
      };
    }
    const enabledBy = effect === "self-dragon" ? "Goldramon, um Four Great Dragons" : "Trial of the Four Great Dragons";
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "EX3-033",
          effectKey: `EX3-033/${effect}`,
          description:
            effect === "self-negative"
              ? `No próprio turno e sem Four Great Dragons ou Trial, AeroVeedramon não recebeu Blocker. ${ownBlocker}`
              : `${enabledBy} está em jogo no turno do oponente; AeroVeedramon recebeu Blocker. ${ownBlocker}`,
          timing: "OpponentsTurn",
        },
      ],
    };
  }

  if (["inherited", "inherited-negative", "inherited-blocker"].includes(effect ?? "")) {
    const host = permanent("demo-aero-inherited-host", "BT1-053", 0, 6000, [
      { instanceId: "demo-aero-inherited-source", cardId: "EX3-033" },
    ]);
    const goldramon = permanent("demo-aero-inherited-goldramon", "EX3-035", 0, 11000);
    const magnadramon = permanent("demo-aero-inherited-magnadramon", "EX3-036", 0, 12000);
    const unrelated = permanent("demo-aero-inherited-unrelated", "BT1-010", 0, 3000);
    if (effect === "inherited" || effect === "inherited-blocker") {
      goldramon.grantedKeywords.push("Blocker");
      magnadramon.grantedKeywords.push("Blocker");
    }
    if (effect === "inherited-blocker") {
      const attacker = permanent("demo-aero-inherited-attacker", "EX3-035", 1, 11000);
      attacker.isSuspended = true;
      you.battleArea.push(host, magnadramon, unrelated);
      opponent.battleArea.push(attacker);
      state.players.push(you, opponent);
      return {
        state,
        events: [
          {
            kind: "effectResolved",
            seat: 0,
            sourceCardId: "EX3-033",
            effectKey: "EX3-033/inherited-blocker",
            description: `O efeito herdado de AeroVeedramon deu Blocker somente a Magnadramon, o Four Great Dragons aliado. ${inherited}`,
            timing: "OpponentsTurn",
          },
          {
            kind: "blockWindowOpened",
            attackerPermanentId: attacker.permanentId,
            eligibleBlockerIds: [magnadramon.permanentId],
          },
        ],
      };
    }
    you.battleArea.push(host, goldramon, magnadramon, unrelated);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "EX3-033",
          effectKey: `EX3-033/${effect}`,
          description:
            effect === "inherited"
              ? `No turno do oponente, o efeito herdado de AeroVeedramon deu Blocker a Goldramon e Magnadramon; o host e Agumon não são Four Great Dragons. ${inherited}`
              : `No próprio turno, o efeito herdado de AeroVeedramon não deu Blocker aos Four Great Dragons. ${inherited}`,
          timing: "OpponentsTurn",
        },
      ],
    };
  }

  you.battleArea.push(aero);
  if (effect === "accepted") {
    const placed = permanent("demo-aero-accepted-trial", "EX3-069", 0, 0);
    placed.topCard.instanceId = firstTrial.instanceId;
    you.battleArea.push(placed);
    you.hand.push(secondTrial, filler);
  } else if (effect === "existing-trial") {
    you.battleArea.push(permanent("demo-aero-existing-trial", "EX3-069", 0, 0));
    you.hand.push(firstTrial);
  } else if (effect !== "no-trial-hand") {
    you.hand.push(firstTrial, secondTrial, filler);
  } else {
    you.hand.push(filler);
  }
  you.handCount = you.hand.length;
  state.players.push(you, opponent);

  if (["accepted", "declined", "existing-trial", "no-trial-hand"].includes(effect ?? "")) {
    const descriptions: Record<string, string> = {
      accepted:
        "AeroVeedramon colocou 1 Trial of the Four Great Dragons na área de batalha sem jogar a Option, ativar Main ou comprar uma carta.",
      declined: "A colocação opcional foi recusada; as duas cópias de Trial permaneceram na mão.",
      "existing-trial":
        "Já havia uma Trial of the Four Great Dragons em jogo; AeroVeedramon não abriu a ação opcional.",
      "no-trial-hand": "Não havia Trial of the Four Great Dragons na mão; AeroVeedramon não abriu uma ação impossível.",
    };
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "EX3-033",
          effectKey: `EX3-033/${effect}`,
          description: `${descriptions[effect!]} ${whenDigivolving}`,
          timing: "WhenDigivolving",
        },
      ],
    };
  }
  if (effect === "trial-choice") {
    return {
      state,
      decision: {
        decisionId: "demo-aeroveedramon-trial-choice",
        seat: 0,
        kind: "selectCards",
        promptText: "Escolha 1 Trial of the Four Great Dragons para colocar na área de batalha",
        sourceCardId: "EX3-033",
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
      decisionId: "demo-aeroveedramon-optional",
      seat: 0,
      kind: "optional",
      promptText: "Colocar 1 Trial of the Four Great Dragons da mão na área de batalha?",
      sourceCardId: "EX3-033",
      options: { timing: "WhenDigivolving", effectText: whenDigivolving },
    },
  };
}

function dracomonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const onPlay =
    "[On Play] Reveal the top 4 cards of your deck. Add 1 green or blue card with [Dramon] in its name and 1 card with [Examon] in its name among them to your hand. Place the rest at the bottom of your deck in any order.";
  const inherited =
    "[All Turns][Once Per Turn] When one of your Digimon with [Dramon] or [Examon] in its name becomes suspended, this Digimon gets +1000 DP for the turn.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "dracomon-opponent");

  if (effect === "inherited" || effect === "inherited-negative" || effect === "inherited-opt") {
    const active = effect !== "inherited-negative";
    const host = permanent("demo-dracomon-host", "EX3-020", 0, 7000, [
      { instanceId: "demo-dracomon-source", cardId: "EX3-037" },
    ]);
    const firstSuspended = permanent(
      "demo-dracomon-trigger-one",
      active ? "EX3-074" : "BT1-028",
      0,
      active ? 15000 : 2000,
    );
    firstSuspended.isSuspended = true;
    you.battleArea.push(host, firstSuspended);
    if (effect === "inherited-opt") {
      const secondSuspended = permanent("demo-dracomon-trigger-two", "EX3-041", 0, 7000);
      secondSuspended.isSuspended = true;
      you.battleArea.push(secondSuspended);
    }
    if (active) host.currentDP = 8000;
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "EX3-037",
          effectKey: "EX3-037/inherited-dp",
          description:
            effect === "inherited-negative"
              ? `Elecmon não tem Dramon nem Examon no nome; Dracomon não concedeu +1000 DP. ${inherited}`
              : effect === "inherited-opt"
                ? `Dois Digimon elegíveis foram suspensos, mas o efeito Once Per Turn de Dracomon concedeu apenas +1000 DP. ${inherited}`
                : `Examon foi suspenso e o efeito herdado de Dracomon concedeu +1000 DP a Wingdramon. ${inherited}`,
          timing: "AllTurns",
        },
      ],
    };
  }

  const dracomon = permanent("demo-dracomon-on-play", "EX3-037", 0, 2000);
  you.battleArea.push(dracomon);
  const revealed = [
    { instanceId: "demo-dracomon-dramon", cardId: "EX3-020" },
    { instanceId: "demo-dracomon-examon", cardId: "EX3-074" },
    { instanceId: "demo-dracomon-filler-one", cardId: "BT1-010" },
    { instanceId: "demo-dracomon-filler-two", cardId: "BT1-029" },
  ];

  if (effect === "resolved") {
    you.hand.push(card(revealed[0]!.instanceId, revealed[0]!.cardId, 0));
    you.hand.push(card(revealed[1]!.instanceId, revealed[1]!.cardId, 0));
    you.handCount = 2;
    you.deck.push(card(revealed[2]!.instanceId, revealed[2]!.cardId, 0));
    you.deck.push(card(revealed[3]!.instanceId, revealed[3]!.cardId, 0));
    you.deckCount = 34;
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "EX3-037",
          effectKey: "EX3-037/on-play-reveal",
          description: "Dracomon adicionou Wingdramon e Examon à mão e colocou o restante no fundo do baralho.",
          timing: "OnPlay",
        },
        {
          kind: "cardsMoved",
          instanceIds: revealed.slice(0, 2).map(({ instanceId }) => instanceId),
          from: "deck",
          to: "hand",
        },
      ],
    };
  }

  const noDramon = effect === "no-dramon";
  const noExamon = effect === "no-examon";
  const noCategories = effect === "no-categories";
  if (noDramon) revealed[0] = { instanceId: "demo-dracomon-filler-zero", cardId: "BT1-011" };
  if (noExamon) revealed[1] = { instanceId: "demo-dracomon-filler-examon", cardId: "BT1-028" };
  if (noCategories) {
    revealed[0] = { instanceId: "demo-dracomon-filler-zero", cardId: "BT1-011" };
    revealed[1] = { instanceId: "demo-dracomon-filler-examon", cardId: "BT1-028" };
  }

  const ordering = step === "order" || noCategories;
  const choosingExamon = step === "examon" || noDramon;
  if (choosingExamon && !noDramon) you.hand.push(card(revealed[0]!.instanceId, revealed[0]!.cardId, 0));
  if (ordering && !noCategories) {
    you.hand.push(card(revealed[0]!.instanceId, revealed[0]!.cardId, 0));
    you.hand.push(card(revealed[1]!.instanceId, revealed[1]!.cardId, 0));
  }
  you.handCount = you.hand.length;
  state.players.push(you, opponent);

  if (ordering) {
    const remaining = noCategories ? revealed : revealed.slice(2);
    return {
      state,
      decision: {
        decisionId: "demo-dracomon-order",
        seat: 0,
        kind: "orderCards",
        promptText: "Escolha a ordem das cartas que irão para o fundo do baralho.",
        sourceCardId: "EX3-037",
        options: {
          candidateInstanceIds: remaining.map(({ instanceId }) => instanceId),
          visibleInstanceIds: remaining.map(({ instanceId }) => instanceId),
          visibleCards: remaining,
          min: remaining.length,
          max: remaining.length,
          orderDestination: "deckBottom",
          timing: "OnPlay",
          effectText: onPlay,
        },
      },
    };
  }

  return {
    state,
    decision: {
      decisionId: choosingExamon ? "demo-dracomon-examon" : "demo-dracomon-dramon",
      seat: 0,
      kind: "selectCards",
      promptText: choosingExamon
        ? "Escolha 1 carta com Examon no nome."
        : "Escolha 1 carta verde ou azul com Dramon no nome.",
      sourceCardId: "EX3-037",
      options: {
        candidateInstanceIds: [revealed[choosingExamon ? 1 : 0]!.instanceId],
        visibleInstanceIds: revealed.map(({ instanceId }) => instanceId),
        visibleCards: revealed,
        min: 1,
        max: 1,
        timing: "OnPlay",
        effectText: onPlay,
      },
    },
  };
}

function examonDemo(): { state: GameState; decision: DecisionRequest } {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-examon", "EX3-074", 0, 15000));
  opponent.battleArea.push(permanent("demo-elecmon", "BT1-028", 1, 2000));
  opponent.battleArea.push(permanent("demo-gabumon", "BT1-029", 1, 2000));
  you.hand.push(card("demo-slayerdramon", "EX3-024", 0));
  you.hand.push(card("demo-breakdramon", "EX3-044", 0));
  you.hand.push(card("demo-fighter-mode", "BT8-032", 0));
  you.handCount = you.hand.length;
  opponent.handCount = 5;
  state.players.push(you, opponent);

  return {
    state,
    decision: {
      decisionId: "demo-examon-when-digivolving",
      seat: 0,
      kind: "selectCards",
      promptText: "Select cards",
      sourceCardId: "EX3-074",
      options: {
        candidateInstanceIds: ["demo-slayerdramon", "demo-breakdramon", "demo-fighter-mode"],
        min: 1,
        max: 1,
        timing: "WhenDigivolving",
        effectText:
          "[When Digivolving] You may place 1 green or blue Digimon card with [Dramon] in its name from your hand under this Digimon as its bottom digivolution card.",
      },
    },
  };
}

function labramonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(
    permanent("demo-labramon-host", "BT1-052", 0, 4000, [{ instanceId: "demo-labramon-source", cardId: "BT1-049" }]),
  );
  opponent.handCount = 5;

  if (effect === "dp-zero") {
    you.hand.push(card("demo-labramon-draw", "BT1-010", 0));
    you.handCount = 1;
    state.players.push(you, opponent);
    return {
      state,
      events: [
        { kind: "cardsMoved", instanceIds: ["demo-opponent-target-top"], from: "battleArea", to: "trash" },
        { kind: "cardsMoved", instanceIds: ["demo-labramon-draw"], from: "deck", to: "hand" },
      ],
    };
  }

  opponent.battleArea.push(permanent("demo-opponent-target", "BT1-016", 1, 2000));
  state.players.push(you, opponent);
  return { state };
}

function vanillaPlayDemo(cardId: string, dp: number, playCost: number, effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "played" ? 0 : playCost;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  opponent.handCount = 5;
  if (effect === "played") {
    you.battleArea.push(permanent("demo-vanilla", cardId, 0, dp));
    state.players.push(you, opponent);
    return {
      state,
      events: [{ kind: "cardsMoved", instanceIds: ["demo-vanilla-top"], from: "hand", to: "battleArea" }],
    };
  }

  you.hand.push(card("demo-vanilla-hand", cardId, 0));
  you.handCount = 1;
  state.players.push(you, opponent);
  return { state };
}

function seasarmonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const seasarmon = permanent("demo-seasarmon", "BT1-052", 0, 4000);
  opponent.handCount = 5;
  if (effect === "security-battle") {
    seasarmon.isSuspended = true;
    you.battleArea.push(seasarmon);
    opponent.securityCount = 4;
    opponent.trash.push(card("demo-seasarmon-security", "BT1-080", 1));
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "BT1-052",
          effectKey: "BT1-052/jamming",
          description: "Jamming prevented Seasarmon from being deleted in the security battle.",
          timing: "Static",
        },
      ],
    };
  }

  you.battleArea.push(seasarmon);
  state.players.push(you, opponent);
  return { state };
}

function darcmonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const darcmon = permanent("demo-darcmon", "BT1-053", 0, 4000);
  darcmon.isSuspended = true;
  you.battleArea.push(darcmon);
  opponent.handCount = 5;
  if (effect === "effect-play-draw") {
    you.battleArea.push(permanent("demo-tinkermon", "BT1-047", 0, 3000));
    you.hand.push(card("demo-darcmon-draw", "BT1-010", 0));
    you.handCount = 1;
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "BT1-053",
          effectKey: "BT1-053/yellow-rookie-draw",
          description: "Darcmon drew 1 after Tinkermon was played by an effect.",
          timing: "YourTurn",
        },
        { kind: "cardsMoved", instanceIds: ["demo-darcmon-draw"], from: "deck", to: "hand" },
      ],
    };
  }

  state.players.push(you, opponent);
  return { state };
}

export function CardEffectsDemo({ cardId }: { cardId: string }) {
  const params = new URLSearchParams(window.location.search);
  const effect = params.get("effect");
  const step = params.get("step");
  const fixture = useMemo<CardEffectsFixture | undefined>(() => {
    if (cardId === "BT1-053") return darcmonDemo(effect);
    if (cardId === "BT1-052") return seasarmonDemo(effect);
    if (cardId === "BT1-051") return vanillaPlayDemo(cardId, 4000, 3, effect);
    if (cardId === "BT1-050") return vanillaPlayDemo(cardId, 4000, 3, effect);
    if (cardId === "BT1-049") return labramonDemo(effect);
    if (cardId === "EX3-074") return examonDemo();
    if (cardId === "EX3-073") return fighterModeDemo(effect);
    if (cardId === "EX3-072") return megiddoFlameDemo(effect);
    if (cardId === "EX3-071") return laserCannonDemo(effect, step);
    if (cardId === "EX3-070") return avalonsGateDemo(effect, step);
    if (cardId === "EX3-069") return trialOfTheFourGreatDragonsDemo(effect);
    if (cardId === "EX3-068") return godFlameDemo(effect, step);
    if (cardId === "EX3-067") return souraiDemo(effect, step);
    if (cardId === "EX3-066") return hyperInfinityCannonDemo(effect, step);
    if (cardId === "EX3-065") return hinaKuriharaDemo(effect, step);
    if (cardId === "EX3-064") return megidramonDemo(effect, step);
    if (cardId === "EX3-063") return imperialdramonDragonModeDemo(effect, step);
    if (cardId === "EX3-062") return warGrowlmonDemo(effect, step);
    if (cardId === "EX3-061") return dinobeemonDemo(effect, step);
    if (cardId === "EX3-060") return exTyrannomonDemo(effect);
    if (cardId === "EX3-059") return darkTyrannomonDemo();
    if (cardId === "EX3-058") return shadramonDemo(effect, step);
    if (cardId === "EX3-057") return growlmonDemo(effect, step);
    if (cardId === "EX3-056") return guilmonDemo(effect);
    if (cardId === "EX3-055") return wormmonDemo(effect, step);
    if (cardId === "EX3-054") return darkdramonDemo(effect, step);
    if (cardId === "EX3-053") return metallicdramonDemo(effect);
    if (cardId === "EX3-052") return jazarichmonDemo(effect, step);
    if (cardId === "EX3-051") return tankdramonDemo(effect, step);
    if (cardId === "EX3-050") return cyberdramonDemo(effect);
    if (cardId === "EX3-049") return sealsdramonDemo(effect);
    if (cardId === "EX3-048") return jazardmonDemo(effect, step);
    if (cardId === "EX3-047") return jazamonDemo(effect);
    if (cardId === "EX3-046") return commandramonDemo(effect);
    if (cardId === "EX3-045") return hydramonDemo(effect);
    if (cardId === "EX3-044") return breakdramonDemo(effect);
    if (cardId === "EX3-043") return entmonDemo(effect);
    if (cardId === "EX3-042") return toropiamonDemo(effect);
    if (cardId === "EX3-041") return groundramonDemo(effect, step);
    if (cardId === "EX3-040") return parasaurmonDemo(effect);
    if (cardId === "EX3-039") return coredramonDemo(effect);
    if (cardId === "EX3-038") return pomumonDemo(effect);
    if (cardId === "EX3-037") return dracomonDemo(effect, step);
    if (cardId === "EX3-036") return magnadramonDemo(effect, step);
    if (cardId === "EX3-035") return goldramonDemo(effect, step);
    if (cardId === "EX3-034") return angewomonDemo(effect);
    if (cardId === "EX3-033") return aeroVeedramonDemo(effect);
    if (cardId === "EX3-032") return majiramonDemo(effect);
    if (cardId === "EX3-031") return veedramonDemo(effect, step);
    if (cardId === "EX3-030") return gatomonDemo(effect, step);
    if (cardId === "EX3-029") return airdramonDemo(effect);
    if (cardId === "EX3-028") return patamonDemo(effect, step);
    if (cardId === "EX3-027") return agumonInheritedDemo(effect);
    if (cardId === "EX3-026") return aegisdramonDemo(effect);
    if (cardId === "EX3-025") return azulongmonDemo(effect);
    if (cardId === "EX3-024") return slayerdramonDemo(effect);
    if (cardId === "EX3-023") return plesiomonDemo(effect);
    if (cardId === "EX3-022") return megaSeadramonDemo(effect);
    if (cardId === "EX3-021") return crysPaledramonDemo(effect);
    if (cardId === "EX3-020") return wingdramonDemo(effect);
    if (cardId === "EX3-008") return flamedramonDemo(step);
    return undefined;
  }, [cardId, effect, step]);
  const [decision, setDecision] = useState<DecisionRequest | undefined>(fixture?.decision);
  const [blockWindowAcknowledged, setBlockWindowAcknowledged] = useState(false);

  if (!fixture) {
    return <main className="aegis-screen-fallback">No simulated match is registered for {cardId}. Try EX3-074.</main>;
  }

  const demoConnection: DemoConnection = {
    room: undefined,
    status: "connected",
    state: fixture.state,
    events: blockWindowAcknowledged
      ? (fixture.events ?? []).filter((event) => event.kind !== "blockWindowOpened")
      : (fixture.events ?? []),
    decision,
    acknowledgeDecision: () => setDecision(undefined),
    acknowledgeBlockWindow: () => setBlockWindowAcknowledged(true),
    error: undefined,
    sessionId: fixture.sessionId ?? "card-effects-viewer",
    roomCode: "",
  };

  return (
    <GameScreen
      joinOptions={{ displayName: "Effect tester", deck: { mainDeck: [], eggDeck: [] } }}
      identityColor="Blue"
      onExit={() => window.location.assign("/")}
      demoConnection={demoConnection}
    />
  );
}
