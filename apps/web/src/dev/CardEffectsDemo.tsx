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

function kokuwamonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "security-attack-active" ? 0 : 1;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(
    permanent("demo-kokuwamon-host", "BT1-081", 0, 11000, [{ instanceId: "demo-kokuwamon-source", cardId: "BT1-068" }]),
  );
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "security-attack-active") return { state };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-068",
        effectKey: "BT1-068/level-six-security-attack",
        description: "Kokuwamon's inherited effect grants Security Attack +1 to its level 6 host during your turn.",
        timing: "Static",
      },
    ],
  };
}

function ogremonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-ogremon", "BT1-069", 0, 4000));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "jamming") return { state };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-069",
        effectKey: "BT1-069/jamming",
        description: "Ogremon has Jamming and survives losing battles against Security Digimon.",
        timing: "Static",
      },
    ],
  };
}

function kuwagamonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = -4;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-kuwagamon", "BT1-070", 0, 4000));
  const target = permanent("demo-kuwagamon-target", "BT1-029", 1, 2000);
  target.isSuspended = effect === "suspend";
  opponent.battleArea.push(target);
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "suspend") return { state };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-070",
        effectKey: "BT1-070/suspend",
        description: "Kuwagamon's On Play effect suspends 1 opposing Digimon.",
        timing: "On Play",
      },
    ],
  };
}

function woodmonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "blocker" ? 1 : 0;
  state.memory = effect === "attacked" ? 1 : 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const woodmon = permanent("demo-woodmon", "BT1-072", 0, 6000);
  woodmon.keywords.push("Blocker");
  if (effect === "attacked") woodmon.isSuspended = true;
  you.battleArea.push(woodmon);
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === "blocker") {
    const attacker = permanent("demo-woodmon-attacker", "BT1-010", 1, 5000);
    attacker.isSuspended = true;
    opponent.battleArea.push(attacker);
    return {
      state,
      events: [
        {
          kind: "blockWindowOpened",
          attackerPermanentId: attacker.permanentId,
          eligibleBlockerIds: [woodmon.permanentId],
        },
      ],
    };
  }

  if (effect !== "attacked") return { state };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-072",
        effectKey: "BT1-072/attack-cost",
        description: "Woodmon's When Attacking effect loses 2 memory.",
        timing: "When Attacking",
      },
    ],
  };
}

function kabuterimonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "active" ? 0 : 1;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(
    permanent("demo-kabuterimon-host", "BT1-075", 0, effect === "active" ? 9000 : 7000, [
      { instanceId: "demo-kabuterimon-source", cardId: "BT1-073" },
    ]),
  );
  const targetA = permanent("demo-kabuterimon-target-a", "BT1-016", 1, 5000);
  const targetB = permanent("demo-kabuterimon-target-b", "BT1-017", 1, 6000);
  targetA.isSuspended = true;
  targetB.isSuspended = true;
  opponent.battleArea.push(targetA, targetB);
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "active") return { state };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-073",
        effectKey: "BT1-073/suspended-dp",
        description: "Kabuterimon's inherited effect gives +2000 DP for 2 suspended opposing Digimon.",
        timing: "Static",
      },
    ],
  };
}

function togemonDemo(step: string | null): CardEffectsFixture {
  const effectText =
    "[When Digivolving] Reveal 3 cards from the top of your deck. Add 1 level 5 or higher Digimon card among them to your hand. Place the remaining cards at the bottom of your deck in any order.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(
    permanent("demo-togemon", "BT1-074", 0, 5000, [{ instanceId: "demo-togemon-base", cardId: "BT1-067" }]),
  );
  opponent.handCount = 5;
  state.players.push(you, opponent);

  const revealed = [
    { instanceId: "demo-togemon-level-five", cardId: "BT1-075" },
    { instanceId: "demo-togemon-level-three", cardId: "BT1-068" },
    { instanceId: "demo-togemon-level-four", cardId: "BT1-069" },
  ];
  const ordering = step === "order";
  const decisionCards = ordering ? revealed.slice(1) : revealed;
  if (ordering) {
    you.hand.push(card(revealed[0]!.instanceId, revealed[0]!.cardId, 0));
    you.handCount = 1;
  }

  return {
    state,
    decision: {
      decisionId: ordering ? "demo-togemon-order" : "demo-togemon-select",
      seat: 0,
      kind: ordering ? "orderCards" : "selectCards",
      promptText: ordering
        ? "Choose the order for the remaining cards at the bottom of the deck."
        : "Choose 1 level 5 or higher Digimon card to add to your hand.",
      sourceCardId: "BT1-074",
      options: {
        candidateInstanceIds: ordering
          ? revealed.slice(1).map(({ instanceId }) => instanceId)
          : [revealed[0]!.instanceId],
        visibleInstanceIds: decisionCards.map(({ instanceId }) => instanceId),
        visibleCards: decisionCards,
        min: ordering ? 2 : 1,
        max: ordering ? 2 : 1,
        ...(ordering ? { orderDestination: "deckBottom" as const } : {}),
        timing: "WhenDigivolving",
        effectText,
      },
    },
  };
}

function digitamamonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "delayed-paid" ? Phase.Active : Phase.Main;
  state.turnCount = effect === "delayed-paid" ? 6 : 5;
  state.turnSeat = effect === "delayed-paid" ? 1 : 0;
  state.memory = effect === "delayed-paid" ? 6 : effect === "memory-gained" ? 3 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect !== "delayed-paid") {
    const attacker = permanent("demo-digitamamon", "BT1-075", 0, 7000);
    attacker.isSuspended = effect === "memory-gained";
    you.battleArea.push(attacker);
  } else {
    you.trash.push(card("demo-digitamamon-deleted", "BT1-075", 0));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "memory-gained" && effect !== "delayed-paid") return { state };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-075",
        effectKey: "BT1-075/memory-loan",
        description:
          effect === "memory-gained"
            ? "Digitamamon gained 3 memory when attacking."
            : "At end of turn, Digitamamon's delayed effect lost 3 memory even after it left play.",
        timing: effect === "memory-gained" ? "When Attacking" : "End of Turn",
      },
    ],
  };
}

function megaKabuterimonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "memory-gained" ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const attacker = permanent("demo-megakabuterimon-host", "BT1-074", 0, 5000, [
    { instanceId: "demo-megakabuterimon-source", cardId: "BT1-076" },
  ]);
  attacker.isSuspended = effect === "memory-gained";
  you.battleArea.push(attacker);
  const targetA = permanent("demo-megakabuterimon-target-a", "BT1-016", 1, 5000);
  const targetB = permanent("demo-megakabuterimon-target-b", "BT1-017", 1, 6000);
  targetA.isSuspended = true;
  if (effect === "memory-gained") targetB.isSuspended = true;
  opponent.battleArea.push(targetA, targetB);
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "memory-gained") return { state };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-076",
        effectKey: "BT1-076/memory",
        description: "MegaKabuterimon's inherited effect gained 1 memory with 2 suspended opposing Digimon.",
        timing: "When Attacking",
      },
    ],
  };
}

function okuwamonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "battle-win" ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const attacker = permanent("demo-okuwamon-host", "BT1-081", 0, 10000, [
    { instanceId: "demo-okuwamon-source", cardId: "BT1-077" },
  ]);
  attacker.isSuspended = effect === "battle-win";
  you.battleArea.push(attacker);
  if (effect === "battle-win") opponent.trash.push(card("demo-okuwamon-defender", "BT1-016", 1));
  else opponent.battleArea.push(permanent("demo-okuwamon-defender", "BT1-016", 1, 1000));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "battle-win") return { state };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-077",
        effectKey: "BT1-077/battle-memory",
        description: "Okuwamon's inherited effect gained 1 memory after its Digimon won the battle and survived.",
        timing: "After Battle",
      },
    ],
  };
}

function jagamonDemo(step: string | null): CardEffectsFixture {
  const effectText =
    "[When Attacking] Reveal 3 cards from the top of your deck. You can digivolve this card into 1 level 6 green Digimon card among them without paying its memory cost. Place the remaining cards at the bottom of your deck in any order.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const evolved = step === "order" || step === "resolved";
  const attacker = permanent("demo-jagamon", evolved ? "BT1-081" : "BT1-078", 0, evolved ? 11000 : 7000, [
    ...(evolved ? [{ instanceId: "demo-jagamon-source", cardId: "BT1-078" }] : []),
  ]);
  attacker.isSuspended = true;
  you.battleArea.push(attacker);
  opponent.handCount = 5;
  state.players.push(you, opponent);

  const revealed = [
    { instanceId: "demo-jagamon-green-level-six", cardId: "BT1-081" },
    { instanceId: "demo-jagamon-miss-a", cardId: "BT1-010" },
    { instanceId: "demo-jagamon-miss-b", cardId: "BT1-011" },
  ];
  if (step === "resolved") {
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "BT1-078",
          effectKey: "BT1-078/reveal-digivolve",
          description: "Jagamon digivolved into a revealed green level 6 Digimon for free and bottom-decked the rest.",
          timing: "When Attacking",
        },
      ],
    };
  }

  const ordering = step === "order";
  const decisionCards = ordering ? revealed.slice(1) : revealed;
  return {
    state,
    decision: {
      decisionId: ordering ? "demo-jagamon-order" : "demo-jagamon-select",
      seat: 0,
      kind: ordering ? "orderCards" : "selectCards",
      promptText: ordering
        ? "Choose the order for the remaining cards at the bottom of the deck."
        : "You may choose 1 green level 6 Digimon to digivolve into for free.",
      sourceCardId: "BT1-078",
      options: {
        candidateInstanceIds: ordering
          ? revealed.slice(1).map(({ instanceId }) => instanceId)
          : [revealed[0]!.instanceId],
        visibleInstanceIds: decisionCards.map(({ instanceId }) => instanceId),
        visibleCards: decisionCards,
        min: ordering ? 2 : 0,
        max: ordering ? 2 : 1,
        ...(ordering ? { orderDestination: "deckBottom" as const } : {}),
        timing: "WhenAttacking",
        effectText,
      },
    },
  };
}

function lillymonDemo(effect: string | null): CardEffectsFixture {
  const effectText = "[When Attacking] Suspend 1 of your opponent's Digimon without ＜Blocker＞.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const attacker = permanent("demo-lillymon-host", "BT1-081", 0, 10000, [
    { instanceId: "demo-lillymon-source", cardId: "BT1-079" },
  ]);
  attacker.isSuspended = true;
  you.battleArea.push(attacker);
  const eligible = permanent("demo-lillymon-eligible", "BT1-016", 1, 5000);
  const blocker = permanent("demo-lillymon-blocker", "BT1-072", 1, 6000);
  blocker.keywords.push("Blocker");
  if (effect === "resolved") eligible.isSuspended = true;
  opponent.battleArea.push(eligible, blocker);
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === "resolved") {
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "BT1-079",
          effectKey: "BT1-079/suspend",
          description: "Lillymon's inherited effect suspended the opposing Digimon without Blocker.",
          timing: "When Attacking",
        },
      ],
    };
  }

  return {
    state,
    decision: {
      decisionId: "demo-lillymon-target",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose 1 opposing Digimon without Blocker to suspend.",
      sourceCardId: "BT1-079",
      options: {
        candidateInstanceIds: [eligible.topCard.instanceId],
        visibleInstanceIds: [eligible.topCard.instanceId, blocker.topCard.instanceId],
        min: 1,
        max: 1,
        timing: "WhenAttacking",
        effectText,
      },
    },
  };
}

function herculesKabuterimonDemo(effect: string | null): CardEffectsFixture {
  const effectText = "[End of Attack][Twice Per Turn] You can unsuspend this Digimon by decreasing your memory by 3.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "turn-passed" ? Phase.Active : Phase.Main;
  state.turnCount = effect === "turn-passed" ? 6 : 5;
  state.turnSeat = effect === "turn-passed" ? 1 : 0;
  state.memory = effect === "turn-passed" ? 1 : effect === "unsuspended" ? 0 : 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const hercules = permanent("demo-hercules-kabuterimon", "BT1-081", 0, 10000);
  hercules.keywords.push("Piercing");
  hercules.isSuspended = effect !== "unsuspended" && effect !== "turn-passed";
  you.battleArea.push(hercules);
  opponent.handCount = 5;
  if (effect === "piercing") {
    opponent.securityCount = 4;
    opponent.trash.push(card("demo-hercules-defender", "BT1-016", 1));
  }
  state.players.push(you, opponent);

  if (effect === null) {
    return {
      state,
      decision: {
        decisionId: "demo-hercules-unsuspend-optional",
        seat: 0,
        kind: "optional",
        promptText: "Lose 3 memory to unsuspend HerculesKabuterimon?",
        sourceCardId: "BT1-081",
        options: { timing: "EndOfAttack", effectText },
      },
    };
  }
  if (effect === "ineligible") return { state };

  const descriptions: Record<string, string> = {
    piercing: "Piercing performed a security check after HerculesKabuterimon won the battle and survived.",
    unsuspended: "HerculesKabuterimon lost 3 memory and unsuspended at end of attack.",
    "turn-passed": "After the attack ended with memory across zero, the turn passed to the opponent.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-081",
        effectKey: effect === "piercing" ? "BT1-081/piercing" : "BT1-081/unsuspend",
        description: descriptions[effect] ?? effectText,
        timing: effect === "piercing" ? "After Battle" : "End of Attack",
      },
    ],
  };
}

function rosemonDemo(effect: string | null): CardEffectsFixture {
  const effectText =
    "[Opponent's Turn] When an opponent's Digimon attacks a player, if this Digimon is suspended, suspend 1 of your opponent's Digimon.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 1;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const rosemon = permanent("demo-rosemon", "BT1-082", 0, 11000);
  rosemon.isSuspended = effect !== "became-unsuspended";
  you.battleArea.push(rosemon);
  const attacker = permanent("demo-rosemon-attacker", "BT1-016", 1, 5000);
  const blocker = permanent("demo-rosemon-blocker", "BT1-072", 1, 6000);
  attacker.isSuspended = true;
  blocker.keywords.push("Blocker");
  if (effect === "resolved" || effect === "became-suspended") blocker.isSuspended = true;
  opponent.battleArea.push(attacker, blocker);
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === "became-unsuspended") return { state };
  if (effect === "resolved" || effect === "became-suspended") {
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "BT1-082",
          effectKey: "BT1-082/suspend-opponent-digimon",
          description:
            effect === "became-suspended"
              ? "Rosemon became suspended before activation, so its controller suspended the opposing Blocker."
              : "Rosemon's controller chose and suspended the opposing Digimon with Blocker.",
          timing: "Opponent's Turn",
        },
      ],
    };
  }

  return {
    state,
    decision: {
      decisionId: "demo-rosemon-target",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose 1 of your opponent's Digimon to suspend.",
      sourceCardId: "BT1-082",
      options: {
        candidateInstanceIds: [attacker.topCard.instanceId, blocker.topCard.instanceId],
        visibleInstanceIds: [attacker.topCard.instanceId, blocker.topCard.instanceId],
        min: 1,
        max: 1,
        timing: "Opponent's Turn",
        effectText,
      },
    },
  };
}

function granKuwagamonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const granKuwagamon = permanent("demo-gran-kuwagamon", "BT1-083", 0, effect === "opponent-turn" ? 11000 : 15000);
  granKuwagamon.keywords.push("Piercing");
  granKuwagamon.isSuspended = effect === "piercing";
  you.battleArea.push(granKuwagamon);
  opponent.handCount = 5;
  if (effect === "piercing") {
    opponent.securityCount = 4;
    opponent.trash.push(card("demo-gran-kuwagamon-defender", "BT1-016", 1));
  }
  state.players.push(you, opponent);

  if (effect === "opponent-turn") return { state };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-083",
        effectKey: effect === "piercing" ? "BT1-083/piercing" : "BT1-083/dp",
        description:
          effect === "piercing"
            ? "Piercing performed a security check after GranKuwagamon won the battle and survived."
            : "During its controller's turn, GranKuwagamon gets +4000 DP and reaches 15000 DP.",
        timing: effect === "piercing" ? "After Battle" : "Your Turn",
      },
    ],
  };
}

function omnimonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const deleteText =
    "[When Digivolving] Choose 1 of your opponent's Digimon. Delete all of your opponent's Digimon that share a name with it.";
  const attackText =
    "[When Attacking] You can unsuspend this Digimon by returning 1 of this Digimon's level 6 digivolution cards to your hand.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const omnimon = permanent("demo-omnimon", "BT1-084", 0, 15000, [
    { instanceId: "demo-omnimon-level-six", cardId: "BT1-025" },
  ]);
  omnimon.isSuspended = step === "return-level-six" || effect === "declined";
  you.battleArea.push(omnimon);
  opponent.handCount = 5;

  if (effect === "deleted-names") {
    opponent.battleArea.push(permanent("demo-omnimon-different", "BT1-011", 1, 3000));
    opponent.trash.push(
      card("demo-omnimon-metal-a", "ST1-09", 1),
      card("demo-omnimon-metal-b", "BT1-021", 1),
      card("demo-omnimon-metal-c", "BT1-114", 1),
    );
  } else if (effect === "deleted-token") {
    opponent.trash.push(
      card("demo-omnimon-diaboromon", "BT2-082", 1),
      card("demo-omnimon-diaboromon-token", "TOKEN-Diaboromon", 1),
    );
  } else if (effect !== "unsuspended" && step !== "return-level-six") {
    opponent.battleArea.push(
      permanent("demo-omnimon-metal-a", "ST1-09", 1, 7000),
      permanent("demo-omnimon-metal-b", "BT1-021", 1, 7000),
      permanent("demo-omnimon-different", "BT1-011", 1, 3000),
    );
  }
  if (effect === "unsuspended") {
    omnimon.stack.splice(0);
    you.hand.push(card("demo-omnimon-level-six", "BT1-025", 0));
    you.handCount = 1;
  }
  state.players.push(you, opponent);

  if (effect === "deleted-names" || effect === "deleted-token" || effect === "unsuspended" || effect === "declined") {
    const descriptions: Record<string, string> = {
      "deleted-names": "Omnimon deleted every MetalGreymon with the exact chosen name across different card numbers.",
      "deleted-token": "Omnimon deleted the chosen Diaboromon and the matching Diaboromon token.",
      unsuspended: "Omnimon returned its level 6 digivolution card to hand and unsuspended.",
      declined:
        "Omnimon's controller declined the optional effect, so it remained suspended and kept its level 6 card.",
    };
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "BT1-084",
          effectKey:
            effect === "unsuspended" || effect === "declined"
              ? "BT1-084/return-lv6-unsuspend"
              : "BT1-084/delete-same-name",
          description: descriptions[effect] ?? deleteText,
          timing: effect === "unsuspended" || effect === "declined" ? "When Attacking" : "When Digivolving",
        },
      ],
    };
  }

  if (step === "return-level-six") {
    return {
      state,
      decision: {
        decisionId: "demo-omnimon-return-level-six",
        seat: 0,
        kind: "selectCards",
        promptText: "Choose 1 level 6 digivolution card to return to your hand.",
        sourceCardId: "BT1-084",
        options: {
          candidateInstanceIds: [omnimon.stack[0]!.instanceId],
          visibleInstanceIds: [omnimon.stack[0]!.instanceId],
          min: 1,
          max: 1,
          timing: "WhenAttacking",
          effectText: attackText,
        },
      },
    };
  }

  const candidates = opponent.battleArea.map((permanent) => permanent.topCard.instanceId);
  return {
    state,
    decision: {
      decisionId: "demo-omnimon-delete-name",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose 1 opposing Digimon; every opposing Digimon with exactly that name will be deleted.",
      sourceCardId: "BT1-084",
      options: {
        candidateInstanceIds: candidates,
        visibleInstanceIds: candidates,
        min: 1,
        max: 1,
        timing: "WhenDigivolving",
        effectText: deleteText,
      },
    },
  };
}

function taiKamiyaDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "memory-set" ? Phase.Active : Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "memory-set" ? 3 : effect === null ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const tai = permanent("demo-tai-kamiya", "BT1-085", 0, 0);
  you.battleArea.push(tai);
  if (effect === "stacked-aura") you.battleArea.push(permanent("demo-tai-kamiya-second", "BT1-085", 0, 0));
  if (effect === "aura" || effect === "stacked-aura") {
    const red = permanent("demo-tai-red", "BT1-025", 0, 11000, [
      { instanceId: "demo-tai-source-a", cardId: "BT1-001" },
      { instanceId: "demo-tai-source-b", cardId: "BT1-010" },
      { instanceId: "demo-tai-source-c", cardId: "BT1-015" },
      { instanceId: "demo-tai-source-d", cardId: "BT1-020" },
    ]);
    red.grantedKeywords.push("SecurityAttack");
    if (effect === "stacked-aura") red.grantedKeywords.push("SecurityAttack");
    you.battleArea.push(red);
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "memory-set": "At the start of the turn, Tai Kamiya set memory from 1 to 3.",
    aura: "Tai Kamiya granted Security Attack +1 to the red Digimon with 4 digivolution cards.",
    "stacked-aura": "Two copies of Tai Kamiya granted a total of Security Attack +2.",
    "security-play": "Tai Kamiya was played from security without paying the cost.",
  };
  return {
    state,
    events: [
      effect === "security-play"
        ? { kind: "cardsMoved", instanceIds: [tai.topCard.instanceId], from: "security", to: "battleArea" }
        : {
            kind: "effectResolved",
            seat: 0,
            sourceCardId: "BT1-085",
            effectKey: effect === "memory-set" ? "BT1-085/memory-setter" : "BT1-085/red-security-attack",
            description: descriptions[effect] ?? "Tai Kamiya's effect resolved.",
            timing: effect === "memory-set" ? "Start of Your Turn" : "Your Turn",
          },
    ],
  };
}

function mattIshidaDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const playText =
    "[Your Turn] When you play a blue Digimon, you can suspend this Tamer to trash the bottom digivolution card of 1 of your opponent's Digimon.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "memory-set" ? Phase.Active : Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "memory-set" ? 3 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const matt = permanent("demo-matt-ishida", "BT1-086", 0, 0);
  matt.isSuspended = effect === "memory-set" || step === "target" || effect === "source-trashed";
  you.battleArea.push(matt);
  if (effect !== "memory-set" && effect !== "security-play")
    you.battleArea.push(permanent("demo-matt-blue", "BT1-027", 0, 3000));
  const sourceCards =
    effect === "source-trashed"
      ? [{ instanceId: "demo-matt-target-top-source", cardId: "BT1-067" }]
      : [
          { instanceId: "demo-matt-target-bottom", cardId: "BT1-066" },
          { instanceId: "demo-matt-target-top-source", cardId: "BT1-067" },
        ];
  if (effect !== "memory-set" && effect !== "security-play") {
    opponent.battleArea.push(permanent("demo-matt-target", "BT1-072", 1, 6000, sourceCards));
  }
  if (effect === "source-trashed") opponent.trash.push(card("demo-matt-target-bottom", "BT1-066", 1));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === "memory-set" || effect === "source-trashed" || effect === "declined" || effect === "security-play") {
    if (effect === "security-play") {
      return {
        state,
        events: [{ kind: "cardsMoved", instanceIds: [matt.topCard.instanceId], from: "security", to: "battleArea" }],
      };
    }
    const descriptions: Record<string, string> = {
      "memory-set": "Suspended Matt Ishida still set memory from 1 to 3 at the start of the turn.",
      "source-trashed": "Matt Ishida suspended to trash the bottom digivolution card of the chosen opposing Digimon.",
      declined: "Matt Ishida's controller declined, so Matt remained active and the opposing source stayed in place.",
    };
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "BT1-086",
          effectKey: effect === "memory-set" ? "BT1-086/memory" : "BT1-086/blue-play",
          description: descriptions[effect] ?? playText,
          timing: effect === "memory-set" ? "Start of Your Turn" : "Your Turn",
        },
      ],
    };
  }

  if (step === "target") {
    const target = opponent.battleArea[0]!;
    return {
      state,
      decision: {
        decisionId: "demo-matt-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Choose 1 opposing Digimon whose bottom digivolution card will be trashed.",
        sourceCardId: "BT1-086",
        options: {
          candidateInstanceIds: [target.topCard.instanceId],
          visibleInstanceIds: [target.topCard.instanceId],
          min: 1,
          max: 1,
          timing: "Your Turn",
          effectText: playText,
        },
      },
    };
  }

  return {
    state,
    decision: {
      decisionId: "demo-matt-optional",
      seat: 0,
      kind: "optional",
      promptText: "Suspend Matt Ishida to trash an opposing bottom digivolution card?",
      sourceCardId: "BT1-086",
      options: { timing: "Your Turn", effectText: playText },
    },
  };
}

function tkTakaishiDemo(effect: string | null): CardEffectsFixture {
  const effectText =
    "[On Play] Look at your security stack, then reveal 1 card in it and add it to your hand. If that card is yellow, trigger Recovery +1 (Deck). Then shuffle your security stack.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "memory-set" ? Phase.Active : Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "memory-set" ? 3 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const tk = permanent("demo-tk-takaishi", "BT1-087", 0, 0);
  you.battleArea.push(tk);
  opponent.handCount = 5;

  const redSecurity = card("demo-tk-red-security", "BT1-009", 0);
  const yellowSecurity = card("demo-tk-yellow-security", "BT1-087", 0);
  if (effect === null) {
    you.security.push(redSecurity, yellowSecurity);
    you.securityCount = 2;
  } else if (effect === "yellow-recovered") {
    you.hand.push(yellowSecurity);
    you.handCount = 1;
    you.security.push(redSecurity, card("demo-tk-recovered", "BT1-010", 0));
    you.securityCount = 2;
  } else if (effect === "non-yellow") {
    you.hand.push(redSecurity);
    you.handCount = 1;
    you.security.push(yellowSecurity);
    you.securityCount = 1;
  }
  state.players.push(you, opponent);

  if (effect === null) {
    return {
      state,
      decision: {
        decisionId: "demo-tk-security-choice",
        seat: 0,
        kind: "selectCards",
        promptText: "Look at your security stack and choose 1 card to reveal and add to your hand.",
        sourceCardId: "BT1-087",
        options: {
          candidateInstanceIds: [redSecurity.instanceId, yellowSecurity.instanceId],
          visibleInstanceIds: [redSecurity.instanceId, yellowSecurity.instanceId],
          visibleCards: [
            { instanceId: redSecurity.instanceId, cardId: redSecurity.cardId },
            { instanceId: yellowSecurity.instanceId, cardId: yellowSecurity.cardId },
          ],
          min: 1,
          max: 1,
          timing: "On Play",
          effectText,
        },
      },
    };
  }

  if (effect === "security-play") {
    return {
      state,
      events: [{ kind: "cardsMoved", instanceIds: [tk.topCard.instanceId], from: "security", to: "battleArea" }],
    };
  }
  const descriptions: Record<string, string> = {
    "memory-set": "At the start of the turn, T.K. Takaishi set memory from 1 to 3.",
    "yellow-recovered":
      "T.K. added the chosen yellow security card to hand, recovered the deck top, and shuffled security.",
    "non-yellow": "T.K. added the chosen non-yellow security card to hand without Recovery, then shuffled security.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-087",
        effectKey: effect === "memory-set" ? "BT1-087/memory" : "BT1-087/security-search",
        description: descriptions[effect] ?? effectText,
        timing: effect === "memory-set" ? "Start of Your Turn" : "On Play",
      },
    ],
  };
}

function izzyIzumiDemo(effect: string | null): CardEffectsFixture {
  const effectText =
    "[Main] If you have a level 5 or higher green Digimon in play, you can suspend this Tamer to reveal the top card of your deck. If that card is a Digimon card, add it to your hand. Otherwise place it at the bottom of your deck.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const izzy = permanent("demo-izzy-izumi", "BT1-088", 0, 0);
  izzy.isSuspended = effect === "digimon-added" || effect === "non-digimon-bottom";
  you.battleArea.push(izzy);
  you.battleArea.push(permanent("demo-izzy-qualifier", effect === "ineligible" ? "BT1-070" : "BT1-078", 0, 7000));
  you.deckCount = effect === "digimon-added" ? 34 : 35;
  if (effect === "digimon-added") {
    you.hand.push(card("demo-izzy-revealed-digimon", "BT1-077", 0));
    you.handCount = 1;
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) {
    return {
      state,
      decision: {
        decisionId: "demo-izzy-activate",
        seat: 0,
        kind: "optional",
        promptText: "Suspend Izzy Izumi to reveal the top card of your deck?",
        sourceCardId: "BT1-088",
        options: { timing: "Main", effectText },
      },
    };
  }

  const descriptions: Record<string, string> = {
    "digimon-added": "Izzy Izumi suspended, revealed Okuwamon, and added the Digimon card to hand.",
    "non-digimon-bottom": "Izzy Izumi suspended and placed the revealed non-Digimon card at the bottom of the deck.",
    "security-play": "Izzy Izumi was played from security without paying the cost.",
  };
  return {
    state,
    events: [
      effect === "security-play"
        ? { kind: "cardsMoved", instanceIds: [izzy.topCard.instanceId], from: "security", to: "battleArea" }
        : {
            kind: "effectResolved",
            seat: 0,
            sourceCardId: "BT1-088",
            effectKey: "BT1-088/reveal",
            description: descriptions[effect] ?? effectText,
            timing: "Main",
          },
    ],
  };
}

function mimiTachikawaDemo(effect: string | null): CardEffectsFixture {
  const mainText =
    "[Main] If you have a level 5 or higher green Digimon in play, you can suspend this Tamer to hatch 1 Digi-Egg card to an empty space in your breeding area, or move 1 level 3 or higher Digimon from your breeding area to your battle area.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "memory-set" ? Phase.Active : Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "memory-set" ? 3 : 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const mimi = permanent("demo-mimi-tachikawa", "BT1-089", 0, 0);
  mimi.isSuspended = effect === "memory-set" || effect === "hatched" || effect === "moved";
  you.battleArea.push(mimi);
  if (effect !== "security-play") you.battleArea.push(permanent("demo-mimi-qualifier", "BT1-078", 0, 7000));
  if (effect === "hatched") {
    const hatchling = permanent("demo-mimi-hatchling", "BT1-008", 0, 0);
    hatchling.inBreeding = true;
    you.breeding = hatchling;
    you.eggDeckCount = 3;
  }
  if (effect === "moved") you.battleArea.push(permanent("demo-mimi-moved", "BT1-064", 0, 3000));
  if (effect === "unavailable") {
    const hatchling = permanent("demo-mimi-level-two", "BT1-008", 0, 0);
    hatchling.inBreeding = true;
    you.breeding = hatchling;
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) {
    return {
      state,
      decision: {
        decisionId: "demo-mimi-activate",
        seat: 0,
        kind: "optional",
        promptText: "Suspend Mimi Tachikawa to hatch the top Digi-Egg?",
        sourceCardId: "BT1-089",
        options: { timing: "Main", effectText: mainText },
      },
    };
  }
  if (effect === "unavailable") return { state };

  const descriptions: Record<string, string> = {
    "memory-set": "Suspended Mimi Tachikawa set memory from 2 to 3 at the start of her controller's turn.",
    hatched: "Mimi Tachikawa suspended and hatched the top Digi-Egg into the empty Breeding Area.",
    moved: "Mimi Tachikawa suspended and moved the level 3 Digimon from the Breeding Area to the battle area.",
    "security-play": "Mimi Tachikawa was played from security without paying the cost.",
  };
  return {
    state,
    events: [
      effect === "security-play"
        ? { kind: "cardsMoved", instanceIds: [mimi.topCard.instanceId], from: "security", to: "battleArea" }
        : {
            kind: "effectResolved",
            seat: 0,
            sourceCardId: "BT1-089",
            effectKey: effect === "memory-set" ? "BT1-089/memory" : "BT1-089/breeding",
            description: descriptions[effect] ?? mainText,
            timing: effect === "memory-set" ? "Start of Your Turn" : "Main",
          },
    ],
  };
}

function gravityCrushDemo(effect: string | null): CardEffectsFixture {
  const effectText = "[Main] Gain 2 memory. At end of turn, lose 2 memory.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase =
    effect === "end-loss" || effect === "blocked-loss" || effect === "stacked-loss" ? Phase.End : Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory =
    effect === "memory-gained"
      ? 2
      : effect === "end-loss" || effect === "blocked-loss"
        ? -5
        : effect === "stacked-loss"
          ? -7
          : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const option = card("demo-gravity-crush", "BT1-090", 0);
  if (effect === null) {
    you.hand.push(option);
    you.handCount = 1;
  } else {
    you.trash.push(option);
    if (effect === "stacked-loss") you.trash.push(card("demo-gravity-crush-second", "BT1-090", 0));
  }
  if (effect === "blocked-loss") opponent.battleArea.push(permanent("demo-gravity-terriermon", "BT3-046", 1, 2000));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "memory-gained": "Gravity Crush gained 2 memory immediately and scheduled a 2-memory loss for end of turn.",
    "end-loss": "At end of turn, Gravity Crush's delayed effect lost 2 memory after the turn marker passed.",
    "blocked-loss": "Terriermon prevented the initial gain, but Gravity Crush still lost 2 memory at end of turn.",
    "stacked-loss": "Two Gravity Crush effects each lost 2 memory at end of turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-090",
        effectKey: effect === "memory-gained" ? "BT1-090/memory-loan" : "BT1-090/end-loss",
        description: descriptions[effect] ?? effectText,
        timing: effect === "memory-gained" ? "Main" : "End of Turn",
      },
    ],
  };
}

function scrapClawDemo(effect: string | null): CardEffectsFixture {
  const effectText =
    "[Main] 1 of your Digimon gains Piercing (When this Digimon attacks and deletes an opponent's Digimon and survives the battle, it performs any security checks it normally would) for the turn.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" ? Phase.Active : Phase.Main;
  state.turnCount = effect === "expired" ? 6 : 5;
  state.turnSeat = effect === "expired" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const target = permanent("demo-scrap-claw-target", "BT1-010", 0, 5000);
  const other = permanent("demo-scrap-claw-other", "BT1-011", 0, 3000);
  if (effect === "piercing-granted" || effect === "battle-won") target.grantedKeywords.push("Piercing");
  if (effect === "battle-won") target.isSuspended = true;
  you.battleArea.push(target, other);
  you.trash.push(card("demo-scrap-claw-option", "BT1-091", 0));
  if (effect === "battle-won") {
    opponent.trash.push(card("demo-scrap-claw-defender", "BT1-009", 1));
    opponent.securityCount = 0;
  } else {
    const defender = permanent("demo-scrap-claw-defender", "BT1-009", 1, 1000);
    defender.isSuspended = true;
    opponent.battleArea.push(defender);
    opponent.securityCount = 1;
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) {
    const candidates = [target.topCard.instanceId, other.topCard.instanceId];
    return {
      state,
      decision: {
        decisionId: "demo-scrap-claw-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Choose 1 of your Digimon to gain Piercing for the turn.",
        sourceCardId: "BT1-091",
        options: {
          candidateInstanceIds: candidates,
          visibleInstanceIds: candidates,
          min: 1,
          max: 1,
          timing: "Main",
          effectText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    "piercing-granted":
      "Scrap Claw granted Piercing to the selected Digimon for the turn; the other Digimon was unaffected.",
    "battle-won":
      "The selected Digimon deleted the opposing Digimon in battle, survived, and Piercing performed its security check.",
    expired: "Scrap Claw's granted Piercing expired at the end of the turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-091",
        effectKey: "BT1-091/piercing",
        description: descriptions[effect] ?? effectText,
        timing: effect === "expired" ? "End of Turn" : "Main",
      },
    ],
  };
}

function nuclearLaserDemo(effect: string | null): CardEffectsFixture {
  const effectText = "[Main] Draw 2. Then 1 of your Digimon gets +2000 DP for the turn.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" ? Phase.Active : Phase.Main;
  state.turnCount = effect === "expired" ? 6 : 5;
  state.turnSeat = effect === "expired" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "no-target") {
    you.battleArea.push(permanent("demo-nuclear-laser-tamer", "BT1-085", 0, 0));
  } else {
    you.battleArea.push(
      permanent("demo-nuclear-laser-first", "BT1-010", 0, effect === "buffed" ? 4000 : 2000),
      permanent("demo-nuclear-laser-second", "BT1-011", 0, 3000),
    );
  }
  you.hand.push(card("demo-nuclear-laser-draw-one", "BT1-014", 0));
  you.hand.push(card("demo-nuclear-laser-draw-two", "BT1-015", 0));
  you.handCount = 2;
  you.deckCount = 34;
  you.trash.push(card("demo-nuclear-laser-option", "BT1-092", 0));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) {
    const candidates = you.battleArea.map((entry) => entry.topCard.instanceId);
    return {
      state,
      decision: {
        decisionId: "demo-nuclear-laser-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Draw 2 completed. Choose 1 of your Digimon to get +2000 DP for the turn.",
        sourceCardId: "BT1-092",
        options: {
          candidateInstanceIds: candidates,
          visibleInstanceIds: candidates,
          min: 1,
          max: 1,
          timing: "Main",
          effectText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    buffed: "Nuclear Laser drew 2 cards, then gave only the selected Digimon +2000 DP for the turn.",
    "no-target": "Nuclear Laser still drew 2 cards when no Digimon existed to receive the DP bonus.",
    expired: "Nuclear Laser's +2000 DP expired at the end of the turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-092",
        effectKey: "BT1-092/draw-and-dp",
        description: descriptions[effect] ?? effectText,
        timing: effect === "expired" ? "End of Turn" : "Main",
      },
    ],
  };
}

function greatTornadoDemo(effect: string | null): CardEffectsFixture {
  const effectText = "[Main] 1 of your Digimon gets +2000 DP and Security Attack +1 for the turn.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" ? Phase.Active : Phase.Main;
  state.turnCount = effect === "expired" ? 6 : 5;
  state.turnSeat = effect === "expired" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "no-target") {
    you.battleArea.push(permanent("demo-great-tornado-tamer", "BT1-085", 0, 0));
  } else {
    const chosen = permanent(
      "demo-great-tornado-chosen",
      "BT1-010",
      0,
      effect === "buffed" || effect === "attacked" ? 4000 : 2000,
    );
    if (effect === "buffed" || effect === "attacked") chosen.grantedKeywords.push("SecurityAttack");
    if (effect === "attacked") chosen.isSuspended = true;
    you.battleArea.push(chosen, permanent("demo-great-tornado-other", "BT1-011", 0, 3000));
  }
  if (effect === "security-added") {
    you.hand.push(card("demo-great-tornado-security", "BT1-093", 0));
    you.handCount = 1;
    you.securityCount = 4;
  } else {
    you.trash.push(card("demo-great-tornado-option", "BT1-093", 0));
  }
  opponent.securityCount = effect === "attacked" ? 0 : 2;
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) {
    const candidates = you.battleArea.map((entry) => entry.topCard.instanceId);
    return {
      state,
      decision: {
        decisionId: "demo-great-tornado-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Choose 1 of your Digimon to receive both +2000 DP and Security Attack +1.",
        sourceCardId: "BT1-093",
        options: {
          candidateInstanceIds: candidates,
          visibleInstanceIds: candidates,
          min: 1,
          max: 1,
          timing: "Main",
          effectText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    buffed: "Great Tornado gave the selected Digimon both +2000 DP and Security Attack +1 for the turn.",
    attacked: "The selected Digimon used Security Attack +1 to perform 2 security checks.",
    expired: "Great Tornado's DP and Security Attack bonuses both expired at end of turn.",
    "no-target": "Great Tornado resolved without a target because its controller had no Digimon.",
    "security-added": "Great Tornado's Security effect added the card to its owner's hand.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-093",
        effectKey: effect === "security-added" ? "BT1-093/security" : "BT1-093/main",
        description: descriptions[effect] ?? effectText,
        timing: effect === "security-added" ? "Security" : effect === "expired" ? "End of Turn" : "Main",
      },
    ],
  };
}

function oblivionBirdDemo(effect: string | null): CardEffectsFixture {
  const effectText = "[Main] Delete 1 of your opponent's Digimon with Blocker.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "security-deleted" ? 0 : 5;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-oblivion-red", "BT1-010", 0, 2000));
  const nonBlocker = permanent("demo-oblivion-non-blocker", "BT1-071", 1, 6000);
  if (effect === "no-target") {
    opponent.battleArea.push(nonBlocker);
  } else if (effect === "q962-deleted") {
    opponent.trash.push(nonBlocker.topCard);
  } else if (effect === "deleted" || effect === "security-deleted") {
    opponent.battleArea.push(nonBlocker);
    opponent.trash.push(card("demo-oblivion-deleted-blocker", "BT1-072", 1));
  } else {
    opponent.battleArea.push(permanent("demo-oblivion-blocker", "BT1-072", 1, 6000), nonBlocker);
  }
  you.trash.push(card("demo-oblivion-option", "BT1-094", 0));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) {
    const blocker = opponent.battleArea[0]!;
    return {
      state,
      decision: {
        decisionId: "demo-oblivion-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Choose 1 opposing Digimon with Blocker to delete.",
        sourceCardId: "BT1-094",
        options: {
          candidateInstanceIds: [blocker.topCard.instanceId],
          visibleInstanceIds: opponent.battleArea.map((entry) => entry.topCard.instanceId),
          min: 1,
          max: 1,
          timing: "Main",
          effectText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    deleted: "Oblivion Bird deleted the opposing Digimon with Blocker and left the non-Blocker untouched.",
    "q962-deleted": "Oblivion Bird deleted a Digimon whose Blocker was granted by another Option effect (Q962).",
    "no-target": "Oblivion Bird resolved without a target because the opponent controlled no Digimon with Blocker.",
    "security-deleted": "Oblivion Bird's Security effect activated its Main effect and deleted the opposing Blocker.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-094",
        effectKey: effect === "security-deleted" ? "BT1-094/security" : "BT1-094/main",
        description: descriptions[effect] ?? effectText,
        timing: effect === "security-deleted" ? "Security" : "Main",
      },
    ],
  };
}

function braveShieldDemo(effect: string | null): CardEffectsFixture {
  const mainText =
    "[Main] Unsuspend 1 of your Digimon. Until the end of your opponent's next turn, that Digimon gains Blocker.";
  const securityText = "[Security] Unsuspend 1 of your Digimon. That Digimon gains Blocker for the turn.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" || effect === "security-expired" ? Phase.End : Phase.Main;
  state.turnCount = effect === "persisted" || effect === "expired" || effect === "security-expired" ? 6 : 5;
  state.turnSeat =
    effect === "persisted" || effect === "security-granted" || effect === "security-expired" || effect === "expired"
      ? 1
      : 0;
  state.memory = effect === "security-granted" || effect === "security-expired" ? 0 : 5;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const target = permanent("demo-brave-shield-target", "BT1-010", 0, 2000);
  const other = permanent("demo-brave-shield-other", "BT1-011", 0, 3000);
  target.isSuspended = effect === null;
  other.isSuspended = true;
  if (effect === "main-granted" || effect === "q963" || effect === "persisted" || effect === "security-granted") {
    target.grantedKeywords.push("Blocker");
  }
  you.battleArea.push(target, other);
  you.trash.push(card("demo-brave-shield-option", "BT1-095", 0));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) {
    const candidates = [target.topCard.instanceId, other.topCard.instanceId];
    return {
      state,
      decision: {
        decisionId: "demo-brave-shield-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Choose 1 of your Digimon to unsuspend and give Blocker.",
        sourceCardId: "BT1-095",
        options: {
          candidateInstanceIds: candidates,
          visibleInstanceIds: candidates,
          min: 1,
          max: 1,
          timing: "Main",
          effectText: mainText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    "main-granted":
      "Brave Shield unsuspended the selected Digimon and granted Blocker through the opponent's next turn.",
    q963: "Brave Shield granted Blocker to a Digimon that was already unsuspended (Q963).",
    persisted: "The Main-effect Blocker grant remained after the controller's turn ended.",
    expired: "The Main-effect Blocker grant expired at the end of the opponent's next turn.",
    "security-granted":
      "Brave Shield's Security effect unsuspended the Digimon and granted Blocker for the current turn.",
    "security-expired": "The Security-effect Blocker grant expired at the end of the current turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-095",
        effectKey: effect.startsWith("security-") ? "BT1-095/security" : "BT1-095/main",
        description: descriptions[effect] ?? (effect.startsWith("security-") ? securityText : mainText),
        timing: effect.startsWith("security-") ? "Security" : effect === "expired" ? "End of Turn" : "Main",
      },
    ],
  };
}

function madDogFireDemo(effect: string | null): CardEffectsFixture {
  const mainText = "[Main] 1 of your Digimon gets +3000 DP for the turn.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" ? Phase.Active : Phase.Main;
  state.turnCount = effect === "expired" ? 6 : 5;
  state.turnSeat = effect === "expired" ? 1 : 0;
  state.memory = effect === "security-resolved" ? 0 : 1;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "no-target") {
    you.battleArea.push(permanent("demo-mad-dog-tamer", "BT1-086", 0, 0));
  } else {
    you.battleArea.push(
      permanent("demo-mad-dog-target", "BT1-028", 0, effect === "buffed" ? 6000 : 3000),
      permanent("demo-mad-dog-other", "BT1-029", 0, 2000),
    );
  }
  if (effect === "security-resolved") {
    you.hand.push(card("demo-mad-dog-drawn", "BT1-029", 0), card("demo-mad-dog-security", "BT1-096", 0));
    you.handCount = 2;
    you.deckCount = 35;
    you.securityCount = 4;
  } else {
    you.trash.push(card("demo-mad-dog-option", "BT1-096", 0));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) {
    const candidates = you.battleArea.map((entry) => entry.topCard.instanceId);
    return {
      state,
      decision: {
        decisionId: "demo-mad-dog-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Choose 1 of your Digimon to get +3000 DP for the turn.",
        sourceCardId: "BT1-096",
        options: {
          candidateInstanceIds: candidates,
          visibleInstanceIds: candidates,
          min: 1,
          max: 1,
          timing: "Main",
          effectText: mainText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    buffed: "Mad Dog Fire gave only the selected Digimon +3000 DP for the turn.",
    expired: "Mad Dog Fire's +3000 DP expired at end of turn.",
    "no-target": "Mad Dog Fire resolved without a target because its controller had no Digimon.",
    "security-resolved": "Mad Dog Fire's Security effect drew 1 card, then added Mad Dog Fire to hand.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-096",
        effectKey: effect === "security-resolved" ? "BT1-096/security" : "BT1-096/main",
        description: descriptions[effect] ?? mainText,
        timing: effect === "security-resolved" ? "Security" : effect === "expired" ? "End of Turn" : "Main",
      },
    ],
  };
}

function boringStormDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === null ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-boring-storm-blue", "BT1-028", 0, 3000));
  if (effect === null) {
    you.hand.push(card("demo-boring-storm-option", "BT1-097", 0));
    you.handCount = 1;
  } else if (effect === "main-draw") {
    you.hand.push(card("demo-boring-storm-main-draw", "BT1-029", 0));
    you.handCount = 1;
    you.deckCount = 35;
    you.trash.push(card("demo-boring-storm-option", "BT1-097", 0));
  } else {
    you.hand.push(
      card("demo-boring-storm-security-first", "BT1-029", 0),
      card("demo-boring-storm-security-second", "BT1-030", 0),
    );
    you.handCount = 2;
    you.deckCount = 34;
    you.securityCount = 4;
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-097",
        effectKey: effect === "main-draw" ? "BT1-097/main-draw" : "BT1-097/security-draw",
        description:
          effect === "main-draw"
            ? "Boring Storm drew exactly the top card, then the used Option went to trash."
            : "Boring Storm's Security effect drew exactly 2 cards without adding Boring Storm to hand.",
        timing: effect === "main-draw" ? "Main" : "Security",
      },
    ],
  };
}

function vNovaBlastDemo(effect: string | null): CardEffectsFixture {
  const effectText =
    "[Main] 1 of your Digimon gains Jamming (This Digimon can't be deleted in battles against Security Digimon) for the turn.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" ? Phase.Active : Phase.Main;
  state.turnCount = effect === "expired" ? 6 : 5;
  state.turnSeat = effect === "expired" ? 1 : 0;
  state.memory = effect === "security-added" ? 0 : 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "no-target") {
    you.battleArea.push(permanent("demo-v-nova-tamer", "BT1-086", 0, 0));
  } else {
    const target = permanent("demo-v-nova-target", "BT1-028", 0, 3000);
    if (effect === "granted" || effect === "survived") target.grantedKeywords.push("Jamming");
    if (effect === "survived") target.isSuspended = true;
    you.battleArea.push(target, permanent("demo-v-nova-other", "BT1-029", 0, 2000));
  }
  if (effect === "security-added") {
    you.hand.push(card("demo-v-nova-security", "BT1-098", 0));
    you.handCount = 1;
    you.securityCount = 4;
  } else {
    you.trash.push(card("demo-v-nova-option", "BT1-098", 0));
  }
  opponent.securityCount = effect === "survived" ? 0 : 1;
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) {
    const candidates = you.battleArea.map((entry) => entry.topCard.instanceId);
    return {
      state,
      decision: {
        decisionId: "demo-v-nova-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Choose 1 of your Digimon to gain Jamming for the turn.",
        sourceCardId: "BT1-098",
        options: {
          candidateInstanceIds: candidates,
          visibleInstanceIds: candidates,
          min: 1,
          max: 1,
          timing: "Main",
          effectText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    granted: "V-Nova Blast granted Jamming only to the selected Digimon for the turn.",
    survived: "The 3000 DP Digimon survived battle against a stronger Security Digimon because it had Jamming.",
    expired: "V-Nova Blast's Jamming grant expired at end of turn.",
    "no-target": "V-Nova Blast resolved without a target because its controller had no Digimon.",
    "security-added": "V-Nova Blast's Security effect added the card to its owner's hand.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-098",
        effectKey: effect === "security-added" ? "BT1-098/security" : "BT1-098/main",
        description: descriptions[effect] ?? effectText,
        timing: effect === "security-added" ? "Security" : effect === "expired" ? "End of Turn" : "Main",
      },
    ],
  };
}

function heartsAttackDemo(effect: string | null): CardEffectsFixture {
  const effectText = "[Main] Trash all digivolution cards under 1 of your opponent's Digimon.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(
    permanent("demo-hearts-own-loaded", "BT1-028", 0, 3000, [
      { instanceId: "demo-hearts-own-source", cardId: "BT1-001" },
    ]),
  );
  const emptyTarget = permanent("demo-hearts-empty", "BT2-047", 1, 4000);
  const loadedSources = [
    { instanceId: "demo-hearts-source-one", cardId: "BT1-001" },
    { instanceId: "demo-hearts-source-two", cardId: "BT1-002" },
    { instanceId: "demo-hearts-source-three", cardId: "BT1-003" },
  ];
  const loadedTarget = permanent(
    "demo-hearts-loaded",
    "BT2-047",
    1,
    4000,
    effect === "loaded-trashed" ? [] : loadedSources,
  );
  opponent.battleArea.push(emptyTarget, loadedTarget);
  if (effect === "loaded-trashed") {
    opponent.trash.push(...loadedSources.map((source) => card(source.instanceId, source.cardId, 1)));
  }
  you.trash.push(card("demo-hearts-option", "BT1-099", 0));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) {
    const candidates = [emptyTarget.topCard.instanceId, loadedTarget.topCard.instanceId];
    return {
      state,
      decision: {
        decisionId: "demo-hearts-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Choose 1 opposing Digimon. All of its digivolution cards will be trashed.",
        sourceCardId: "BT1-099",
        options: {
          candidateInstanceIds: candidates,
          visibleInstanceIds: candidates,
          min: 1,
          max: 1,
          timing: "Main",
          effectText,
        },
      },
    };
  }

  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-099",
        effectKey: "BT1-099/main",
        description:
          effect === "loaded-trashed"
            ? "Hearts Attack trashed all 3 digivolution cards from the selected opposing Digimon and left the other stacks untouched."
            : "Hearts Attack legally selected the Digimon with no digivolution cards; nothing happened to the loaded Digimon (Q964).",
        timing: "Main",
      },
    ],
  };
}

function argomonUltimateBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "digisorption" ? 5 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "digisorption") {
    you.battleArea.push(
      permanent("demo-argomon-ultimate-bt2", "BT2-047", 0, 6000),
      permanent("demo-argomon-ultimate-bt2-payer", "BT2-043", 0, 1000),
    );
    you.battleArea[1]!.isSuspended = true;
  } else {
    you.battleArea.push(
      permanent("demo-argomon-ultimate-bt2-host", "BT2-050", 0, 11000, [
        { instanceId: "demo-argomon-ultimate-bt2-source", cardId: "BT2-047" },
      ]),
    );
    if (effect === "q1018-on-play") {
      const palmon = permanent("demo-argomon-ultimate-bt2-palmon", "BT1-067", 0, 2000);
      palmon.isSuspended = true;
      you.battleArea.push(palmon);
      you.hand.push(card("demo-argomon-ultimate-bt2-found-level-four", "BT2-044", 0));
      you.handCount = 1;
    } else if (effect === "declined") {
      you.hand.push(card("demo-argomon-ultimate-bt2-candidate", "BT2-043", 0));
      you.handCount = 1;
    }
  }
  opponent.securityCount = effect === "q1018-on-play" || effect === "declined" ? 4 : 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    digisorption: "Digisorption -3 suspended an allied Digimon and reduced Argomon's 3-memory evolution cost to 0.",
    "q1018-on-play":
      "Q1018: the inherited effect played Palmon suspended, then Palmon's On Play effect added Tyrannomon to hand.",
    declined: "The optional inherited play was declined, leaving the eligible green level 3 in hand.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-047",
        effectKey: effect === "digisorption" ? "BT2-047/digisorption" : "BT2-047/inherited-play",
        description: descriptions[effect] ?? "Argomon's conditional effect state is displayed.",
        timing: effect === "digisorption" ? "When Digivolving" : "When Attacking",
      },
    ],
  };
}

function cherrymonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 1;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const cherrymon = permanent("demo-cherrymon-bt2", "BT2-048", 0, 7000);
  cherrymon.keywords.push("Blocker");
  const attacker = permanent("demo-cherrymon-bt2-attacker", "BT2-044", 1, 6000);
  attacker.isSuspended = true;
  you.battleArea.push(cherrymon);
  opponent.battleArea.push(attacker);

  if (effect === "blocked") cherrymon.isSuspended = true;
  if (effect === "declined") you.securityCount = 4;
  if (effect === "suspended") cherrymon.isSuspended = true;
  state.players.push(you, opponent);

  if (effect === null || effect === "eligible") {
    return {
      state,
      events: [
        {
          kind: "blockWindowOpened",
          attackerPermanentId: attacker.permanentId,
          eligibleBlockerIds: [cherrymon.permanentId],
        },
      ],
    };
  }
  if (effect === "blocked") {
    return { state, events: [{ kind: "blocked", blockerPermanentId: cherrymon.permanentId }] };
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
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-048",
        effectKey: "BT2-048/blocker-unavailable",
        description: "Cherrymon was already suspended, so it could not use Blocker.",
        timing: "AllTurns",
      },
    ],
  };
}

function puppetmonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "next-unsuspend" ? Phase.Active : Phase.Main;
  state.turnCount = 6;
  state.turnSeat = effect === "next-unsuspend" ? 1 : 0;
  state.memory = effect === "attack-memory" ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const puppetmon = permanent("demo-puppetmon-bt2", "BT2-049", 0, 10000);
  you.battleArea.push(puppetmon);

  if (effect === "on-play" || effect === "next-unsuspend") {
    const chosen = permanent("demo-puppetmon-bt2-chosen", "BT1-070", 1, 4000);
    const other = permanent("demo-puppetmon-bt2-other", "BT2-044", 1, 6000);
    const ready = permanent("demo-puppetmon-bt2-ready", "BT2-043", 1, 1000);
    const tamer = permanent("demo-puppetmon-bt2-tamer", "BT1-085", 1, 0);
    chosen.isSuspended = true;
    other.isSuspended = true;
    tamer.isSuspended = effect === "on-play";
    opponent.battleArea.push(chosen, other, ready, tamer);
  } else if (effect === "attack-memory") {
    puppetmon.isSuspended = true;
    opponent.securityCount = 4;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "on-play": "Puppetmon suspended one opposing Digimon and restricted every opposing Digimon from unsuspending.",
    "next-unsuspend":
      "Q1019-Q1021: both suspended Digimon stayed suspended; the ready Digimon stayed ready and the Tamer unsuspended normally.",
    "attack-memory": "Puppetmon gained 1 memory when attacking.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-049",
        effectKey: effect === "attack-memory" ? "BT2-049/when-attacking" : "BT2-049/on-play",
        description: descriptions[effect] ?? "Puppetmon's effect state is displayed.",
        timing: effect === "attack-memory" ? "WhenAttacking" : "OnPlay",
      },
    ],
  };
}

function argomonMegaBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = effect === "digisorption" ? 3 : effect === "declined" ? 0 : 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const argomon = permanent("demo-argomon-mega-bt2", "BT2-050", 0, 11000);
  you.battleArea.push(argomon);

  if (effect === "digisorption" || effect === "declined") {
    const payer = permanent("demo-argomon-mega-bt2-payer", "BT2-043", 0, 1000);
    payer.isSuspended = effect === "digisorption";
    you.battleArea.push(payer);
  } else {
    const first = permanent("demo-argomon-mega-bt2-first", "BT1-010", 0, 2000);
    const second = permanent("demo-argomon-mega-bt2-second", "BT1-011", 0, 2000);
    const tamer = permanent("demo-argomon-mega-bt2-tamer", "BT1-085", 0, 0);
    first.isSuspended = true;
    second.isSuspended = true;
    tamer.isSuspended = true;
    you.battleArea.push(first, second, tamer);
    if (effect === "security-attack") {
      argomon.isSuspended = true;
      opponent.securityCount = 2;
    }
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    digisorption: "Digisorption -3 suspended another Digimon and reduced Argomon's 5-memory evolution cost to 2.",
    declined: "Digisorption was declined, so the other Digimon stayed ready and Argomon paid its full evolution cost.",
    "security-attack":
      "Two other suspended Digimon granted Security Attack +2, so Argomon checked 3 security cards total; the suspended Tamer did not count.",
    "opponent-turn": "Argomon gained no additional security checks during the opponent's turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-050",
        effectKey:
          effect === "digisorption" || effect === "declined" ? "BT2-050/digisorption" : "BT2-050/security-attack",
        description: descriptions[effect] ?? "Argomon's effect state is displayed.",
        timing: effect === "digisorption" || effect === "declined" ? "WhenDigivolving" : "YourTurn",
      },
    ],
  };
}

function rustTyrannomonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const rust = permanent("demo-rusttyrannomon-bt2", "BT2-051", 0, 11000);
  const tamer = permanent("demo-rusttyrannomon-bt2-tamer", effect === "no-green-tamer" ? "BT1-085" : "BT1-089", 0, 0);
  you.battleArea.push(rust, tamer);

  const defender = permanent(
    "demo-rusttyrannomon-bt2-defender",
    effect === "q1022" ? "BT2-050" : "BT1-010",
    1,
    effect === "q1022" ? 12000 : 2000,
  );
  opponent.battleArea.push(defender);
  if (effect === "battle-win") {
    rust.isSuspended = true;
    opponent.trash.push(defender.topCard);
    opponent.battleArea.length = 0;
    const other = permanent("demo-rusttyrannomon-bt2-other", "BT1-011", 1, 2000);
    other.isSuspended = true;
    opponent.battleArea.push(other);
  } else if (effect === "q1022") {
    you.trash.push(rust.topCard);
    you.battleArea.shift();
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    eligible: "With a green Tamer in play, RustTyrannomon may attack an opposing unsuspended Digimon.",
    "battle-win": "RustTyrannomon deleted the target in battle, survived, and suspended another opposing Digimon.",
    q1022: "Q1022: the attacked Digimon remained unsuspended during battle and defeated RustTyrannomon.",
    "no-green-tamer": "A red Tamer does not satisfy the condition, so RustTyrannomon cannot attack a ready Digimon.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-051",
        effectKey: effect === "battle-win" ? "BT2-051/after-battle" : "BT2-051/attack-ready",
        description: descriptions[effect] ?? "RustTyrannomon's effect state is displayed.",
        timing: "YourTurn",
      },
    ],
  };
}

function hagurumonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "played") {
    you.battleArea.push(permanent("demo-hagurumon-bt2-played", "BT2-052", 0, 3000));
  } else if (effect === "digivolved") {
    you.battleArea.push(
      permanent("demo-hagurumon-bt2-digivolved", "BT2-052", 0, 3000, [
        { instanceId: "demo-hagurumon-bt2-kapurimon", cardId: "BT2-005" },
      ]),
    );
    you.hand.push(card("demo-hagurumon-bt2-drawn", "BT2-053", 0));
    you.handCount = 1;
  } else {
    you.battleArea.push(permanent("demo-hagurumon-bt2-red-base", "BT1-001", 0, 0));
    you.hand.push(card("demo-hagurumon-bt2-illegal", "BT2-052", 0));
    you.handCount = 1;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    played: "Hagurumon was played for 2 memory as a 3000 DP Digimon with no effects.",
    digivolved: "Hagurumon digivolved from a black level 2 for 0 memory and drew 1 card.",
    "wrong-color": "Hagurumon cannot use its black evolution requirement on a red level 2.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-052",
        effectKey: `BT2-052/${effect}`,
        description: descriptions[effect] ?? "Hagurumon's card state is displayed.",
        timing: "Main",
      },
    ],
  };
}

function keramonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const hostCardId = effect === "q2814" ? "BT2-082" : "BT2-054";
  const host = permanent("demo-keramon-bt2-host", hostCardId, 0, effect === "q2814" ? 10000 : 3000, [
    { instanceId: "demo-keramon-bt2-source", cardId: "BT2-053" },
  ]);
  you.battleArea.push(host);

  if (effect === "same-name") {
    you.battleArea.push(permanent("demo-keramon-bt2-played-gotsumon", "BT2-054", 0, 3000));
    you.hand.push(card("demo-keramon-bt2-drawn", "BT1-010", 0));
    you.handCount = 1;
  } else if (effect === "wrong-name") {
    you.battleArea.push(permanent("demo-keramon-bt2-played-keramon", "BT2-053", 0, 2000));
  } else if (effect === "q2814") {
    you.battleArea.push(
      permanent("demo-keramon-bt2-token-one", "TOKEN-Diaboromon", 0, 3000),
      permanent("demo-keramon-bt2-token-two", "TOKEN-Diaboromon", 0, 3000),
    );
    you.hand.push(card("demo-keramon-bt2-single-draw", "BT1-010", 0));
    you.handCount = 1;
  } else if (effect === "opponent-turn") {
    you.battleArea.push(permanent("demo-keramon-bt2-opponent-turn-play", "BT2-054", 0, 3000));
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "same-name": "Q1023: playing another Gotsumon matched the evolved host's current name and drew 1 card.",
    "wrong-name": "Q1023: playing Keramon did not match the Gotsumon host's name, so no card was drawn.",
    q2814: "Q2814: 2 Diaboromon Tokens played simultaneously triggered Keramon's inherited draw only once.",
    "opponent-turn": "The inherited effect did not trigger outside its controller's turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-053",
        effectKey: "BT2-053/inherited-draw",
        description: descriptions[effect] ?? "Keramon's inherited effect state is displayed.",
        timing: "YourTurn",
      },
    ],
  };
}

function gotsumonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "attacking-loss" ? 0 : 1;
  state.memory = effect === "attacking-loss" ? -1 : 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const gotsumon = permanent("demo-gotsumon-bt2", "BT2-054", 0, 3000);
  gotsumon.keywords.push("Blocker");
  you.battleArea.push(gotsumon);

  if (effect === "attacking-loss") {
    gotsumon.isSuspended = true;
    opponent.securityCount = 4;
  } else {
    const attacker = permanent("demo-gotsumon-bt2-attacker", "BT1-010", 1, 2000);
    attacker.isSuspended = true;
    opponent.battleArea.push(attacker);
    if (effect === "blocked") gotsumon.isSuspended = true;
    if (effect === "declined") you.securityCount = 4;
  }
  state.players.push(you, opponent);

  if (effect === null || effect === "eligible") {
    const attacker = opponent.battleArea[0]!;
    return {
      state,
      events: [
        {
          kind: "blockWindowOpened",
          attackerPermanentId: attacker.permanentId,
          eligibleBlockerIds: [gotsumon.permanentId],
        },
      ],
    };
  }
  if (effect === "blocked") {
    return { state, events: [{ kind: "blocked", blockerPermanentId: gotsumon.permanentId }] };
  }
  if (effect === "declined") {
    return {
      state,
      events: [
        { kind: "blockDeclined", attackerPermanentId: opponent.battleArea[0]!.permanentId },
        { kind: "securityChecked", seat: 0, revealedCardId: "BT1-011", resolution: "battle" },
      ],
    };
  }
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-054",
        effectKey: "BT2-054/when-attacking",
        description: "Gotsumon lost 2 memory when attacking, crossing the gauge to -1, and the attack still resolved.",
        timing: "WhenAttacking",
      },
    ],
  };
}

function toyAgumonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "rebooted" ? Phase.Active : Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "rebooted" ? 1 : 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "top-card") {
    you.battleArea.push(permanent("demo-toyagumon-bt2-top", "BT2-055", 0, 1000));
  } else {
    const host = permanent("demo-toyagumon-bt2-host", "BT2-065", 0, 11000, [
      { instanceId: "demo-toyagumon-bt2-source", cardId: "BT2-055" },
    ]);
    host.keywords.push("Reboot");
    host.isSuspended = effect !== "rebooted";
    you.battleArea.push(host);
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    inherited: "ToyAgumon's inherited Reboot was active, but it did not immediately unsuspend the host.",
    rebooted: "The inherited Reboot unsuspended the host during the opponent's unsuspend phase.",
    "top-card": "ToyAgumon did not have Reboot while it was the top card because the effect is inherited-only.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-055",
        effectKey: "BT2-055/inherited-reboot",
        description: descriptions[effect] ?? "ToyAgumon's inherited effect state is displayed.",
        timing: "AllTurns",
      },
    ],
  };
}

function numemonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "played") {
    you.battleArea.push(permanent("demo-numemon-bt2-played", "BT2-056", 0, 3000));
  } else if (effect === "digivolved") {
    you.battleArea.push(
      permanent("demo-numemon-bt2-digivolved", "BT2-056", 0, 3000, [
        { instanceId: "demo-numemon-bt2-hagurumon", cardId: "BT2-052" },
      ]),
    );
    you.hand.push(card("demo-numemon-bt2-drawn", "BT2-053", 0));
    you.handCount = 1;
  } else {
    you.battleArea.push(permanent("demo-numemon-bt2-red-base", "BT1-009", 0, 3000));
    you.hand.push(card("demo-numemon-bt2-illegal", "BT2-056", 0));
    you.handCount = 1;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    played: "Numemon was played for 3 memory as a 3000 DP Digimon with no effects.",
    digivolved: "Numemon digivolved from a black level 3 for 1 memory and drew 1 card.",
    "wrong-color": "Numemon cannot use its black evolution requirement on a red level 3.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-056",
        effectKey: `BT2-056/${effect}`,
        description: descriptions[effect] ?? "Numemon's card state is displayed.",
        timing: "Main",
      },
    ],
  };
}

function greymonBlackBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "top-card") {
    you.battleArea.push(permanent("demo-greymon-black-bt2-top", "BT2-057", 0, 4000));
  } else {
    const hasReboot = effect !== "no-reboot";
    const host = permanent("demo-greymon-black-bt2-host", hasReboot ? "BT2-065" : "BT2-064", 0, 11000, [
      { instanceId: "demo-greymon-black-bt2-source", cardId: "BT2-057" },
    ]);
    if (hasReboot) host.keywords.push("Reboot");
    if (hasReboot && effect !== "opponent-turn") host.keywords.push("Jamming");
    if (effect === "security-survived") {
      host.isSuspended = true;
      opponent.securityCount = 4;
    }
    you.battleArea.push(host);
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    active: "During its controller's turn, the Reboot host received Jamming from Greymon's inherited effect.",
    "security-survived": "Jamming prevented the Reboot host from being deleted by a stronger Security Digimon.",
    "no-reboot": "Without Reboot, Greymon's inherited condition failed and the host received no Jamming.",
    "opponent-turn": "The host kept Reboot but lost the inherited Jamming during the opponent's turn.",
    "top-card": "Greymon granted no Jamming while it was the top card because the effect is inherited-only.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-057",
        effectKey: "BT2-057/inherited-jamming",
        description: descriptions[effect] ?? "Greymon's inherited effect state is displayed.",
        timing: "YourTurn",
      },
    ],
  };
}

function guardromonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "attack-rejected" ? 0 : 1;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const guardromon = permanent("demo-guardromon-bt2", "BT2-058", 0, 7000);
  guardromon.keywords.push("Blocker");
  you.battleArea.push(guardromon);

  if (effect !== "attack-rejected") {
    const attacker = permanent("demo-guardromon-bt2-attacker", "BT1-010", 1, 2000);
    attacker.isSuspended = true;
    opponent.battleArea.push(attacker);
    if (effect === "blocked") guardromon.isSuspended = true;
    if (effect === "declined") you.securityCount = 4;
  }
  state.players.push(you, opponent);

  if (effect === null || effect === "eligible") {
    return {
      state,
      events: [
        {
          kind: "blockWindowOpened",
          attackerPermanentId: opponent.battleArea[0]!.permanentId,
          eligibleBlockerIds: [guardromon.permanentId],
        },
      ],
    };
  }
  if (effect === "blocked") {
    return { state, events: [{ kind: "blocked", blockerPermanentId: guardromon.permanentId }] };
  }
  if (effect === "declined") {
    return {
      state,
      events: [
        { kind: "blockDeclined", attackerPermanentId: opponent.battleArea[0]!.permanentId },
        { kind: "securityChecked", seat: 0, revealedCardId: "BT1-011", resolution: "battle" },
      ],
    };
  }
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-058",
        effectKey: "BT2-058/cannot-attack",
        description: "Guardromon's attack declaration was rejected by its Your Turn restriction.",
        timing: "YourTurn",
      },
    ],
  };
}

function kurisarimonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = effect === "matched" || effect === "simultaneous" ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const host = permanent("demo-kurisarimon-bt2-host", effect === "simultaneous" ? "BT2-082" : "BT2-054", 0, 4000);
  host.stack.push(card("demo-kurisarimon-bt2-source", "BT2-059", 0));
  you.battleArea.push(host);
  if (effect === "matched") you.battleArea.push(permanent("demo-kurisarimon-bt2-match", "BT2-054", 0, 4000));
  if (effect === "different") you.battleArea.push(permanent("demo-kurisarimon-bt2-different", "BT2-059", 0, 4000));
  if (effect === "simultaneous") {
    you.battleArea.push(permanent("demo-kurisarimon-bt2-token-a", "TOKEN-DIABOROMON", 0, 3000));
    you.battleArea.push(permanent("demo-kurisarimon-bt2-token-b", "TOKEN-DIABOROMON", 0, 3000));
  }
  state.players.push(you, opponent);

  const description =
    effect === "matched"
      ? "A Digimon matching the host's name was played. Kurisarimon gained 1 memory."
      : effect === "simultaneous"
        ? "Two Diaboromon Tokens were played in one timing. Kurisarimon triggered once and gained 1 memory."
        : effect === "opponent-turn"
          ? "The matching Digimon was played during the opponent's turn, so Kurisarimon did not trigger."
          : "Kurisarimon was played, but the inherited effect compares against the evolved host's name and did not trigger.";

  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-059",
        effectKey: `BT2-059/${effect ?? "different"}`,
        description,
        timing: effect === "opponent-turn" ? "OpponentsTurn" : "YourTurn",
      },
    ],
  };
}

function megadramonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "played") {
    you.battleArea.push(permanent("demo-megadramon-bt2-played", "BT2-060", 0, 9000));
  } else if (effect === "digivolved") {
    you.battleArea.push(
      permanent("demo-megadramon-bt2-digivolved", "BT2-060", 0, 9000, [
        { instanceId: "demo-megadramon-bt2-guardromon", cardId: "BT2-058" },
      ]),
    );
    you.hand.push(card("demo-megadramon-bt2-drawn", "BT2-053", 0));
    you.handCount = 1;
  } else {
    you.battleArea.push(permanent("demo-megadramon-bt2-red-base", "BT1-015", 0, 4000));
    you.hand.push(card("demo-megadramon-bt2-illegal", "BT2-060", 0));
    you.handCount = 1;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    played: "Megadramon was played for 6 memory as a 9000 DP Digimon with no effects.",
    digivolved: "Megadramon digivolved from a black level 4 for 3 memory and drew 1 card.",
    "wrong-color": "Megadramon cannot use its black evolution requirement on a red level 4.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-060",
        effectKey: `BT2-060/${effect}`,
        description: descriptions[effect] ?? "Megadramon's card state is displayed.",
        timing: "Main",
      },
    ],
  };
}

function andromonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "attacked" ? 0 : 1;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const andromon = permanent("demo-andromon-bt2", "BT2-061", 0, 7000);
  andromon.keywords.push("Blocker");
  you.battleArea.push(andromon);
  if (effect !== "attacked") {
    const attacker = permanent("demo-andromon-bt2-attacker", "BT1-010", 1, 2000);
    attacker.isSuspended = true;
    opponent.battleArea.push(attacker);
    if (effect === "blocked") andromon.isSuspended = true;
    if (effect === "declined") you.securityCount = 4;
  } else {
    andromon.isSuspended = true;
    opponent.securityCount = 4;
  }
  state.players.push(you, opponent);

  if (effect === null || effect === "eligible") {
    return {
      state,
      events: [
        {
          kind: "blockWindowOpened",
          attackerPermanentId: opponent.battleArea[0]!.permanentId,
          eligibleBlockerIds: [andromon.permanentId],
        },
      ],
    };
  }
  const descriptions: Record<string, string> = {
    blocked: "Andromon suspended to block and redirected the attack away from the player.",
    declined: "Andromon declined to block, remained ready, and the attack checked security.",
    attacked: "Andromon may attack during its controller's turn because it has no attack restriction.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-061",
        effectKey: `BT2-061/${effect}`,
        description: descriptions[effect] ?? "Andromon's Blocker state is displayed.",
        timing: "Main",
      },
    ],
  };
}

function infermonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = effect === "reduced" || effect === "wrong-name" ? 7 : 6;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const evolvedCardId = effect === "wrong-name" ? "BT2-065" : "BT2-082";
  const evolvedDP = effect === "wrong-name" ? 12000 : 10000;
  const evolved = permanent("demo-infermon-bt2-evolved", evolvedCardId, 0, evolvedDP, [
    { instanceId: "demo-infermon-bt2-source", cardId: "BT2-062" },
  ]);
  if (effect === "breeding") {
    evolved.inBreeding = true;
    you.breeding = evolved;
  } else {
    you.battleArea.push(evolved);
  }
  state.players.push(you, opponent);

  const descriptions: Record<string, string> = {
    reduced: "Infermon reduced the hand digivolution cost into Diaboromon from 4 to 3 memory.",
    breeding: "Infermon in the breeding area did not reduce Diaboromon's digivolution cost.",
    "wrong-name": "Infermon did not reduce the cost because the evolved Digimon was not named Diaboromon.",
    "opponent-turn": "Infermon did not reduce Diaboromon's cost during the opponent's turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-062",
        effectKey: `BT2-062/${effect ?? "reduced"}`,
        description: descriptions[effect ?? "reduced"]!,
        timing: effect === "opponent-turn" ? "OpponentsTurn" : "YourTurn",
      },
    ],
  };
}

function metalGreymonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "opponent-turn" || effect === "rebooted" ? 1 : 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "rebooted") {
    you.battleArea.push(permanent("demo-metalgreymon-bt2", "BT2-063", 0, 7000));
  } else {
    const under = [{ instanceId: "demo-metalgreymon-bt2-source", cardId: "BT2-063" }];
    if (effect !== "no-reboot") under.push({ instanceId: "demo-metalgreymon-bt2-reboot", cardId: "BT2-055" });
    const host = permanent("demo-metalgreymon-bt2-host", "BT2-064", 0, 12000, under);
    if (effect !== "no-reboot") host.keywords.push("Reboot");
    if (effect === null || effect === "inherited-active") host.keywords.push("SecurityAttack+1");
    you.battleArea.push(host);
  }
  state.players.push(you, opponent);

  const descriptions: Record<string, string> = {
    rebooted: "MetalGreymon used Reboot and became ready during the opponent's unsuspend phase.",
    "inherited-active": "The host has Reboot, so MetalGreymon's inherited effect grants Security Attack +1 this turn.",
    "no-reboot": "The host lacks Reboot, so MetalGreymon's inherited effect grants no additional security checks.",
    "opponent-turn":
      "The host keeps Reboot, but MetalGreymon's inherited Security Attack +1 is inactive on the opponent's turn.",
  };
  const selected = effect ?? "inherited-active";
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-063",
        effectKey: `BT2-063/${selected}`,
        description: descriptions[selected]!,
        timing: selected === "opponent-turn" || selected === "rebooted" ? "OpponentsTurn" : "YourTurn",
      },
    ],
  };
}

function hiAndromonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "played") {
    you.battleArea.push(permanent("demo-hiandromon-bt2-played", "BT2-064", 0, 12000));
  } else if (effect === "digivolved") {
    you.battleArea.push(
      permanent("demo-hiandromon-bt2-digivolved", "BT2-064", 0, 12000, [
        { instanceId: "demo-hiandromon-bt2-metalgreymon", cardId: "BT2-063" },
      ]),
    );
    you.hand.push(card("demo-hiandromon-bt2-drawn", "BT2-053", 0));
    you.handCount = 1;
  } else {
    you.battleArea.push(permanent("demo-hiandromon-bt2-red-base", "BT1-020", 0, 6000));
    you.hand.push(card("demo-hiandromon-bt2-illegal", "BT2-064", 0));
    you.handCount = 1;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    played: "HiAndromon was played for 10 memory as a 12000 DP Digimon with no effects.",
    digivolved: "HiAndromon digivolved from a black level 5 for 2 memory and drew 1 card.",
    "wrong-color": "HiAndromon cannot use its black evolution requirement on a red level 5.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-064",
        effectKey: `BT2-064/${effect}`,
        description: descriptions[effect] ?? "HiAndromon's card state is displayed.",
        timing: "Main",
      },
    ],
  };
}

function warGreymonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 1;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const warGreymon = permanent("demo-wargreymon-bt2", "BT2-065", 0, 11000);
  warGreymon.keywords.push("Blocker", "Reboot");
  you.battleArea.push(warGreymon);
  if (effect !== "rebooted") {
    const attacker = permanent("demo-wargreymon-bt2-attacker", "BT1-010", 1, 2000);
    attacker.isSuspended = true;
    opponent.battleArea.push(attacker);
    if (effect === "blocked") warGreymon.isSuspended = true;
    if (effect === "declined") you.securityCount = 4;
  }
  state.players.push(you, opponent);

  if (effect === null || effect === "eligible") {
    return {
      state,
      events: [
        {
          kind: "blockWindowOpened",
          attackerPermanentId: opponent.battleArea[0]!.permanentId,
          eligibleBlockerIds: [warGreymon.permanentId],
        },
      ],
    };
  }
  const descriptions: Record<string, string> = {
    blocked: "WarGreymon suspended to block, redirected the attack, and survived the battle.",
    declined: "WarGreymon declined to block, remained ready, and the attack checked security.",
    rebooted: "WarGreymon used Reboot and became ready during the opponent's unsuspend phase.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-065",
        effectKey: `BT2-065/${effect}`,
        description: descriptions[effect] ?? "WarGreymon's keyword state is displayed.",
        timing: "OpponentsTurn",
      },
    ],
  };
}

function machinedramonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "blocked" || effect === "eligible" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const machinedramon = permanent("demo-machinedramon-bt2", "BT2-066", 0, 11000);
  machinedramon.keywords.push("Blocker");
  you.battleArea.push(machinedramon);

  if (effect === "eligible" || effect === "blocked") {
    const attacker = permanent("demo-machinedramon-bt2-attacker", "BT1-010", 1, 2000);
    attacker.isSuspended = true;
    opponent.battleArea.push(attacker);
    if (effect === "blocked") machinedramon.isSuspended = true;
  } else if (effect === "level-three-stop") {
    opponent.battleArea.push(permanent("demo-machinedramon-bt2-rookie", "BT1-010", 1, 2000));
    opponent.trash.push(card("demo-machinedramon-bt2-trashed", "BT1-017", 1));
  } else {
    opponent.battleArea.push(
      permanent("demo-machinedramon-bt2-target-a", "BT1-017", 1, 4000, [
        { instanceId: "demo-machinedramon-bt2-a-source", cardId: "BT1-010" },
      ]),
    );
    opponent.battleArea.push(
      permanent("demo-machinedramon-bt2-target-b", "BT1-036", 1, 4000, [
        { instanceId: "demo-machinedramon-bt2-b-source", cardId: "BT1-029" },
      ]),
    );
    opponent.trash.push(
      card("demo-machinedramon-bt2-a-trash-1", "BT1-023", 1),
      card("demo-machinedramon-bt2-a-trash-2", "BT1-084", 1),
      card("demo-machinedramon-bt2-b-trash-1", "BT1-041", 1),
      card("demo-machinedramon-bt2-b-trash-2", "BT1-084", 1),
    );
  }
  state.players.push(you, opponent);

  if (effect === "eligible") {
    return {
      state,
      events: [
        {
          kind: "blockWindowOpened",
          attackerPermanentId: opponent.battleArea[0]!.permanentId,
          eligibleBlockerIds: [machinedramon.permanentId],
        },
      ],
    };
  }
  const selected = effect ?? "de-digivolved-two";
  const descriptions: Record<string, string> = {
    "de-digivolved-two": "Machinedramon's On Play effect de-digivolved 2 opposing Digimon by 2 cards each.",
    "level-three-stop": "De-Digivolve stopped after the opposing Digimon became level 3.",
    blocked: "Machinedramon suspended to block, redirected the attack, and protected security.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-066",
        effectKey: `BT2-066/${selected}`,
        description: descriptions[selected]!,
        timing: selected === "blocked" ? "OpponentsTurn" : "OnPlay",
      },
    ],
  };
}

function demiDevimonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "played") {
    you.battleArea.push(permanent("demo-demidevimon-bt2-played", "BT2-067", 0, 3000));
  } else if (effect === "digivolved") {
    const evolved = permanent("demo-demidevimon-bt2-digivolved", "BT2-067", 0, 3000, [
      { instanceId: "demo-demidevimon-bt2-pagumon", cardId: "BT2-007" },
    ]);
    evolved.inBreeding = true;
    you.breeding = evolved;
    you.hand.push(card("demo-demidevimon-bt2-drawn", "BT2-068", 0));
    you.handCount = 1;
  } else {
    const redBase = permanent("demo-demidevimon-bt2-red-base", "BT1-001", 0, 0);
    redBase.inBreeding = true;
    you.breeding = redBase;
    you.hand.push(card("demo-demidevimon-bt2-illegal", "BT2-067", 0));
    you.handCount = 1;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    played: "DemiDevimon was played for 2 memory as a 3000 DP Digimon with no effects.",
    digivolved: "DemiDevimon digivolved from a purple level 2 for 0 memory and drew 1 card.",
    "wrong-color": "DemiDevimon cannot use its purple evolution requirement on a red level 2.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-067",
        effectKey: `BT2-067/${effect}`,
        description: descriptions[effect] ?? "DemiDevimon's card state is displayed.",
        timing: "Main",
      },
    ],
  };
}

function impmonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "battle-deleted" ? 1 : 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const trashedCount = effect === "short-deck" ? 2 : 3;
  for (let index = 0; index < trashedCount; index += 1) {
    you.trash.push(card(`demo-impmon-bt2-trashed-${index}`, `BT1-0${10 + index}`, 0));
  }
  you.trash.push(card("demo-impmon-bt2-deleted", "BT2-068", 0));
  if (effect === "battle-deleted") {
    const attacker = permanent("demo-impmon-bt2-attacker", "BT1-010", 1, 2000);
    attacker.isSuspended = true;
    opponent.battleArea.push(attacker);
  }
  state.players.push(you, opponent);

  const selected = effect ?? "deleted-three";
  const descriptions: Record<string, string> = {
    "deleted-three": "Impmon's On Deletion effect trashed the top 3 cards of its controller's deck.",
    "short-deck": "With only 2 cards left in the deck, Impmon trashed both remaining cards.",
    "battle-deleted": "After Impmon was deleted in battle, its On Deletion effect trashed the top 3 cards.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-068",
        effectKey: `BT2-068/${selected}`,
        description: descriptions[selected]!,
        timing: "OnDeletion",
      },
    ],
  };
}

function gabumonPurpleBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  state.players.push(you, opponent);

  if (effect === null || effect === "choose-trash") {
    you.hand.push(
      card("demo-gabumon-bt2-existing", "BT1-012", 0),
      card("demo-gabumon-bt2-first-draw", "BT1-010", 0),
      card("demo-gabumon-bt2-second-draw", "BT1-011", 0),
    );
    you.handCount = 3;
    you.trash.push(card("demo-gabumon-bt2-source", "BT2-069", 0), card("demo-gabumon-bt2-host", "BT2-074", 0));
    return {
      state,
      decision: {
        decisionId: "demo-gabumon-bt2-trash-choice",
        seat: 0,
        kind: "selectCards",
        promptText: "Trash 1 card from your hand",
        sourceCardId: "BT2-069",
        options: {
          candidateInstanceIds: [
            "demo-gabumon-bt2-existing",
            "demo-gabumon-bt2-first-draw",
            "demo-gabumon-bt2-second-draw",
          ],
          visibleInstanceIds: [
            "demo-gabumon-bt2-existing",
            "demo-gabumon-bt2-first-draw",
            "demo-gabumon-bt2-second-draw",
          ],
          min: 1,
          max: 1,
          timing: "OnDeletion",
          effectText: "[On Deletion] Draw 2. Then trash 1 card from your hand.",
        },
      },
    };
  }

  if (effect === "top-card") {
    you.trash.push(card("demo-gabumon-bt2-deleted-top", "BT2-069", 0));
  } else {
    you.hand.push(card("demo-gabumon-bt2-kept", "BT1-010", 0));
    you.handCount = 1;
    you.trash.push(
      card("demo-gabumon-bt2-source", "BT2-069", 0),
      card("demo-gabumon-bt2-host", "BT2-074", 0),
      card("demo-gabumon-bt2-discarded", "BT1-011", 0),
    );
  }
  const descriptions: Record<string, string> = {
    resolved: "Gabumon's inherited On Deletion effect drew 2 cards, then trashed the selected card from hand.",
    "top-card": "Gabumon was the top card, so its inherited On Deletion effect did not activate.",
    "battle-deleted": "The host was deleted in battle; Gabumon drew 2, then trashed 1 card from hand.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-069",
        effectKey: `BT2-069/${effect}`,
        description: descriptions[effect]!,
        timing: "OnDeletion",
      },
    ],
  };
}

function tapirmonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "battle-deleted" ? 1 : 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.trash.push(card("demo-tapirmon-bt2-deleted", "BT2-070", 0));
  if (effect !== "empty-deck") {
    you.hand.push(card("demo-tapirmon-bt2-drawn", "BT1-010", 0));
    you.handCount = 1;
  }
  if (effect === "battle-deleted") {
    const attacker = permanent("demo-tapirmon-bt2-attacker", "BT1-084", 1, 15000);
    attacker.isSuspended = true;
    opponent.battleArea.push(attacker);
  }
  state.players.push(you, opponent);

  const selected = effect ?? "deleted-drew";
  const descriptions: Record<string, string> = {
    "deleted-drew": "Tapirmon's On Deletion effect drew the top card of its controller's deck.",
    "empty-deck": "Tapirmon's On Deletion effect resolved with no card to draw from the empty deck.",
    "battle-deleted": "After Tapirmon was deleted in battle, its On Deletion effect drew 1 card.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-070",
        effectKey: `BT2-070/${selected}`,
        description: descriptions[selected]!,
        timing: "OnDeletion",
      },
    ],
  };
}

function wizardmonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "retaliation-battle") {
    you.battleArea.push(permanent("demo-wizardmon-bt2-yellow", "BT2-034", 0, 4000));
    you.hand.push(card("demo-wizardmon-bt2-drawn", "BT1-010", 0));
    you.handCount = 1;
    you.trash.push(card("demo-wizardmon-bt2-deleted", "BT2-071", 0));
    opponent.trash.push(card("demo-wizardmon-bt2-retaliated", "BT1-084", 1));
  } else {
    const wizardmon = permanent("demo-wizardmon-bt2", "BT2-071", 0, 4000);
    if (effect === null || effect === "active") wizardmon.keywords.push("Retaliation");
    you.battleArea.push(wizardmon);
    if (effect === null || effect === "active")
      you.battleArea.push(permanent("demo-wizardmon-bt2-yellow", "BT2-034", 0, 4000));
    if (effect === "opponent-yellow")
      opponent.battleArea.push(permanent("demo-wizardmon-bt2-opponent-yellow", "BT2-034", 1, 4000));
    if (effect === "removed-yellow") you.trash.push(card("demo-wizardmon-bt2-removed-yellow", "BT2-034", 0));
  }
  state.players.push(you, opponent);

  const selected = effect ?? "active";
  const descriptions: Record<string, string> = {
    active: "Wizardmon has Retaliation while its controller has a yellow Digimon in play.",
    "opponent-yellow": "An opponent's yellow Digimon does not satisfy Wizardmon's Retaliation condition.",
    "removed-yellow": "Wizardmon lost Retaliation after its controller's yellow Digimon left play.",
    "retaliation-battle":
      "Wizardmon lost the battle, deleted the opposing Digimon with Retaliation, and drew 1 on deletion.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-071",
        effectKey: `BT2-071/${selected}`,
        description: descriptions[selected]!,
        timing: selected === "retaliation-battle" ? "OnDeletion" : "AllTurns",
      },
    ],
  };
}

function vilemonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "eligible" || effect === "blocked" ? 1 : 0;
  state.memory = effect === "attacked" ? 1 : effect === "blocked" || effect === "eligible" ? -3 : -1;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const vilemon = permanent("demo-vilemon-bt2", "BT2-072", 0, 6000);
  vilemon.keywords.push("Blocker");
  you.battleArea.push(vilemon);
  if (effect === "eligible" || effect === "blocked") {
    const attacker = permanent("demo-vilemon-bt2-attacker", "BT1-010", 1, 2000);
    attacker.isSuspended = true;
    opponent.battleArea.push(attacker);
    if (effect === "blocked") vilemon.isSuspended = true;
  } else {
    vilemon.isSuspended = true;
    opponent.securityCount = 4;
  }
  state.players.push(you, opponent);

  if (effect === "eligible") {
    return {
      state,
      events: [
        {
          kind: "blockWindowOpened",
          attackerPermanentId: opponent.battleArea[0]!.permanentId,
          eligibleBlockerIds: [vilemon.permanentId],
        },
      ],
    };
  }
  const selected = effect ?? "attacked";
  const descriptions: Record<string, string> = {
    attacked: "Vilemon attacked, lost 2 memory, and completed its security check.",
    "crossed-zero": "Vilemon completed the security check even though losing 2 memory crossed zero.",
    blocked: "Vilemon blocked the attack without losing memory because it was not the attacking Digimon.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-072",
        effectKey: `BT2-072/${selected}`,
        description: descriptions[selected]!,
        timing: selected === "blocked" ? "OpponentsTurn" : "WhenAttacking",
      },
    ],
  };
}

function garurumonPurpleBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = effect === "first-gain" || effect === "once-only" || effect === "simultaneous" ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(
    permanent("demo-garurumon-bt2-host", "BT2-074", 0, 7000, [
      { instanceId: "demo-garurumon-bt2-source", cardId: "BT2-073" },
    ]),
  );
  const deletedCount = effect === "simultaneous" || effect === "once-only" ? 2 : 1;
  for (let index = 0; index < deletedCount; index += 1) {
    const owner = effect === "opponent-digimon" ? 1 : 0;
    const targetTrash = owner === 0 ? you.trash : opponent.trash;
    targetTrash.push(card(`demo-garurumon-bt2-deleted-${index}`, index === 0 ? "BT2-068" : "BT2-070", owner));
  }
  state.players.push(you, opponent);

  const selected = effect ?? "first-gain";
  const descriptions: Record<string, string> = {
    "first-gain": "Garurumon's inherited effect gained 1 memory when another own Digimon was deleted.",
    "once-only":
      "A second separate deletion in the same turn did not gain more memory because the effect is once per turn.",
    simultaneous: "Two other Digimon deleted simultaneously caused only 1 memory gain, matching Q1026.",
    "opponent-digimon": "Deleting an opponent's Digimon did not trigger Garurumon's inherited effect.",
    "opponent-turn": "Deleting another own Digimon during the opponent's turn did not trigger Garurumon.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-073",
        effectKey: `BT2-073/${selected}`,
        description: descriptions[selected]!,
        timing: selected === "opponent-turn" ? "OpponentsTurn" : "YourTurn",
      },
    ],
  };
}

function devimonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "effect-deletion") {
    you.trash.push(card("demo-devimon-bt2-deleted", "BT2-074", 0));
    opponent.battleArea.push(permanent("demo-devimon-bt2-survivor", "BT1-084", 1, 15000));
  } else {
    if (effect === "inherited-battle") {
      you.trash.push(card("demo-devimon-bt2-source", "BT2-074", 0), card("demo-devimon-bt2-host", "BT2-075", 0));
    } else {
      you.trash.push(card("demo-devimon-bt2-source", "BT2-074", 0));
    }
    opponent.trash.push(card("demo-devimon-bt2-retaliated", "BT1-084", 1));
  }
  state.players.push(you, opponent);

  const selected = effect ?? "printed-battle";
  const descriptions: Record<string, string> = {
    "printed-battle": "Devimon lost the battle and deleted the opposing Digimon with printed Retaliation.",
    "inherited-battle": "Devimon's inherited Retaliation deleted the Digimon that defeated its host in battle.",
    "effect-deletion": "Devimon was deleted by an effect, so Retaliation did not delete the opposing Digimon.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-074",
        effectKey: `BT2-074/${selected}`,
        description: descriptions[selected]!,
        timing: selected === "effect-deletion" ? "OnDeletion" : "AfterBattle",
      },
    ],
  };
}

function myotismonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "played") {
    you.battleArea.push(permanent("demo-myotismon-bt2-played", "BT2-075", 0, 7000));
  } else if (effect === "digivolved") {
    you.battleArea.push(
      permanent("demo-myotismon-bt2-digivolved", "BT2-075", 0, 7000, [
        { instanceId: "demo-myotismon-bt2-devimon", cardId: "BT2-074" },
      ]),
    );
    you.hand.push(card("demo-myotismon-bt2-drawn", "BT2-068", 0));
    you.handCount = 1;
  } else {
    you.battleArea.push(permanent("demo-myotismon-bt2-red-base", "BT1-015", 0, 4000));
    you.hand.push(card("demo-myotismon-bt2-illegal", "BT2-075", 0));
    you.handCount = 1;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    played: "Myotismon was played for 6 memory as a 7000 DP Digimon with no effects.",
    digivolved: "Myotismon digivolved from a purple level 4 for 2 memory and drew 1 card.",
    "wrong-color": "Myotismon cannot use its purple evolution requirement on a red level 4.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-075",
        effectKey: `BT2-075/${effect}`,
        description: descriptions[effect] ?? "Myotismon's card state is displayed.",
        timing: "Main",
      },
    ],
  };
}

function pumpkinmonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  state.players.push(you, opponent);

  if (effect === null || effect === "choose-trash") {
    you.hand.push(
      card("demo-pumpkinmon-bt2-existing", "BT1-012", 0),
      card("demo-pumpkinmon-bt2-first-draw", "BT1-010", 0),
      card("demo-pumpkinmon-bt2-second-draw", "BT1-011", 0),
    );
    you.handCount = 3;
    you.trash.push(card("demo-pumpkinmon-bt2-source", "BT2-076", 0), card("demo-pumpkinmon-bt2-host", "BT2-079", 0));
    return {
      state,
      decision: {
        decisionId: "demo-pumpkinmon-bt2-trash-choice",
        seat: 0,
        kind: "selectCards",
        promptText: "Trash 1 card from your hand",
        sourceCardId: "BT2-076",
        options: {
          candidateInstanceIds: [
            "demo-pumpkinmon-bt2-existing",
            "demo-pumpkinmon-bt2-first-draw",
            "demo-pumpkinmon-bt2-second-draw",
          ],
          visibleInstanceIds: [
            "demo-pumpkinmon-bt2-existing",
            "demo-pumpkinmon-bt2-first-draw",
            "demo-pumpkinmon-bt2-second-draw",
          ],
          min: 1,
          max: 1,
          timing: "OnDeletion",
          effectText: "[On Deletion] Draw 2. Then trash 1 card from your hand.",
        },
      },
    };
  }

  if (effect === "top-card") {
    you.trash.push(card("demo-pumpkinmon-bt2-deleted-top", "BT2-076", 0));
  } else {
    you.hand.push(card("demo-pumpkinmon-bt2-kept", "BT1-010", 0));
    you.handCount = 1;
    you.trash.push(
      card("demo-pumpkinmon-bt2-source", "BT2-076", 0),
      card("demo-pumpkinmon-bt2-host", "BT2-079", 0),
      card("demo-pumpkinmon-bt2-discarded", "BT1-011", 0),
    );
  }
  const descriptions: Record<string, string> = {
    resolved: "Pumpkinmon's inherited On Deletion effect drew 2 cards, then trashed the selected card from hand.",
    "top-card": "Pumpkinmon was the top card, so its inherited On Deletion effect did not activate.",
    "battle-deleted": "The host was deleted in battle; Pumpkinmon drew 2, then trashed 1 card from hand.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-076",
        effectKey: `BT2-076/${effect}`,
        description: descriptions[effect]!,
        timing: "OnDeletion",
      },
    ],
  };
}

function kimeramonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const kimeramon = permanent("demo-kimeramon-bt2", "BT2-077", 0, 7000);
  const cost = permanent("demo-kimeramon-bt2-cost", "BT2-067", 0, 3000);
  const breeding = permanent("demo-kimeramon-bt2-breeding", "BT2-067", 0, 3000);
  breeding.inBreeding = true;
  const levelFive = permanent("demo-kimeramon-bt2-level-five", "BT1-074", 1, 7000);
  const higherLevel = permanent("demo-kimeramon-bt2-higher-level", "BT1-084", 1, 15000);
  you.battleArea.push(kimeramon);
  if (effect !== "resolved") you.battleArea.push(cost);
  you.breeding = breeding;
  opponent.battleArea.push(higherLevel);
  if (effect !== "resolved") opponent.battleArea.push(levelFive);
  if (effect === "resolved") {
    you.trash.push(card("demo-kimeramon-bt2-cost-card", "BT2-067", 0));
    opponent.trash.push(card("demo-kimeramon-bt2-target-card", "BT1-074", 1));
  }
  state.players.push(you, opponent);

  const effectText =
    "[On Play] You may delete one of your other Digimon to delete 1 of your opponent's level 5 or lower Digimon.";
  if (effect === null || effect === "optional") {
    return {
      state,
      decision: {
        decisionId: "demo-kimeramon-bt2-optional",
        seat: 0,
        kind: "optional",
        promptText: "Use Kimeramon's On Play effect?",
        sourceCardId: "BT2-077",
        options: { timing: "OnPlay", effectText },
      },
    };
  }
  if (effect === "choose-cost") {
    return {
      state,
      decision: {
        decisionId: "demo-kimeramon-bt2-cost",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Delete 1 of your other Digimon",
        sourceCardId: "BT2-077",
        options: {
          candidateInstanceIds: [cost.permanentId],
          min: 1,
          max: 1,
          timing: "OnPlay",
          effectText,
        },
      },
    };
  }
  if (effect === "choose-target") {
    return {
      state,
      decision: {
        decisionId: "demo-kimeramon-bt2-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Delete 1 opposing level 5 or lower Digimon",
        sourceCardId: "BT2-077",
        options: {
          candidateInstanceIds: [levelFive.permanentId],
          min: 1,
          max: 1,
          timing: "OnPlay",
          effectText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    resolved: "Kimeramon deleted another battle-area Digimon as the cost, then deleted the opposing level 5 Digimon.",
    declined: "Kimeramon's optional On Play effect was declined, so neither Digimon was deleted.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-077",
        effectKey: `BT2-077/${effect}`,
        description: descriptions[effect]!,
        timing: "OnPlay",
      },
    ],
  };
}

function wereGarurumonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const hostCardId = effect === "top-card" ? "BT2-078" : "BT2-079";
  const under = effect === "top-card" ? [] : [{ instanceId: "demo-weregarurumon-bt2-source", cardId: "BT2-078" }];
  const host = permanent("demo-weregarurumon-bt2-host", hostCardId, 0, effect === "top-card" ? 7000 : 10000, under);
  host.isSuspended = effect === "declined" || effect === "once-used" || effect === "top-card";
  you.battleArea.push(host);
  const firstCost = permanent("demo-weregarurumon-bt2-first-cost", "BT2-068", 0, 1000);
  const secondCost = permanent("demo-weregarurumon-bt2-second-cost", "BT2-070", 0, 2000);
  if (effect !== "unsuspended") you.battleArea.push(firstCost);
  if (effect === "choose-cost" || effect === "once-used") you.battleArea.push(secondCost);
  if (effect === "choose-cost") {
    const breeding = permanent("demo-weregarurumon-bt2-breeding", "BT2-067", 0, 3000);
    breeding.inBreeding = true;
    you.breeding = breeding;
  }
  if (effect === "unsuspended") you.trash.push(card("demo-weregarurumon-bt2-paid", "BT2-068", 0));
  state.players.push(you, opponent);

  const effectText =
    "[When Attacking] [Once Per Turn] You may delete 1 of your other Digimon to unsuspend this Digimon.";
  if (effect === null || effect === "optional") {
    return {
      state,
      decision: {
        decisionId: "demo-weregarurumon-bt2-optional",
        seat: 0,
        kind: "optional",
        promptText: "Use WereGarurumon's inherited effect?",
        sourceCardId: "BT2-078",
        options: { timing: "WhenAttacking", effectText },
      },
    };
  }
  if (effect === "choose-cost") {
    return {
      state,
      decision: {
        decisionId: "demo-weregarurumon-bt2-cost",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Delete 1 of your other Digimon",
        sourceCardId: "BT2-078",
        options: {
          candidateInstanceIds: [firstCost.permanentId, secondCost.permanentId],
          min: 1,
          max: 1,
          timing: "WhenAttacking",
          effectText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    unsuspended: "The host deleted another Digimon as the cost and unsuspended during its attack.",
    declined:
      "The optional inherited effect was declined, so the host remained suspended and the other Digimon survived.",
    "once-used":
      "On the second attack that turn, the inherited effect could not activate again and the host remained suspended.",
    "top-card": "WereGarurumon was the top card, so its inherited When Attacking effect did not activate.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-078",
        effectKey: `BT2-078/${effect}`,
        description: descriptions[effect]!,
        timing: "WhenAttacking",
      },
    ],
  };
}

function venomMyotismonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "opponent-suspended" || effect === "two-suspended" || effect === "own-suspended" ? 1 : 0;
  state.memory = effect === "opponent-suspended" ? -1 : effect === "two-suspended" ? -2 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const venomMyotismon = permanent("demo-venommyotismon-bt2", "BT2-079", 0, 12000);
  venomMyotismon.keywords.push("SecurityAttack+1");
  venomMyotismon.isSuspended = effect === null || effect === "double-check";
  you.battleArea.push(venomMyotismon);
  if (effect === null || effect === "double-check") {
    opponent.securityCount = 1;
  } else if (effect === "own-suspended") {
    const own = permanent("demo-venommyotismon-bt2-own", "BT2-068", 0, 1000);
    own.isSuspended = true;
    you.battleArea.push(own);
  } else {
    const first = permanent("demo-venommyotismon-bt2-first", "BT1-010", 1, 2000);
    first.isSuspended = true;
    opponent.battleArea.push(first);
    if (effect === "two-suspended") {
      const second = permanent("demo-venommyotismon-bt2-second", "BT1-011", 1, 3000);
      second.isSuspended = true;
      opponent.battleArea.push(second);
    }
  }
  state.players.push(you, opponent);

  const selected = effect ?? "double-check";
  const descriptions: Record<string, string> = {
    "double-check": "Security Attack +1 made VenomMyotismon check 2 security cards in one attack.",
    "opponent-suspended": "An opposing Digimon became suspended on its turn, so VenomMyotismon gained 1 memory.",
    "two-suspended":
      "Two opposing Digimon became suspended in separate events, so VenomMyotismon gained 2 memory total.",
    "own-suspended": "Suspending VenomMyotismon's controller's Digimon did not gain memory.",
    "controller-turn":
      "An opposing Digimon became suspended during VenomMyotismon's controller's turn, so no memory was gained.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-079",
        effectKey: `BT2-079/${selected}`,
        description: descriptions[selected]!,
        timing:
          selected === "double-check" ? "WhenAttacking" : selected === "controller-turn" ? "YourTurn" : "OpponentsTurn",
      },
    ],
  };
}

function rinaShinomiyaBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const rina = permanent("demo-rina-bt2", "BT2-086", 0, 0);
  if (effect === "security-played") {
    you.battleArea.push(rina);
  } else if (effect === "reveal-vee" || effect === "filter-card-kind") {
    you.battleArea.push(rina);
    you.hand.push(card("demo-rina-bt2-added", "BT2-026", 0));
    you.deck.push(
      card("demo-rina-bt2-bottom-a", effect === "filter-card-kind" ? "BT2-002" : "BT2-022", 0),
      card("demo-rina-bt2-bottom-b", effect === "filter-card-kind" ? "BT12-101" : "BT2-023", 0),
    );
  } else {
    rina.isSuspended = effect === null || effect === "blue-attacker";
    you.battleArea.push(rina);
    const attackerId = effect === "non-blue-attacker" ? "BT1-010" : "BT2-021";
    const attacker = permanent(
      "demo-rina-bt2-attacker",
      attackerId,
      0,
      effect === null || effect === "blue-attacker" ? 5000 : 4000,
    );
    attacker.isSuspended = true;
    you.battleArea.push(attacker);
  }
  state.players.push(you, opponent);

  const selected = effect ?? "blue-attacker";
  const descriptions: Record<string, string> = {
    "blue-attacker": "Rina suspended to give the attacking blue Digimon +1000 DP for the turn.",
    declined: "Rina's optional effect was declined, so she stayed unsuspended and gave no DP.",
    "non-blue-attacker": "The attacking Digimon was not blue, so Rina did not activate.",
    "reveal-vee": "Rina revealed 3 cards, added a Digimon with Vee in its name, and bottom-decked the other 2.",
    "filter-card-kind":
      "Only the Vee-named Digimon was eligible; the Vee-named Digi-Egg and Option went to deck bottom.",
    "security-played": "Rina's Security effect played her without paying the memory cost.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-086",
        effectKey: `BT2-086/${selected}`,
        description: descriptions[selected]!,
        timing:
          selected === "security-played"
            ? "Security"
            : selected.startsWith("reveal") || selected === "filter-card-kind"
              ? "OnPlay"
              : "YourTurn",
      },
    ],
  };
}

function joeKidoBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = effect === null || effect === "memory-gained" ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const joe = permanent("demo-joe-bt2", "BT2-085", 0, 0);
  joe.isSuspended = effect === null || effect === "memory-gained";
  you.battleArea.push(joe);
  if (effect === "own-source") {
    you.trash.push(card("demo-joe-bt2-own-source", "BT1-010", 0));
  } else if (effect === "return-disposal") {
    opponent.hand.push(card("demo-joe-bt2-returned", "BT1-019", 1));
    opponent.trash.push(card("demo-joe-bt2-disposed", "BT1-010", 1));
  } else if (effect !== "security-played") {
    opponent.trash.push(card("demo-joe-bt2-opponent-source", "BT1-010", 1));
  }
  state.players.push(you, opponent);

  const selected = effect ?? "memory-gained";
  const descriptions: Record<string, string> = {
    "memory-gained": "An opponent's digivolution card was trashed by an effect, so Joe suspended to gain 1 memory.",
    declined: "Joe's optional effect was declined, so he stayed unsuspended and gained no memory.",
    "own-source": "The controller's own digivolution card was trashed, so Joe did not activate.",
    "opponent-turn": "The opponent's digivolution card was trashed during their turn, so Joe did not activate.",
    "return-disposal":
      "Sources disposed of when their Digimon returned to hand did not count as being trashed for Joe's effect.",
    "security-played": "Joe's Security effect played him without paying the memory cost.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-085",
        effectKey: `BT2-085/${selected}`,
        description: descriptions[selected]!,
        timing: selected === "security-played" ? "Security" : "YourTurn",
      },
    ],
  };
}

function soraTakenouchiBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const sora = permanent("demo-sora-bt2", "BT2-084", 0, 0);
  if (effect === "security-played") {
    you.battleArea.push(sora);
  } else {
    sora.isSuspended = effect === null || effect === "player-attack" || effect === "blocked-after-declaration";
    you.battleArea.push(sora);
    const attackerId = effect === "non-red-attacker" ? "BT2-020" : "BT1-010";
    const attacker = permanent(
      "demo-sora-bt2-attacker",
      attackerId,
      0,
      effect === null || effect === "player-attack" || effect === "blocked-after-declaration" ? 6000 : 4000,
    );
    attacker.isSuspended = true;
    you.battleArea.push(attacker);
    if (effect === "digimon-target" || effect === "blocked-after-declaration") {
      const target = permanent("demo-sora-bt2-target", "BT1-011", 1, 3000);
      target.isSuspended = true;
      opponent.battleArea.push(target);
    }
  }
  state.players.push(you, opponent);

  const selected = effect ?? "player-attack";
  const descriptions: Record<string, string> = {
    "player-attack": "Sora suspended to give the attacking red Digimon +2000 DP for the turn.",
    "blocked-after-declaration":
      "The attack was declared against the player, so the +2000 DP remained after Blocker changed the target.",
    "digimon-target": "The red Digimon attacked another Digimon, so Sora did not activate.",
    "non-red-attacker": "The attacking Digimon was not red, so Sora did not activate.",
    declined: "Sora's optional effect was declined, so she stayed unsuspended and gave no DP.",
    "security-played": "Sora's Security effect played her without paying the memory cost.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-084",
        effectKey: `BT2-084/${selected}`,
        description: descriptions[selected]!,
        timing: selected === "security-played" ? "Security" : "YourTurn",
      },
    ],
  };
}

function millenniummonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === null || effect === "returned-to-bottom") {
    you.battleArea.push(permanent("demo-millenniummon-bt2", "BT2-083", 0, 13000));
    opponent.deck.push(card("demo-millenniummon-bt2-target", "BT2-020", 1));
    opponent.trash.push(card("demo-millenniummon-bt2-source", "BT2-013", 1));
  } else if (effect === "replayed-without-sources") {
    you.battleArea.push(permanent("demo-millenniummon-bt2-replayed", "BT2-083", 0, 13000));
    you.trash.push(
      card("demo-millenniummon-bt2-source-a", "BT2-066", 0),
      card("demo-millenniummon-bt2-source-b", "BT2-057", 0),
    );
  } else {
    you.trash.push(card("demo-millenniummon-bt2-deleted", "BT2-083", 0));
    if (effect === "declined-replay") you.trash.push(card("demo-millenniummon-bt2-source", "BT2-066", 0));
  }
  state.players.push(you, opponent);

  const selected = effect ?? "returned-to-bottom";
  const descriptions: Record<string, string> = {
    "returned-to-bottom":
      "Millenniummon returned the opposing Digimon to the bottom of its deck and trashed only that Digimon's sources.",
    "replayed-without-sources":
      "After deletion with digivolution cards, Millenniummon played itself from trash for free without its former sources.",
    "no-sources": "Millenniummon had no digivolution cards when deleted, so it remained in trash.",
    "declined-replay":
      "Millenniummon's optional On Deletion replay was declined, so it and its former source remained in trash.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-083",
        effectKey: `BT2-083/${selected}`,
        description: descriptions[selected]!,
        timing: selected === "returned-to-bottom" ? "WhenDigivolving" : "OnDeletion",
      },
    ],
  };
}

function diaboromonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "prevent-with-card") {
    you.battleArea.push(permanent("demo-diaboromon-bt2-protected", "BT2-082", 0, 10000));
    you.trash.push(card("demo-diaboromon-bt2-cost", "BT5-084", 0));
  } else if (effect === "prevent-with-token") {
    you.battleArea.push(permanent("demo-diaboromon-bt2-protected", "BT2-082", 0, 10000));
  } else if (effect === "effect-deletion") {
    you.battleArea.push(permanent("demo-diaboromon-bt2-other", "BT5-084", 0, 10000));
    you.trash.push(card("demo-diaboromon-bt2-deleted", "BT2-082", 0));
  } else {
    const source = permanent("demo-diaboromon-bt2", "BT2-082", 0, 10000);
    source.isSuspended = true;
    you.battleArea.push(source);
    if (effect === "token-played") {
      you.battleArea.push(permanent("demo-diaboromon-bt2-token", "TOKEN-Diaboromon", 0, 3000));
    }
  }
  state.players.push(you, opponent);

  const selected = effect ?? "token-played";
  const descriptions: Record<string, string> = {
    "token-played": "Diaboromon played a level 6 white Diaboromon Token with 3000 DP without paying its cost.",
    declined: "Diaboromon's optional When Attacking effect was declined, so no Token was played.",
    "prevent-with-card": "Another Diaboromon was deleted to prevent this Diaboromon's battle deletion.",
    "prevent-with-token": "A Diaboromon Token was deleted to prevent this Diaboromon's battle deletion.",
    "effect-deletion": "Effect deletion was not a battle, so Diaboromon could not use its prevention effect.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-082",
        effectKey: `BT2-082/${selected}`,
        description: descriptions[selected]!,
        timing: selected === "token-played" || selected === "declined" ? "WhenAttacking" : "AllTurns",
      },
    ],
  };
}

function metalGarurumonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const metalGarurumon = permanent("demo-metalgarurumon-bt2", "BT2-081", 0, 11000);
  metalGarurumon.isSuspended = true;
  you.battleArea.push(metalGarurumon);
  const eligible = card("demo-metalgarurumon-bt2-eligible", "BT2-067", 0);
  const dracmon = card("demo-metalgarurumon-bt2-dracmon", "ST6-04", 0);
  const levelFour = card("demo-metalgarurumon-bt2-level-four", "BT2-071", 0);
  const yellow = card("demo-metalgarurumon-bt2-yellow", "BT2-034", 0);
  const option = card("demo-metalgarurumon-bt2-option", "ST6-15", 0);
  if (effect === "played-level-three") {
    you.battleArea.push(permanent("demo-metalgarurumon-bt2-played", "BT2-067", 0, 2000));
  } else if (effect === "suppressed-on-play") {
    you.battleArea.push(permanent("demo-metalgarurumon-bt2-played", "ST6-04", 0, 2000));
    you.trash.push(option);
  } else {
    you.trash.push(eligible, dracmon, levelFour, yellow, option);
  }
  state.players.push(you, opponent);

  const effectText =
    "[When Attacking] You may play 1 purple level 3 Digimon card from your trash without paying its memory cost. Any [On Play] effects on Digimon played with this effect don't activate.";
  if (effect === null || effect === "choose-level-three") {
    return {
      state,
      decision: {
        decisionId: "demo-metalgarurumon-bt2-selection",
        seat: 0,
        kind: "selectCards",
        promptText: "Play 1 purple level 3 Digimon",
        sourceCardId: "BT2-081",
        options: {
          candidateInstanceIds: [eligible.instanceId, dracmon.instanceId],
          visibleInstanceIds: [
            eligible.instanceId,
            dracmon.instanceId,
            levelFour.instanceId,
            yellow.instanceId,
            option.instanceId,
          ],
          min: 1,
          max: 1,
          timing: "WhenAttacking",
          effectText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    "played-level-three": "MetalGarurumon played a purple level 3 Digimon from trash without paying its cost.",
    "suppressed-on-play": "Dracmon was played, but its On Play effect was suppressed and the Option remained in trash.",
    declined: "MetalGarurumon's optional When Attacking effect was declined, so every card remained in trash.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-081",
        effectKey: `BT2-081/${effect}`,
        description: descriptions[effect]!,
        timing: "WhenAttacking",
      },
    ],
  };
}

function piedmonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "retaliation-battle") {
    you.trash.push(card("demo-piedmon-bt2-deleted", "BT2-080", 0));
    opponent.trash.push(card("demo-piedmon-bt2-retaliated", "BT1-084", 1));
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectResolved",
          seat: 0,
          sourceCardId: "BT2-080",
          effectKey: "BT2-080/retaliation-battle",
          description: "Piedmon lost the battle and deleted the opposing Digimon with Retaliation.",
          timing: "AfterBattle",
        },
      ],
    };
  }

  const piedmon = permanent("demo-piedmon-bt2", "BT2-080", 0, 10000);
  piedmon.keywords.push("Retaliation");
  you.battleArea.push(piedmon);
  const eligibleRookie = card("demo-piedmon-bt2-rookie", "BT2-067", 0);
  const eligibleOnPlay = card("demo-piedmon-bt2-on-play", "ST6-04", 0);
  const eligibleChampion = card("demo-piedmon-bt2-champion", "BT2-071", 0);
  const ineligibleLevel = card("demo-piedmon-bt2-level-five", "BT2-075", 0);
  const ineligibleColor = card("demo-piedmon-bt2-yellow", "BT2-034", 0);
  const option = card("demo-piedmon-bt2-option", "ST6-15", 0);
  if (effect === "played-two" || effect === "suppressed-on-play") {
    you.battleArea.push(permanent("demo-piedmon-bt2-played-a", "ST6-04", 0, 2000));
    you.battleArea.push(permanent("demo-piedmon-bt2-played-b", "BT2-071", 0, 4000));
    if (effect === "suppressed-on-play") you.trash.push(option);
  } else {
    you.trash.push(eligibleRookie, eligibleOnPlay, eligibleChampion, ineligibleLevel, ineligibleColor, option);
  }
  state.players.push(you, opponent);

  const effectText =
    "[On Play] You may play up to 2 level 4 or lower purple Digimon cards from your trash without paying their memory costs. Their On Play effects don't activate.";
  if (effect === null || effect === "choose-up-to-two") {
    return {
      state,
      decision: {
        decisionId: "demo-piedmon-bt2-selection",
        seat: 0,
        kind: "selectCards",
        promptText: "Play up to 2 purple level 4 or lower Digimon",
        sourceCardId: "BT2-080",
        options: {
          candidateInstanceIds: [eligibleRookie.instanceId, eligibleOnPlay.instanceId, eligibleChampion.instanceId],
          visibleInstanceIds: [
            eligibleRookie.instanceId,
            eligibleOnPlay.instanceId,
            eligibleChampion.instanceId,
            ineligibleLevel.instanceId,
            ineligibleColor.instanceId,
            option.instanceId,
          ],
          min: 0,
          max: 2,
          timing: "OnPlay",
          effectText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    "played-two": "Piedmon played 2 eligible purple Digimon from trash without paying their costs.",
    "suppressed-on-play":
      "Dracmon was played by Piedmon, but its On Play effect was suppressed and the Option remained in trash.",
    declined: "Piedmon's optional On Play effect was declined, so every candidate remained in trash.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-080",
        effectKey: `BT2-080/${effect}`,
        description: descriptions[effect]!,
        timing: "OnPlay",
      },
    ],
  };
}

function metalTyrannomonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const host = permanent("demo-metaltyrannomon-bt2-host", "BT2-047", 0, 12000, [
    { instanceId: "demo-metaltyrannomon-bt2-source", cardId: "BT2-046" },
  ]);
  host.isSuspended = effect !== "level-six-battle";
  you.battleArea.push(host);
  if (effect === "level-six-battle") {
    opponent.trash.push(card("demo-metaltyrannomon-bt2-level-six", "BT2-031", 1));
  } else if (effect === "level-five-battle") {
    opponent.trash.push(card("demo-metaltyrannomon-bt2-level-five", "BT2-047", 1));
  } else if (effect === "security-battle") {
    opponent.trash.push(card("demo-metaltyrannomon-bt2-security", "BT2-031", 1));
    opponent.securityCount = 4;
  }
  if (effect !== "security-battle") opponent.securityCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "level-six-battle":
      "The host deleted an opposing level 6 Digimon in battle, so MetalTyrannomon's inherited effect unsuspended it.",
    "level-five-battle": "The defeated Digimon was only level 5, so the host remained suspended.",
    "security-battle":
      "Defeating a level 6 Security Digimon does not satisfy the opposing-Digimon-in-battle condition.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-046",
        effectKey: "BT2-046/inherited-unsuspend",
        description: descriptions[effect] ?? "MetalTyrannomon's inherited battle condition is displayed.",
        timing: "Your Turn",
      },
    ],
  };
}

function argomonChampionBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "accepted" ? 3 : 1;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(
    permanent("demo-argomon-champion-bt2", "BT2-045", 0, 5000),
    permanent("demo-argomon-champion-bt2-cost", "BT1-010", 0, 3000),
  );
  if (effect === "accepted") you.battleArea[1]!.isSuspended = true;
  opponent.securityCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-045",
        effectKey: "BT2-045/digisorption",
        description:
          effect === "accepted"
            ? "Digisorption -2 suspended an allied Digimon and reduced Argomon's 2-memory digivolution cost to 0."
            : "Digisorption was declined or unavailable, so Argomon paid its full 2-memory digivolution cost.",
        timing: "When Digivolving",
      },
    ],
  };
}

function tyrannomonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-tyrannomon-bt2", "BT2-044", 0, 4000));
  if (effect === "both-categories") {
    you.hand.push(
      card("demo-tyrannomon-bt2-added-digimon", "BT2-047", 0),
      card("demo-tyrannomon-bt2-added-tamer", "BT1-089", 0),
    );
    you.handCount = 2;
  } else if (effect === "q1016-one-category") {
    you.hand.push(card("demo-tyrannomon-bt2-added-tamer", "BT1-089", 0));
    you.handCount = 1;
  }
  opponent.securityCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-044",
        effectKey: "BT2-044/when-digivolving-reveal",
        description:
          effect === "q1016-one-category"
            ? "Q1016: the reveal contained only an eligible green Tamer category, so that card was still added to hand."
            : "Tyrannomon added 1 level 5-or-lower Digimon and 1 green Tamer from the 3 revealed cards.",
        timing: "When Digivolving",
      },
    ],
  };
}

function agumonGreenBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponents-turn" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(
    permanent("demo-agumon-green-bt2-host", "BT2-045", 0, effect === "opponents-turn" ? 3000 : 4000, [
      { instanceId: "demo-agumon-green-bt2-source", cardId: "BT2-043" },
    ]),
  );
  opponent.securityCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-043",
        effectKey: "BT2-043/inherited-dp-boost",
        description:
          effect === "opponents-turn"
            ? "Agumon's inherited +1000 DP is inactive during the opponent's turn, leaving the host at 3000 DP."
            : "Agumon's inherited effect gives its host +1000 DP during its controller's turn.",
        timing: "Your Turn",
      },
    ],
  };
}

function shineGreymonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponents-turn" ? 1 : 0;
  state.memory = effect === "q1230-single-timing" ? -1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const boosted = effect === "tamer-dp-boost";
  you.battleArea.push(permanent("demo-shinegreymon-bt2", "BT2-041", 0, boosted ? 13000 : 11000));
  if (effect === "q1014-separate-targets") {
    you.battleArea.push(
      permanent("demo-shinegreymon-bt2-tamer-a", "BT1-087", 0, 0),
      permanent("demo-shinegreymon-bt2-tamer-b", "BT2-087", 0, 0),
    );
    you.battleArea.slice(1).forEach((permanent) => {
      permanent.isSuspended = true;
    });
    opponent.trash.push(
      card("demo-shinegreymon-bt2-target-a", "BT2-034", 1),
      card("demo-shinegreymon-bt2-target-b", "BT2-033", 1),
    );
  } else if (effect === "q1230-single-timing") {
    you.battleArea.push(
      permanent("demo-shinegreymon-bt2-tamer-a", "BT1-087", 0, 0),
      permanent("demo-shinegreymon-bt2-tamer-b", "BT2-087", 0, 0),
    );
    you.battleArea.slice(1).forEach((permanent) => {
      permanent.isSuspended = true;
    });
    opponent.battleArea.push(
      permanent("demo-shinegreymon-bt2-neo-host", "BT4-085", 1, 7000, [
        { instanceId: "demo-shinegreymon-bt2-neo-source", cardId: "BT4-084" },
      ]),
    );
  } else {
    you.battleArea.push(
      permanent("demo-shinegreymon-bt2-yellow-tamer", "BT1-087", 0, 0),
      permanent("demo-shinegreymon-bt2-red-tamer", "BT1-085", 0, 0),
    );
  }
  opponent.securityCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "q1014-separate-targets":
      "Q1014: suspending 2 yellow Tamers created 2 separate -4000 DP activations, deleting 2 chosen 4000 DP Digimon.",
    "q1230-single-timing":
      "Q1015/Q1230: both Tamers suspended at one timing, so the opposing NeoDevimon inherited effect gained only 1 memory.",
    "tamer-dp-boost": "On its controller's turn, ShineGreymon gains +1000 DP for each Tamer of any color in play.",
    "opponents-turn": "Two Tamers are in play, but ShineGreymon's DP bonus is inactive on the opponent's turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-041",
        effectKey: effect.startsWith("q10") ? "BT2-041/when-digivolving" : "BT2-041/tamer-dp-boost",
        description: descriptions[effect] ?? "ShineGreymon's conditional effect state is displayed.",
        timing: effect.startsWith("q10") ? "When Digivolving" : "Your Turn",
      },
    ],
  };
}

function ophanimonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "q1013-security-battle" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === null) {
    you.battleArea.push(permanent("demo-ophanimon-bt2", "BT2-040", 0, 11000));
  } else if (effect === "placed-in-security") {
    you.securityCount = 1;
  } else if (effect === "q1013-security-battle") {
    you.trash.push(card("demo-ophanimon-bt2-checked", "BT2-040", 0));
    opponent.trash.push(card("demo-ophanimon-bt2-defeated-attacker", "BT2-039", 1));
  }
  opponent.securityCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-040",
        effectKey: effect === "q1013-security-battle" ? "BT2-040/security-battle" : "BT2-040/on-deletion",
        description:
          effect === "q1013-security-battle"
            ? "Q1013: Ophanimon was checked as an 11000 DP Security Digimon and deleted the 10000 DP attacker in battle."
            : "Deleted Ophanimon placed only its top card face down on top of its controller's security stack.",
        timing: effect === "q1013-security-battle" ? "Security" : "On Deletion",
      },
    ],
  };
}

function magnadramonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-magnadramon-bt2", "BT2-039", 0, 10000));
  if (effect === "recovery-two") {
    you.securityCount = 3;
  } else if (effect === "four-security") {
    you.securityCount = 4;
  } else if (effect === "q1011-decline") {
    you.hand.push(card("demo-magnadramon-bt2-declined", "BT1-048", 0));
    you.handCount = 1;
  } else if (effect === "q1012-on-play") {
    you.battleArea.push(permanent("demo-magnadramon-bt2-patamon", "BT1-048", 0, 2000));
    you.hand.push(card("demo-magnadramon-bt2-found-tamer", "BT1-087", 0));
    you.handCount = 1;
  }
  opponent.securityCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "recovery-two": "Magnadramon was played at 1 security and recovered the top 2 deck cards, reaching 3 security.",
    "four-security": "Magnadramon was played at 4 security, so its Recovery +2 condition was not met.",
    "q1011-decline": "Q1011: the optional When Attacking play was declined, leaving Patamon in hand.",
    "q1012-on-play":
      "Q1012: Magnadramon played Patamon for free, then Patamon's On Play effect activated and added T.K. Takaishi to hand.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-039",
        effectKey: effect.startsWith("q101") ? "BT2-039/when-attacking-play" : "BT2-039/on-play-recovery",
        description: descriptions[effect] ?? "Magnadramon's conditional effect state is displayed.",
        timing: effect.startsWith("q101") ? "When Attacking" : "On Play",
      },
    ],
  };
}

function rizeGreymonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponents-turn" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "played-tamer") {
    you.battleArea.push(
      permanent("demo-rizegreymon-bt2", "BT2-038", 0, 7000),
      permanent("demo-rizegreymon-bt2-existing-tamer", "BT2-087", 0, 0),
      permanent("demo-rizegreymon-bt2-played-tamer", "BT1-087", 0, 0),
    );
    you.securityCount = 5;
  } else {
    you.battleArea.push(
      permanent("demo-rizegreymon-bt2-host", "BT2-041", 0, 11000, [
        { instanceId: "demo-rizegreymon-bt2-source", cardId: "BT2-038" },
      ]),
      permanent("demo-rizegreymon-bt2-tamer-a", "BT1-087", 0, 0),
      permanent("demo-rizegreymon-bt2-tamer-b", "BT1-087", 0, 0),
    );
    if (effect !== "two-yellow-tamers") {
      you.battleArea.push(permanent("demo-rizegreymon-bt2-tamer-c", "BT1-087", 0, 0));
    }
  }
  opponent.securityCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "played-tamer":
      "RizeGreymon played T.K. Takaishi for free; that specific Tamer's On Play effect was suppressed, leaving security unchanged.",
    "three-yellow-tamers":
      "With 3 yellow Tamers in play on its controller's turn, RizeGreymon's inherited effect grants Security Attack +1.",
    "two-yellow-tamers": "With only 2 yellow Tamers, the inherited Security Attack +1 condition is not met.",
    "opponents-turn": "Three yellow Tamers are present, but the inherited bonus is inactive on the opponent's turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-038",
        effectKey: effect === "played-tamer" ? "BT2-038/play-tamer" : "BT2-038/inherited-security-attack",
        description: descriptions[effect] ?? "RizeGreymon's conditional effect state is displayed.",
        timing: effect === "played-tamer" ? "When Digivolving" : "Your Turn",
      },
    ],
  };
}

function gatomonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const gatomon = permanent("demo-gatomon-bt2", "BT2-036", 0, effect === "ally-deleted" ? 6000 : 3000);
  you.battleArea.push(gatomon);
  if (effect === "on-play-minus") {
    you.battleArea.push(permanent("demo-gatomon-bt2-purple", "BT2-067", 0, 3000));
    opponent.battleArea.push(permanent("demo-gatomon-bt2-target", "BT1-074", 1, 3000));
  } else if (effect === "no-purple") {
    opponent.battleArea.push(permanent("demo-gatomon-bt2-target", "BT1-074", 1, 7000));
  } else if (effect === "ally-deleted") {
    you.trash.push(card("demo-gatomon-bt2-deleted-ally", "BT2-067", 0));
  }
  opponent.securityCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "on-play-minus": "With a purple Digimon in play, Gatomon's On Play effect gave the opposing Digimon -4000 DP.",
    "no-purple": "Without an allied purple Digimon in play, Gatomon's On Play DP reduction did not apply.",
    "ally-deleted": "Another allied Digimon was deleted during the turn, so Gatomon gained +3000 DP for the turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-036",
        effectKey: effect === "ally-deleted" ? "BT2-036/ally-deletion-boost" : "BT2-036/on-play-dp-minus",
        description: descriptions[effect] ?? "Gatomon's conditional effect state is displayed.",
        timing: effect === "ally-deleted" ? "Your Turn" : "On Play",
      },
    ],
  };
}

function geoGreymonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(
    permanent("demo-geogreymon-bt2-host", "BT2-038", 0, 7000, [
      { instanceId: "demo-geogreymon-bt2-source", cardId: "BT2-035" },
    ]),
    permanent("demo-geogreymon-bt2-tamer-a", "BT1-087", 0, 0),
    permanent("demo-geogreymon-bt2-tamer-b", "BT1-087", 0, 0),
  );
  if (effect !== "two-yellow-tamers") {
    you.battleArea.push(permanent("demo-geogreymon-bt2-tamer-c", "BT1-087", 0, 0));
  }
  if (effect === "dp-zero-deletion") {
    opponent.trash.push(card("demo-geogreymon-bt2-deleted", "BT2-034", 1));
  } else {
    opponent.battleArea.push(
      permanent("demo-geogreymon-bt2-target", "BT2-043", 1, effect === "minus-2000" ? 4000 : 6000),
    );
  }
  opponent.securityCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "minus-2000": "The host attacked with 3 yellow Tamers, giving the selected opposing Digimon -2000 DP for the turn.",
    "two-yellow-tamers": "Only 2 yellow Tamers are in play, so GeoGreymon's inherited effect did not apply.",
    "dp-zero-deletion": "GeoGreymon's -2000 DP reduced Salamon to 0 DP, so the rule check deleted it.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-035",
        effectKey: "BT2-035/inherited-dp-minus",
        description: descriptions[effect] ?? "GeoGreymon's inherited effect state is displayed.",
        timing: "When Attacking",
      },
    ],
  };
}

function salamonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === null) you.battleArea.push(permanent("demo-salamon-bt2", "BT2-034", 0, 2000));
  you.trash.push(card("demo-salamon-bt2-deleted", "BT2-034", 0));
  you.securityCount = effect === "recover" || effect === "q1009" ? 4 : 4;
  if (effect === "recover" || effect === "q1009") {
    you.security.push(card("demo-salamon-bt2-recovered", "BT1-013", 0));
  }
  opponent.securityCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    recover: "Salamon was deleted at 3 security and recovered the top card of the deck, reaching 4 security.",
    "four-security": "Salamon was deleted at 4 security, so its conditional recovery did not activate.",
    q1009:
      "Q1009: two Salamon were deleted together at 3 security; the first recovered to 4, then the second condition failed.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-034",
        effectKey: "BT2-034/on-deletion-recovery",
        description: descriptions[effect] ?? "Salamon's conditional On Deletion recovery is displayed.",
        timing: "On Deletion",
      },
    ],
  };
}

function agumonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(
    permanent("demo-agumon-bt2-host", "BT2-035", 0, 5000, [
      { instanceId: "demo-agumon-bt2-source", cardId: "BT2-033" },
    ]),
    permanent("demo-agumon-bt2-tamer-a", "BT1-087", 0, 0),
    permanent("demo-agumon-bt2-tamer-b", "BT1-087", 0, 0),
  );
  if (effect !== "two-yellow-tamers") {
    you.battleArea.push(permanent("demo-agumon-bt2-tamer-c", "BT1-087", 0, 0));
  }
  if (effect === "draw") {
    you.hand.push(card("demo-agumon-bt2-drawn", "BT1-010", 0));
    you.handCount = 1;
  }
  opponent.securityCount = effect === "draw" ? 4 : 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-033",
        effectKey: "BT2-033/inherited-draw",
        description:
          effect === "draw"
            ? "The host attacked with 3 yellow Tamers in play, so Agumon's inherited effect drew 1 card."
            : "The host attacked with only 2 yellow Tamers, so Agumon's inherited effect did not draw.",
        timing: "When Attacking",
      },
    ],
  };
}

function ulforceVeedramonBt2Demo(effect: string | null): CardEffectsFixture {
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
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-032",
        effectKey: "BT2-032/unsuspend-and-memory",
        description: descriptions[effect] ?? "UlforceVeedramon's conditional effect state is displayed.",
        timing: "Your Turn",
      },
    ],
  };
}

function vikemonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponents-turn" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const active = effect !== "sourced-opponent" && effect !== "opponents-turn";
  you.battleArea.push(permanent("demo-vikemon-bt2", "BT2-031", 0, active ? 13000 : 12000));
  opponent.battleArea.push(
    permanent(
      "demo-vikemon-bt2-opponent",
      "BT1-010",
      1,
      3000,
      effect === "sourced-opponent" ? [{ instanceId: "demo-vikemon-bt2-source", cardId: "BT1-001" }] : [],
    ),
  );
  opponent.securityCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    active: "Vikemon has 13000 DP and Security Attack +1 while an opposing source-less Digimon is in play.",
    "sourced-opponent":
      "The opposing Digimon has a digivolution card, so Vikemon remains at 12000 DP without Security Attack +1.",
    "opponents-turn": "The condition is present, but this is the opponent's turn, so Vikemon remains at 12000 DP.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-031",
        effectKey: "BT2-031/conditional-bonuses",
        description:
          descriptions[effect] ??
          "Vikemon has 13000 DP and Security Attack +1 while an opposing source-less Digimon is in play.",
        timing: "Your Turn",
      },
    ],
  };
}

function metalSeadramonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === null ? 11 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === null) {
    you.hand.push(card("demo-metalseadramon-bt2-hand", "BT2-030", 0));
    you.handCount = 1;
  } else {
    const metalSeadramon = permanent("demo-metalseadramon-bt2", "BT2-030", 0, 10000);
    metalSeadramon.isSuspended = effect === "q1006-mixed" || effect === "only-source-less";
    you.battleArea.push(metalSeadramon);
  }
  if (effect === "on-play-return") {
    opponent.hand.push(
      card("demo-metalseadramon-bt2-returned-a", "BT1-070", 1),
      card("demo-metalseadramon-bt2-returned-b", "BT1-036", 1),
    );
    opponent.handCount = 2;
    opponent.trash.push(
      card("demo-metalseadramon-bt2-source-a", "BT1-001", 1),
      card("demo-metalseadramon-bt2-source-b", "BT1-003", 1),
    );
    opponent.battleArea.push(permanent("demo-metalseadramon-bt2-level-five", "BT1-074", 1, 7000));
  } else {
    opponent.battleArea.push(permanent("demo-metalseadramon-bt2-source-less", "BT1-072", 1, 6000));
    if (effect === "q1006-mixed") {
      opponent.trash.push(card("demo-metalseadramon-bt2-sourced-blocker", "BT1-072", 1));
      opponent.securityCount = 5;
    } else {
      opponent.securityCount = effect === "only-source-less" ? 4 : 5;
    }
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "on-play-return":
      "MetalSeadramon returned both level 4 Digimon, trashed their sources, left the level 5 in play, and remained in play itself.",
    "q1006-mixed":
      "MetalSeadramon rejected the source-less Blocker, while the sourced Blocker remained legal and redirected the attack (Q1006).",
    "only-source-less":
      "Every opposing Blocker was source-less, so no legal blocker window opened and MetalSeadramon's player attack checked security.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-030",
        effectKey: effect === "on-play-return" ? "BT2-030/on-play-return" : "BT2-030/source-less-unblockable",
        description: descriptions[effect] ?? "BT2-030 MetalSeadramon resolved.",
        timing: effect === "on-play-return" ? "On Play" : "Your Turn",
      },
    ],
  };
}

function megaSeadramonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const attacker = permanent("demo-megaseadramon-bt2", "BT2-029", 0, 8000);
  attacker.isSuspended = effect !== null;
  you.battleArea.push(attacker);
  opponent.battleArea.push(permanent("demo-megaseadramon-bt2-source-less", "BT1-072", 1, 6000));
  if (effect === "q1005-mixed") {
    opponent.trash.push(card("demo-megaseadramon-bt2-sourced-blocker", "BT1-072", 1));
    opponent.securityCount = 5;
  } else {
    opponent.securityCount = effect === "only-source-less" ? 4 : 5;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "q1005-mixed":
      "MegaSeadramon rejected the source-less Blocker, while the sourced Blocker remained legal and redirected the attack (Q1005).",
    "only-source-less":
      "Every opposing Blocker was source-less, so no legal blocker window opened and MegaSeadramon's player attack checked security.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-029",
        effectKey: "BT2-029/source-less-unblockable",
        description: descriptions[effect] ?? "BT2-029 MegaSeadramon resolved.",
        timing: "Your Turn",
      },
    ],
  };
}

function aeroVeedramonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "active-phase" ? Phase.Active : Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const inherited =
    effect?.startsWith("inherited-") === true ||
    effect === "q1004-already-active" ||
    effect === "active-phase" ||
    effect === "opponent-turn";
  if (inherited) {
    const host = permanent("demo-aeroveedramon-bt2-host", "BT2-030", 0, 11000, [
      { instanceId: "demo-aeroveedramon-bt2-source", cardId: "BT2-028" },
    ]);
    host.isSuspended = false;
    you.battleArea.push(host);
  } else {
    const aero = permanent("demo-aeroveedramon-bt2", "BT2-028", 0, 7000);
    aero.isSuspended = effect === "no-blue-tamer";
    you.battleArea.push(aero);
    if (effect !== "no-blue-tamer") {
      you.battleArea.push(permanent("demo-aeroveedramon-bt2-tamer", "BT1-086", 0, 0));
    }
    if (effect === "other-unsuspended") {
      you.battleArea.push(permanent("demo-aeroveedramon-bt2-other", "BT2-025", 0, 3000));
    }
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "other-unsuspended": "With an allied blue Tamer, AeroVeedramon unsuspended another selected blue Digimon.",
    "q1003-self": "AeroVeedramon digivolved while suspended and selected itself to unsuspend (Q1003).",
    "no-blue-tamer": "Without an allied blue Tamer, AeroVeedramon's When Digivolving unsuspend did not activate.",
    "inherited-main": "Its host really unsuspended during the owner's main phase and gained Jamming for the turn.",
    "q1004-already-active":
      "An unsuspend effect targeted the already active host, so no unsuspend occurred and it gained no Jamming (Q1004).",
    "active-phase":
      "The host unsuspended during the Active phase, so AeroVeedramon's main-phase inherited effect did not grant Jamming.",
    "opponent-turn":
      "The host unsuspended during the opponent's turn, so AeroVeedramon's Your Turn effect did not grant Jamming.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-028",
        effectKey: inherited ? "BT2-028/main-phase-jamming" : "BT2-028/blue-unsuspend",
        description: descriptions[effect] ?? "BT2-028 AeroVeedramon resolved.",
        timing: inherited ? "Your Turn" : "When Digivolving",
      },
    ],
  };
}

function veedramonJammingBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect !== "deleted-without-jamming") {
    const veedramon = permanent("demo-veedramon-jamming-bt2", "BT2-026", 0, 5000);
    veedramon.isSuspended = effect === "survived-security";
    you.battleArea.push(veedramon);
  } else {
    you.trash.push(card("demo-veedramon-jamming-bt2-deleted", "BT2-026", 0));
  }
  if (effect === "active" || effect === "opponent-turn" || effect === "survived-security") {
    you.battleArea.push(permanent("demo-veedramon-jamming-bt2-blue-tamer", "BT1-086", 0, 0));
  } else if (effect === "red-tamer") {
    you.battleArea.push(permanent("demo-veedramon-jamming-bt2-red-tamer", "BT1-085", 0, 0));
  }
  if (effect === "survived-security" || effect === "deleted-without-jamming") {
    opponent.securityCount = 4;
    opponent.trash.push(card("demo-veedramon-jamming-bt2-security", "BT1-080", 1));
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    active: "During its owner's turn, an allied blue Tamer granted Veedramon Jamming.",
    "red-tamer": "The allied Tamer was red, so Veedramon did not gain Jamming.",
    "opponent-turn": "Despite the blue Tamer, Veedramon's Your Turn Jamming was inactive on the opponent's turn.",
    "survived-security": "With Jamming active, Veedramon survived battle against a 12000 DP Security Digimon.",
    "deleted-without-jamming":
      "Without a blue Tamer and Jamming, the 5000 DP Veedramon lost to the 12000 DP Security Digimon.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-026",
        effectKey: "BT2-026/blue-tamer-jamming",
        description: descriptions[effect] ?? "BT2-026 Veedramon resolved.",
        timing: "Your Turn",
      },
    ],
  };
}

function ikkakumonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const attacker = permanent("demo-ikkakumon-bt2-host", "BT2-029", 0, 7000, [
    { instanceId: "demo-ikkakumon-bt2-source", cardId: "BT2-025" },
  ]);
  attacker.isSuspended = effect !== null;
  you.battleArea.push(attacker);
  if (effect === "trashed-top-source") {
    opponent.battleArea.push(
      permanent("demo-ikkakumon-bt2-target", "BT2-034", 1, 6000, [
        { instanceId: "demo-ikkakumon-bt2-bottom-source", cardId: "BT1-010" },
      ]),
      permanent("demo-ikkakumon-bt2-source-less", "BT1-012", 1, 3000),
    );
    opponent.trash.push(card("demo-ikkakumon-bt2-top-source", "BT1-011", 1));
  } else if (effect === "no-target") {
    opponent.battleArea.push(permanent("demo-ikkakumon-bt2-source-less", "BT1-012", 1, 3000));
  }
  opponent.securityCount = effect === null ? 5 : 4;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "trashed-top-source":
      "Ikkakumon trashed only the top digivolution card from the selected opposing Digimon; its bottom source remained.",
    "no-target":
      "No opposing Digimon had digivolution cards, so Ikkakumon's inherited effect resolved and the attack continued.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-025",
        effectKey: "BT2-025/trash-top-source",
        description: descriptions[effect] ?? "BT2-025 Ikkakumon resolved.",
        timing: "When Attacking",
      },
    ],
  };
}

function gomamonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === null ? 4 : effect === "two-source-less" ? 2 : effect === "mixed-zones" ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === null) {
    you.hand.push(card("demo-gomamon-bt2-hand", "BT2-023", 0));
    you.handCount = 1;
  } else {
    you.battleArea.push(permanent("demo-gomamon-bt2", "BT2-023", 0, 2000));
  }
  if (effect === "two-source-less") {
    opponent.battleArea.push(
      permanent("demo-gomamon-bt2-source-less-a", "BT1-010", 1, 2000),
      permanent("demo-gomamon-bt2-source-less-b", "BT1-011", 1, 2000),
    );
  } else if (effect === "mixed-zones") {
    you.battleArea.push(permanent("demo-gomamon-bt2-allied", "BT1-010", 0, 2000));
    opponent.battleArea.push(
      permanent("demo-gomamon-bt2-qualifying", "BT1-010", 1, 2000),
      permanent("demo-gomamon-bt2-with-source", "BT1-011", 1, 2000, [
        { instanceId: "demo-gomamon-bt2-under", cardId: "BT1-001" },
      ]),
    );
  } else if (effect === "q1002-floor") {
    for (let index = 0; index < 5; index += 1) {
      opponent.battleArea.push(permanent(`demo-gomamon-bt2-floor-${index}`, "BT1-010", 1, 2000));
    }
  } else if (effect === "no-qualifiers") {
    opponent.battleArea.push(
      permanent("demo-gomamon-bt2-no-qualifier", "BT1-011", 1, 2000, [
        { instanceId: "demo-gomamon-bt2-no-qualifier-under", cardId: "BT1-001" },
      ]),
    );
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "two-source-less": "Two opposing source-less Digimon reduced Gomamon's 4 play cost to 2.",
    "mixed-zones":
      "Only the one opposing battle-area Digimon without sources counted; allied, sourced, and breeding Digimon did not.",
    "q1002-floor": "Five qualifying Digimon reduced Gomamon's cost only to 0; the play did not gain memory (Q1002).",
    "no-qualifiers": "With no qualifying opposing Digimon, Gomamon paid its printed play cost of 4.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-023",
        effectKey: "BT2-023/source-less-play-reduction",
        description: descriptions[effect] ?? "BT2-023 Gomamon resolved.",
        timing: "Static",
      },
    ],
  };
}

function veemonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "active-phase" ? Phase.Active : Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const host = permanent("demo-veemon-bt2-host", "BT2-026", 0, 4000, [
    { instanceId: "demo-veemon-bt2-source", cardId: "BT2-021" },
  ]);
  host.isSuspended = effect === null;
  you.battleArea.push(host);
  if (effect === "main-unsuspend" || effect === "second-unsuspend") {
    you.hand.push(card("demo-veemon-bt2-drawn", "BT1-010", 0));
    you.handCount = 1;
    you.deckCount = effect === "second-unsuspend" ? 1 : 0;
  } else {
    you.deckCount = 1;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "main-unsuspend": "Veemon's host really unsuspended during its owner's main phase and drew 1 card.",
    "q1001-already-active":
      "An unsuspend effect targeted an already active host, so no unsuspend occurred and Veemon did not draw (Q1001).",
    "active-phase": "The host unsuspended during the Active phase, so Veemon's main-phase trigger did not draw.",
    "second-unsuspend":
      "After a second real main-phase unsuspend, Veemon had still drawn only once because it is Once Per Turn.",
    "opponent-turn": "The host unsuspended during the opponent's turn, so Veemon's Your Turn effect did not draw.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-021",
        effectKey: "BT2-021/main-phase-unsuspend-draw",
        description: descriptions[effect] ?? "BT2-021 Veemon resolved.",
        timing: "Your Turn",
      },
    ],
  };
}

function gallantmonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "watchers" ? -1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-gallantmon-bt2", "BT2-020", 0, 11000));
  if (effect === "digivolve-delete" || effect === "no-red-tamer" || effect === "dp-too-high") {
    you.battleArea.push(
      permanent("demo-gallantmon-bt2-tamer", effect === "no-red-tamer" ? "BT1-086" : "BT1-085", 0, 0),
    );
    if (effect === "digivolve-delete") {
      opponent.trash.push(card("demo-gallantmon-bt2-deleted", "BT2-047", 1));
    } else {
      opponent.battleArea.push(
        permanent("demo-gallantmon-bt2-target", "BT2-047", 1, effect === "dp-too-high" ? 6001 : 6000),
      );
    }
  } else if (effect === "trash-twenty") {
    opponent.securityCount = 1;
    for (let index = 0; index < 22; index += 1) {
      opponent.trash.push(card(`demo-gallantmon-bt2-trash-${index}`, "BT1-010", 1));
    }
  } else if (effect === "q999-no-security-skill") {
    opponent.securityCount = 0;
    opponent.deckCount = 1;
    opponent.trash.push(card("demo-gallantmon-bt2-holy-wave", "BT1-107", 1));
    for (let index = 0; index < 10; index += 1) {
      opponent.trash.push(card(`demo-gallantmon-bt2-q999-trash-${index}`, "BT1-010", 1));
    }
  } else if (effect === "q1000-lethal") {
    const attacker = you.battleArea[0];
    if (attacker) attacker.isSuspended = true;
    opponent.securityCount = 0;
    state.gameOver = true;
    state.winnerSeat = 0;
  } else if (effect === "watchers") {
    const kari = permanent("demo-gallantmon-bt2-kari", "BT4-097", 1, 0);
    kari.isSuspended = true;
    opponent.battleArea.push(permanent("demo-gallantmon-bt2-dandevimon", "BT4-088", 1, 12000), kari);
    opponent.securityCount = 1;
    you.securityCount = 1;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "digivolve-delete": "With an allied red Tamer, Gallantmon deleted an opposing Digimon at the 6000 DP boundary.",
    "no-red-tamer":
      "The allied Tamer was blue, so Gallantmon's conditional When Digivolving deletion did not activate.",
    "dp-too-high": "The opposing Digimon had 6001 DP, so it was outside Gallantmon's deletion range.",
    "trash-twenty": "With 20 cards in the opponent's trash, Gallantmon directly trashed 2 of their security cards.",
    "q999-no-security-skill":
      "Gallantmon directly trashed Holy Wave from security without activating its Security effect (Q999).",
    "q1000-lethal":
      "Gallantmon trashed the opponent's last security, then its unblocked player attack continued and won the game (Q1000).",
    watchers:
      "Gallantmon's direct security trash triggered DanDevimon and Kari security-removal watchers; Kari suspended for 1 memory (Q1239/Q1251).",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-020",
        effectKey:
          effect.startsWith("digivolve") || effect === "no-red-tamer" || effect === "dp-too-high"
            ? "BT2-020/red-tamer-delete"
            : "BT2-020/trash-security",
        description: descriptions[effect] ?? "BT2-020 Gallantmon resolved.",
        timing:
          effect.startsWith("digivolve") || effect === "no-red-tamer" || effect === "dp-too-high"
            ? "When Digivolving"
            : "When Attacking",
      },
    ],
  };
}

function phoenixmonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "player-attack" || effect === "q998-blocked" ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const attacker = permanent("demo-phoenixmon-bt2", "BT2-019", 0, 11000);
  attacker.isSuspended = effect !== null;
  you.battleArea.push(attacker);
  if (effect === "q998-blocked") {
    opponent.trash.push(card("demo-phoenixmon-bt2-blocker", "BT1-031", 1));
    opponent.securityCount = 5;
  } else if (effect === "digimon-attack") {
    opponent.trash.push(card("demo-phoenixmon-bt2-target", "BT1-003", 1));
  } else {
    opponent.securityCount = effect === "player-attack" ? 4 : 5;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "player-attack": "Phoenixmon attacked the player and gained 1 memory.",
    "q998-blocked":
      "Phoenixmon gained 1 memory after declaring a player attack; the later block redirected combat but did not undo the gain (Q998).",
    "digimon-attack": "Phoenixmon attacked an opposing Digimon instead of the player, so it gained no memory.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-019",
        effectKey: "BT2-019/player-attack-memory",
        description: descriptions[effect] ?? "BT2-019 Phoenixmon resolved.",
        timing: "When Attacking",
      },
    ],
  };
}

function volcanicdramonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === null ? 11 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === null) {
    you.hand.push(card("demo-volcanicdramon-bt2-hand", "BT2-018", 0));
    you.handCount = 1;
  } else {
    const volcanicdramon = permanent("demo-volcanicdramon-bt2", "BT2-018", 0, 10000);
    volcanicdramon.isSuspended = effect === "security-attack";
    you.battleArea.push(volcanicdramon);
  }
  if (effect === "on-play-delete") {
    opponent.battleArea.push(permanent("demo-volcanicdramon-bt2-survivor", "BT1-074", 1, 4001));
    opponent.trash.push(
      card("demo-volcanicdramon-bt2-deleted-a", "BT1-029", 1),
      card("demo-volcanicdramon-bt2-deleted-b", "BT1-070", 1),
    );
  } else if (effect === "security-attack") {
    opponent.securityCount = 1;
    opponent.trash.push(
      card("demo-volcanicdramon-bt2-check-a", "BT1-009", 1),
      card("demo-volcanicdramon-bt2-check-b", "BT1-010", 1),
    );
  } else if (effect === "digivolved") {
    opponent.battleArea.push(permanent("demo-volcanicdramon-bt2-undeleted", "BT1-029", 1, 2000));
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "on-play-delete":
      "Volcanicdramon deleted all opposing Digimon with 4000 DP or less on play; the 4001 DP Digimon survived.",
    "security-attack": "Volcanicdramon's Security Attack +1 produced exactly 2 security checks.",
    digivolved: "Volcanicdramon entered by digivolution, so its On Play deletion did not activate.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-018",
        effectKey: effect === "security-attack" ? "BT2-018/security-attack" : "BT2-018/on-play-delete",
        description: descriptions[effect] ?? "BT2-018 Volcanicdramon resolved.",
        timing: effect === "security-attack" ? "Static" : effect === "digivolved" ? "When Digivolving" : "On Play",
      },
    ],
  };
}

function warGrowlmonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "inherited-opponent-turn" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const inherited = effect?.startsWith("inherited-") === true;
  if (inherited) {
    const boosted = effect === "inherited-threshold";
    you.battleArea.push(
      permanent("demo-wargrowlmon-bt2-host", "BT2-020", 0, boosted ? 11000 : 10000, [
        { instanceId: "demo-wargrowlmon-bt2-source", cardId: "BT2-017" },
      ]),
    );
    const trashCount = effect === "inherited-below" ? 4 : 5;
    for (let index = 0; index < trashCount; index += 1) {
      opponent.trash.push(card(`demo-wargrowlmon-bt2-trash-${index}`, "BT1-010", 1));
    }
  } else {
    you.battleArea.push(permanent("demo-wargrowlmon-bt2", "BT2-017", 0, 8000));
    you.battleArea.push(
      permanent("demo-wargrowlmon-bt2-tamer", effect === "no-red-tamer" ? "BT1-086" : "BT1-085", 0, 0),
    );
    if (effect === "digivolve-delete") {
      opponent.trash.push(card("demo-wargrowlmon-bt2-deleted", "BT1-010", 1));
    } else {
      opponent.battleArea.push(
        permanent("demo-wargrowlmon-bt2-target", "BT1-010", 1, effect === "dp-too-high" ? 3001 : 3000),
      );
    }
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "digivolve-delete": "With an allied red Tamer, WarGrowlmon deleted an opposing Digimon at the 3000 DP boundary.",
    "no-red-tamer":
      "The allied Tamer was blue, so WarGrowlmon's conditional When Digivolving deletion did not activate.",
    "dp-too-high": "The opposing Digimon had 3001 DP, so it was outside WarGrowlmon's deletion range.",
    "inherited-threshold":
      "At exactly 5 cards in the opponent's trash during its owner's turn, WarGrowlmon granted its host +1000 DP.",
    "inherited-below": "With only 4 cards in the opponent's trash, WarGrowlmon's inherited DP bonus stayed inactive.",
    "inherited-opponent-turn":
      "At the trash threshold on the opponent's turn, WarGrowlmon's Your Turn inherited bonus stayed inactive.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-017",
        effectKey: inherited ? "BT2-017/opponent-trash-dp" : "BT2-017/red-tamer-delete",
        description: descriptions[effect] ?? "BT2-017 WarGrowlmon resolved.",
        timing: inherited ? "Your Turn" : "When Digivolving",
      },
    ],
  };
}

function garudamonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const attacker = permanent("demo-garudamon-bt2", "BT2-015", 0, 7000);
  attacker.isSuspended = effect !== null;
  you.battleArea.push(attacker);
  if (effect === "player-attack" || effect === "q997-blocked") {
    you.hand.push(card("demo-garudamon-bt2-drawn", "BT1-010", 0));
    you.handCount = 1;
  }
  if (effect === "q997-blocked") {
    opponent.trash.push(card("demo-garudamon-bt2-blocker", "BT1-031", 1));
    opponent.securityCount = 5;
  } else if (effect === "digimon-attack") {
    opponent.trash.push(card("demo-garudamon-bt2-target", "BT1-003", 1));
    you.deckCount = 1;
  } else {
    opponent.securityCount = effect === "player-attack" ? 4 : 5;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "player-attack": "Garudamon attacked the player and drew 1 card.",
    "q997-blocked":
      "Garudamon drew 1 after declaring a player attack; the later block redirected combat but did not undo the draw (Q997).",
    "digimon-attack": "Garudamon attacked an opposing Digimon instead of the player, so it did not draw.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-015",
        effectKey: "BT2-015/player-attack-draw",
        description: descriptions[effect] ?? "BT2-015 Garudamon resolved.",
        timing: "When Attacking",
      },
    ],
  };
}

function growlmonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const attacker = permanent("demo-growlmon-bt2-host", "BT2-016", 0, 7000, [
    { instanceId: "demo-growlmon-bt2-source", cardId: "BT2-013" },
  ]);
  attacker.isSuspended = effect !== null;
  you.battleArea.push(attacker);
  if (effect === "deleted-2000") {
    opponent.battleArea.push(permanent("demo-growlmon-bt2-other", "BT1-011", 1, 2000));
    opponent.trash.push(card("demo-growlmon-bt2-deleted", "BT1-010", 1));
  } else if (effect === "spared-3000") {
    opponent.battleArea.push(permanent("demo-growlmon-bt2-spared", "BT1-010", 1, 3000));
  }
  opponent.securityCount = effect === null ? 5 : 4;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "deleted-2000": "When its host attacked, Growlmon deleted exactly 1 opposing Digimon at the 2000 DP boundary.",
    "spared-3000": "The opposing Digimon had 3000 DP, so Growlmon's inherited deletion did not affect it.",
    "no-target":
      "With no opposing Digimon to delete, Growlmon's inherited effect resolved and the attack continued normally.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-013",
        effectKey: "BT2-013/delete-2000-dp",
        description: descriptions[effect] ?? "BT2-013 Growlmon resolved.",
        timing: "When Attacking",
      },
    ],
  };
}

function birdramonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const boosted = effect === "player-attack" || effect === "q996-blocked";
  const attacker = permanent("demo-birdramon-bt2", "BT2-012", 0, boosted ? 7000 : 3000);
  attacker.isSuspended = effect !== null;
  you.battleArea.push(attacker);
  if (effect === "q996-blocked") {
    opponent.trash.push(card("demo-birdramon-bt2-blocker", "BT1-031", 1));
    opponent.securityCount = 5;
  } else if (effect === "digimon-attack") {
    opponent.trash.push(card("demo-birdramon-bt2-target", "BT1-003", 1));
  } else {
    opponent.securityCount = effect === "player-attack" ? 4 : 5;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "player-attack": "Birdramon attacked the player and gained +4000 DP for the turn.",
    "q996-blocked":
      "Birdramon's declared player attack was blocked, but it kept the +4000 DP, won the battle, and checked no security (Q996).",
    "digimon-attack": "Birdramon attacked an opposing Digimon instead of the player, so it received no DP bonus.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-012",
        effectKey: "BT2-012/player-attack-dp",
        description: descriptions[effect] ?? "BT2-012 Birdramon resolved.",
        timing: "When Attacking",
      },
    ],
  };
}

function biyomonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponent-turn-deletion" ? 1 : 0;
  state.memory = effect === "effect-deletion" || effect === "battle-deletion" ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === null) {
    you.battleArea.push(permanent("demo-biyomon-bt2", "BT2-010", 0, 2000));
  } else {
    you.trash.push(card("demo-biyomon-bt2-deleted", "BT2-010", 0));
  }
  if (effect === "battle-deletion") {
    const survivor = permanent("demo-biyomon-bt2-survivor", "BT2-011", 1, 3000);
    survivor.isSuspended = true;
    opponent.battleArea.push(survivor);
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "effect-deletion": "Biyomon was deleted by an effect during its owner's turn and gained 1 memory.",
    "battle-deletion": "Biyomon lost a battle during its owner's turn, was deleted, and gained 1 memory.",
    "opponent-turn-deletion":
      "Biyomon was deleted during the opponent's turn, so its conditional memory gain did not occur.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-010",
        effectKey: "BT2-010/on-deletion-memory",
        description: descriptions[effect] ?? "BT2-010 Biyomon resolved.",
        timing: "On Deletion",
      },
    ],
  };
}

function guilmonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const active = effect === "threshold-five";
  you.battleArea.push(
    permanent("demo-guilmon-bt2-host", "BT2-013", 0, active ? 5000 : 4000, [
      { instanceId: "demo-guilmon-bt2-source", cardId: "BT2-009" },
    ]),
  );
  const opponentTrashCount = effect === "below-threshold" ? 4 : effect === "own-trash-only" ? 0 : 5;
  for (let index = 0; index < opponentTrashCount; index += 1) {
    opponent.trash.push(card(`demo-guilmon-bt2-opponent-trash-${index}`, "BT1-010", 1));
  }
  if (effect === "own-trash-only") {
    for (let index = 0; index < 5; index += 1) {
      you.trash.push(card(`demo-guilmon-bt2-own-trash-${index}`, "BT1-010", 0));
    }
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "threshold-five":
      "With exactly 5 cards in the opponent's trash during its owner's turn, Guilmon granted its host +1000 DP.",
    "below-threshold": "With only 4 cards in the opponent's trash, Guilmon's inherited DP bonus stayed inactive.",
    "own-trash-only": "Five cards in its owner's trash did not satisfy Guilmon's opponent-trash requirement.",
    "opponent-turn":
      "Despite 5 cards in the opponent's trash, Guilmon's Your Turn bonus stayed inactive on their turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-009",
        effectKey: "BT2-009/opponent-trash-threshold",
        description: descriptions[effect] ?? "BT2-009 Guilmon resolved.",
        timing: "Your Turn",
      },
    ],
  };
}

function yaamonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const active = effect === "threshold-five";
  you.battleArea.push(
    permanent("demo-yaamon-host", "BT2-009", 0, active ? 4000 : 3000, [
      { instanceId: "demo-yaamon-source", cardId: "BT2-008" },
    ]),
  );
  const ownTrashCount = effect === "below-threshold" ? 4 : effect === "opponent-trash-only" ? 0 : 5;
  for (let index = 0; index < ownTrashCount; index += 1) {
    you.trash.push(card(`demo-yaamon-own-trash-${index}`, "BT1-010", 0));
  }
  if (effect === "opponent-trash-only") {
    for (let index = 0; index < 5; index += 1) {
      opponent.trash.push(card(`demo-yaamon-opponent-trash-${index}`, "BT1-010", 1));
    }
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "threshold-five": "With exactly 5 cards in its owner's trash during their turn, Yaamon granted its host +1000 DP.",
    "below-threshold": "With only 4 cards in its owner's trash, Yaamon's inherited DP bonus stayed inactive.",
    "opponent-trash-only": "Five cards in the opponent's trash did not satisfy Yaamon's own-trash requirement.",
    "opponent-turn":
      "Despite 5 cards in its owner's trash, Yaamon's Your Turn bonus stayed inactive on the opponent's turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-008",
        effectKey: "BT2-008/own-trash-threshold",
        description: descriptions[effect] ?? "BT2-008 Yaamon resolved.",
        timing: "Your Turn",
      },
    ],
  };
}

function pagumonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const attacker = permanent("demo-pagumon-host", "BT2-009", 0, 3000, [
    { instanceId: "demo-pagumon-source", cardId: "BT2-007" },
  ]);
  attacker.isSuspended = effect !== null;
  you.battleArea.push(attacker);
  opponent.securityCount = effect === "trashed-top" ? 4 : 5;
  if (effect === "trashed-top") {
    you.trash.push(card("demo-pagumon-trashed-top", "BT1-010", 0));
    you.deckCount = 1;
  } else if (effect === null) {
    you.deckCount = 2;
  } else {
    you.deckCount = 0;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "trashed-top": "When its host attacked, Pagumon trashed exactly the top card of its owner's deck.",
    "empty-deck": "Pagumon's mandatory When Attacking effect resolved harmlessly because its owner's deck was empty.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-007",
        effectKey: "BT2-007/trash-top-deck",
        description: descriptions[effect] ?? "BT2-007 Pagumon resolved.",
        timing: "When Attacking",
      },
    ],
  };
}

function tsumemonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const active = effect === "q995-same-name";
  you.battleArea.push(
    permanent("demo-tsumemon-host", "BT2-009", 0, active ? 5000 : 3000, [
      { instanceId: "demo-tsumemon-source", cardId: "BT2-006" },
    ]),
  );
  if (effect === "q995-same-name" || effect === "opponent-turn") {
    you.battleArea.push(permanent("demo-tsumemon-same-name", "BT2-009", 0, 3000));
  } else if (effect === "different-name") {
    you.battleArea.push(permanent("demo-tsumemon-different-name", "BT2-008", 0, 3000));
  } else if (effect === "opponent-same-name") {
    opponent.battleArea.push(permanent("demo-tsumemon-opponent-same-name", "BT2-009", 1, 3000));
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "q995-same-name":
      "Another allied Guilmon matched the evolved host's current name, so Tsumemon granted the host +2000 DP (Q995).",
    "different-name": "The allied Digimon had a different name, so Tsumemon's inherited DP bonus stayed inactive.",
    "opponent-same-name": "An opponent's Guilmon did not satisfy Tsumemon's requirement for another allied Digimon.",
    "opponent-turn":
      "Two allied Guilmon shared a name, but Tsumemon's Your Turn bonus stayed inactive on the opponent's turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-006",
        effectKey: "BT2-006/same-name-dp",
        description: descriptions[effect] ?? "BT2-006 Tsumemon resolved.",
        timing: "Your Turn",
      },
    ],
  };
}

function kapurimonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const hasReboot = effect !== "without-reboot";
  const boosted = hasReboot && effect !== "opponent-turn";
  you.battleArea.push(
    permanent("demo-kapurimon-host", hasReboot ? "BT2-065" : "BT2-062", 0, boosted ? 8000 : 7000, [
      { instanceId: "demo-kapurimon-source", cardId: "BT2-005" },
    ]),
  );
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    active: "During its owner's turn, Kapurimon gave its Reboot host +1000 DP.",
    "without-reboot": "The host did not have Reboot, so Kapurimon's inherited +1000 DP stayed inactive.",
    "opponent-turn": "The host had Reboot, but Kapurimon's Your Turn DP bonus stayed inactive on the opponent's turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-005",
        effectKey: "BT2-005/reboot-dp",
        description: descriptions[effect] ?? "BT2-005 Kapurimon resolved.",
        timing: "Your Turn",
      },
    ],
  };
}

function argomonEggBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "main-phase" ? Phase.Main : Phase.Active;
  state.turnCount = 5;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = effect === "active-unsuspend" ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const host = permanent("demo-argomon-egg-host", "BT2-043", 0, 3000, [
    { instanceId: "demo-argomon-egg-source", cardId: "BT2-004" },
  ]);
  host.isSuspended = effect === null;
  you.battleArea.push(host);
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "active-unsuspend": "Argomon's host really unsuspended during its owner's Active phase, gaining 1 memory.",
    "q994-already-active":
      "Argomon's host was already active, so the Active phase did not unsuspend it and no memory was gained (Q994).",
    "main-phase":
      "The host unsuspended during the Main phase, outside Argomon's required unsuspend phase, so no memory was gained.",
    "opponent-turn":
      "The host unsuspended during the opponent's Active phase, so Argomon's Your Turn effect did not activate.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-004",
        effectKey: "BT2-004/active-phase-unsuspend",
        description: descriptions[effect] ?? "BT2-004 Argomon resolved.",
        timing: "Your Turn",
      },
    ],
  };
}

function nyaromonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "owner-turn" ? 0 : 1;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const hostCount = effect === "stacked" ? 2 : 1;
  for (let index = 0; index < hostCount; index += 1) {
    const host = permanent(`demo-nyaromon-host-${index}`, "BT2-034", 0, 3000, [
      { instanceId: `demo-nyaromon-source-${index}`, cardId: "BT2-003" },
    ]);
    host.isSuspended = effect !== "active-host";
    you.battleArea.push(host);
  }
  you.securityCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    active: "On the opponent's turn, suspended Nyaromon's host gave all of its owner's Security Digimon +1000 DP.",
    "active-host": "Nyaromon's host was active, so its conditional Security DP aura stayed inactive.",
    "owner-turn": "Nyaromon's Security DP aura stayed inactive during its owner's turn, even with a suspended host.",
    stacked: "Two suspended hosts with Nyaromon each contributed +1000 DP, for +2000 DP to their Security Digimon.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-003",
        effectKey: "BT2-003/opponent-turn-security-dp",
        description: descriptions[effect] ?? "BT2-003 Nyaromon resolved.",
        timing: "Opponent's Turn",
      },
    ],
  };
}

function demiVeemonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "active-phase" ? Phase.Active : Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const boosted = effect === "main-unsuspend" || effect === "second-unsuspend";
  const host = permanent("demo-demiveemon-host", "BT2-012", 0, boosted ? 5000 : 4000, [
    { instanceId: "demo-demiveemon-source", cardId: "BT2-002" },
  ]);
  host.isSuspended = effect === null;
  you.battleArea.push(host);
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "main-unsuspend":
      "DemiVeemon's host really became unsuspended during its owner's main phase and gained +1000 DP for the turn.",
    "q993-already-active":
      "An unsuspend effect targeted an already active host, so no unsuspend occurred and DemiVeemon did not activate (Q993).",
    "active-phase":
      "The host unsuspended during the Active phase, so DemiVeemon's main-phase trigger did not activate.",
    "second-unsuspend":
      "After a second real unsuspend in the same main phase, DemiVeemon remained at only +1000 DP because it is Once Per Turn.",
    "opponent-turn": "The host unsuspended on the opponent's turn, so DemiVeemon's Your Turn effect did not activate.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-002",
        effectKey: "BT2-002/main-phase-unsuspend",
        description: descriptions[effect] ?? "BT2-002 DemiVeemon resolved.",
        timing: "Your Turn",
      },
    ],
  };
}

function gigimonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const active = effect === "threshold-five";
  you.battleArea.push(
    permanent("demo-gigimon-host", "BT2-009", 0, active ? 4000 : 3000, [
      { instanceId: "demo-gigimon-source", cardId: "BT2-001" },
    ]),
  );
  const trashCount = effect === "below-threshold" ? 4 : 5;
  for (let index = 0; index < trashCount; index += 1) {
    opponent.trash.push(card(`demo-gigimon-trash-${index}`, "BT1-010", 1));
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "threshold-five":
      "With exactly 5 cards in the opponent's trash during its owner's turn, Gigimon granted its host +1000 DP.",
    "below-threshold": "With only 4 cards in the opponent's trash, Gigimon's inherited DP bonus stayed inactive.",
    "opponent-turn": "Despite 5 cards in the opponent's trash, Gigimon's Your Turn bonus was inactive on their turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT2-001",
        effectKey: "BT2-001/your-turn-trash-threshold",
        description: descriptions[effect] ?? "BT2-001 Gigimon resolved.",
        timing: "Your Turn",
      },
    ],
  };
}

function veedramonBt1Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "all-turns-opponent" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "q992-two-blue" || effect === "all-turns-opponent") {
    you.battleArea.push(
      permanent("demo-veedramon-host", "BT1-032", 0, 6000, [
        { instanceId: "demo-veedramon-source", cardId: "BT1-115" },
      ]),
      permanent("demo-veedramon-blue-tamer-1", "BT1-086", 0, 0),
      permanent("demo-veedramon-blue-tamer-2", "BT1-086", 0, 0),
    );
  } else {
    const veedramon = permanent("demo-veedramon", "BT1-115", 0, 6000);
    veedramon.isSuspended = effect === "second-attack" || effect === "no-tamer";
    you.battleArea.push(veedramon);
    if (effect !== "no-tamer") you.battleArea.push(permanent("demo-veedramon-red-tamer", "BT1-085", 0, 0));
  }
  opponent.securityCount = effect === "q991-red-tamer" ? 4 : 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "q991-red-tamer":
      "Veedramon unsuspended after attacking because any Tamer qualifies; the controlled Tamer was red, not blue (Q991).",
    "second-attack": "Veedramon's Once Per Turn effect was already used, so its second attack left it suspended.",
    "no-tamer": "Without a Tamer in play, Veedramon's When Attacking effect did not unsuspend it.",
    "q992-two-blue": "Two blue Tamers still granted only +1000 DP through Veedramon's inherited effect (Q992).",
    "all-turns-opponent":
      "The inherited +1000 DP remained active during the opponent's turn because it is an All Turns effect.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-115",
        effectKey:
          effect === "q992-two-blue" || effect === "all-turns-opponent" ? "BT1-115/blue-tamer-dp" : "BT1-115/unsuspend",
        description: descriptions[effect] ?? "BT1-115 Veedramon resolved.",
        timing: effect === "q992-two-blue" || effect === "all-turns-opponent" ? "All Turns" : "When Attacking",
      },
    ],
  };
}

function metalGreymonBt1Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "attacking" ? Phase.Main : Phase.End;
  state.turnCount = 5;
  state.turnSeat = effect === "inherited-opponent-turn" ? 1 : 0;
  state.memory = effect === null ? 2 : effect === "attacking" ? -3 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "inherited-own-turn" || effect === "inherited-opponent-turn") {
    you.battleArea.push(
      permanent("demo-metalgreymon-host", "BT1-115", 0, effect === "inherited-own-turn" ? 13000 : 10000, [
        { instanceId: "demo-metalgreymon-source", cardId: "BT1-114" },
      ]),
    );
  } else {
    const attacker = permanent("demo-metalgreymon", "BT1-114", 0, 9000);
    attacker.isSuspended = effect === "attacking" || effect === "q990-resolved";
    you.battleArea.push(attacker);
  }
  opponent.securityCount = effect === "q990-resolved" ? 1 : 4;
  if (effect === "q990-resolved") {
    opponent.trash.push(
      card("demo-metalgreymon-check-1", "BT1-009", 1),
      card("demo-metalgreymon-check-2", "BT1-010", 1),
      card("demo-metalgreymon-check-3", "BT1-011", 1),
    );
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    attacking:
      "MetalGreymon's attack was legal at 2 memory. Its When Attacking effect moved memory to -3, but the attack continued (Q990).",
    "q990-resolved":
      "MetalGreymon completed all 3 security checks from Security Attack +2 before the memory gauge changed the turn (Q990).",
    "inherited-own-turn": "MetalGreymon's inherited effect gave its red host +3000 DP during its owner's turn.",
    "inherited-opponent-turn":
      "On the opponent's turn, MetalGreymon's inherited +3000 DP no longer applied to its host.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-114",
        effectKey: effect.startsWith("inherited") ? "BT1-114/your-turn-dp" : "BT1-114/attack-cost",
        description: descriptions[effect] ?? "BT1-114 MetalGreymon resolved.",
        timing: effect.startsWith("inherited") ? "Your Turn" : "When Attacking",
      },
    ],
  };
}

function forbiddenTemptationDemo(effect: string | null): CardEffectsFixture {
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
        kind: "effectResolved",
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

function dimensionScissorDemo(effect: string | null): CardEffectsFixture {
  const effectText =
    "[Main] 1 of your Digimon gains: 'When this Digimon deletes an opponent's Digimon in battle and survives, unsuspend it' for the turn.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" ? Phase.End : Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === null ? 3 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const attacker = permanent("demo-scissor-attacker", "BT1-057", 0, 10000);
  if (effect === "q985-security" || effect === "q987-other" || effect === "q1263-prebattle") {
    attacker.isSuspended = true;
  }
  you.battleArea.push(attacker, permanent("demo-scissor-color", "BT1-064", 0, 4000));
  if (effect === null || effect === "granted" || effect === "expired") {
    opponent.battleArea.push(permanent("demo-scissor-defender", "BT1-003", 1, 1000));
  }
  if (effect === "q984-multiple") {
    opponent.trash.push(
      card("demo-scissor-first-deleted", "BT1-003", 1),
      card("demo-scissor-second-deleted", "BT1-009", 1),
    );
  }
  if (effect === "q985-security") opponent.trash.push(card("demo-scissor-security-digimon", "BT1-010", 1));
  if (effect === "q986-blocker") opponent.trash.push(card("demo-scissor-blocker", "BT1-072", 1));
  if (effect === "q987-other") {
    opponent.battleArea.push(permanent("demo-scissor-protected-target", "BT1-016", 1, 5000));
    opponent.trash.push(card("demo-scissor-other-deleted", "BT1-010", 1));
  }
  if (effect === "q1263-prebattle") opponent.trash.push(card("demo-scissor-prebattle-target", "BT1-016", 1));
  if (effect === null) {
    you.hand.push(card("demo-scissor-option", "BT1-112", 0));
    you.handCount = 1;
  } else if (effect === "security-hand") {
    you.hand.push(card("demo-scissor-security", "BT1-112", 0));
    you.handCount = 1;
    you.securityCount = 4;
  } else {
    you.trash.push(card("demo-scissor-option", "BT1-112", 0));
    if (effect === "q1263-prebattle") you.trash.push(card("demo-scissor-depths", "BT4-101", 0));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    granted:
      "Dimension Scissor granted its battle-deletion unsuspend effect to exactly 1 selected Digimon for the turn.",
    "q984-multiple":
      "The granted Digimon deleted 2 opposing Digimon in separate battles and unsuspended after each one (Q984).",
    "q985-security":
      "The attacker survived battle with a Security Digimon but remained suspended because Security battles do not qualify (Q985).",
    "q986-blocker": "The attacker deleted a blocking Digimon in battle, survived, and unsuspended (Q986).",
    "q987-other":
      "An attack effect deleted a different opposing Digimon, but the protected battle target survived and the attacker remained suspended (Q987).",
    "q1263-prebattle":
      "BT4-101 deleted the source-less attack target before battle began, so Dimension Scissor did not unsuspend the attacker (Q1263).",
    expired: "Dimension Scissor's granted effect expired at the end of the turn.",
    "security-hand": "Dimension Scissor's Security effect added the card to its owner's hand.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-112",
        effectKey: effect === "security-hand" ? "BT1-112/security" : "BT1-112/main",
        description: descriptions[effect] ?? effectText,
        timing: effect === "security-hand" ? "Security" : effect === "expired" ? "End of Turn" : "Main",
      },
    ],
  };
}

function gigaBlasterDemo(effect: string | null): CardEffectsFixture {
  const effectText = "[Main] Suspend 1 opposing Digimon or exactly 2 opposing Digimon with 5000 DP or less.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === null ? 3 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-giga-color", "BT1-067", 0, 1000));
  const first = permanent("demo-giga-first", "BT1-010", 1, 2000);
  const second = permanent("demo-giga-second", "BT1-015", 1, 4000);
  const large = permanent("demo-giga-large", "BT1-016", 1, 9000);
  if (effect === "mode-one") large.isSuspended = true;
  if (effect === "mode-two" || effect === "security-mode-two") {
    first.isSuspended = true;
    second.isSuspended = true;
  }
  if (effect === "q983-fallback") first.isSuspended = true;
  opponent.battleArea.push(first);
  if (effect !== "q983-fallback") opponent.battleArea.push(second);
  opponent.battleArea.push(large);
  if (effect === null) {
    you.hand.push(card("demo-giga-option", "BT1-111", 0));
    you.handCount = 1;
  } else {
    you.trash.push(card("demo-giga-option", "BT1-111", 0));
    if (effect === "security-mode-two") you.securityCount = 4;
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  if (effect === "choice") {
    return {
      state,
      decision: {
        decisionId: "demo-giga-mode",
        seat: 0,
        kind: "chooseOption",
        promptText: "Choose exactly 1 Giga Blaster mode",
        sourceCardId: "BT1-111",
        options: {
          choices: ["Suspend 1 opposing Digimon", "Suspend exactly 2 opposing Digimon with 5000 DP or less"],
          timing: "Main",
          effectText,
        },
      },
    };
  }
  const descriptions: Record<string, string> = {
    "mode-one":
      "Giga Blaster chose only its first mode and suspended exactly 1 opposing Digimon regardless of DP (Q982).",
    "mode-two":
      "Giga Blaster chose only its second mode and suspended exactly 2 opposing Digimon with 5000 DP or less (Q982).",
    "q983-fallback":
      "With only 1 low-DP Digimon available, Giga Blaster used the 1-Digimon mode; the unavailable 2-target mode was not offered (Q983).",
    "security-mode-two":
      "Security Giga Blaster activated Main and suspended exactly 2 opposing Digimon with 5000 DP or less.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-111",
        effectKey: effect === "security-mode-two" ? "BT1-111/security" : "BT1-111/main",
        description: descriptions[effect] ?? effectText,
        timing: effect === "security-mode-two" ? "Security" : "Main",
      },
    ],
  };
}

function flowerCannonDemo(effect: string | null): CardEffectsFixture {
  const mainText = "[Main] Suspend 1 of your opponent's Digimon.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === null ? 2 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-flower-color", "BT1-067", 0, 1000));
  const first = permanent("demo-flower-first", "BT1-010", 1, 2000);
  const second = permanent("demo-flower-second", "BT1-011", 1, 3000);
  if (
    effect === "main-suspended" ||
    effect === "already-suspended" ||
    effect === "security-all" ||
    effect === "q981-granted"
  ) {
    first.isSuspended = true;
  }
  if (effect === "security-all" || effect === "q981-granted") second.isSuspended = true;
  opponent.battleArea.push(first, second);
  if (effect === "security-all") opponent.battleArea.push(permanent("demo-flower-printed-blocker", "BT1-023", 1, 6000));
  if (effect === "q981-granted") opponent.battleArea.push(permanent("demo-flower-granted-blocker", "BT1-012", 1, 3000));
  if (effect === null) {
    you.hand.push(card("demo-flower-option", "BT1-110", 0));
    you.handCount = 1;
  } else if (effect === "security-all" || effect === "q981-granted") {
    you.trash.push(card("demo-flower-security", "BT1-110", 0));
    you.securityCount = 4;
  } else {
    you.trash.push(card("demo-flower-option", "BT1-110", 0));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "main-suspended": "Flower Cannon suspended exactly 1 selected opposing Digimon.",
    "already-suspended":
      "Flower Cannon legally selected an already suspended opposing Digimon and resolved as a no-op.",
    "security-all":
      "Security Flower Cannon suspended every opposing non-Blocker and left the printed Blocker unsuspended.",
    "q981-granted":
      "Security Flower Cannon left the Digimon that had gained Blocker unsuspended while suspending every non-Blocker (Q981).",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-110",
        effectKey:
          effect === "security-all" || effect === "q981-granted" ? "BT1-110/security-suspend" : "BT1-110/main-suspend",
        description: descriptions[effect ?? ""] ?? mainText,
        timing: effect === "security-all" || effect === "q981-granted" ? "Security" : "Main",
      },
    ],
  };
}

function smashedPotatoesDemo(effect: string | null): CardEffectsFixture {
  const mainText =
    "[Main] For the turn, the next time one of your green Digimon digivolves from level 5 to level 6, decrease the digivolution cost by 4.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" ? Phase.End : Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === null ? 6 : effect === "consumed-once" ? 6 : 4;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const evolved = effect === "q978-free" || effect === "q980-effect" || effect === "q1736-persisted";
  you.battleArea.push(
    permanent(
      "demo-potatoes-base",
      evolved ? (effect === "q980-effect" ? "BT9-055" : "BT1-080") : "BT1-075",
      0,
      evolved ? 12000 : 9000,
      evolved ? [{ instanceId: "demo-potatoes-old-top", cardId: "BT1-075" }] : [],
    ),
  );
  if (effect === "q979-breeding") {
    const breeding = permanent("demo-potatoes-breeding", "BT1-083", 0, 11000, [
      { instanceId: "demo-potatoes-breeding-base", cardId: "BT1-075" },
    ]);
    breeding.inBreeding = true;
    you.breeding = breeding;
    you.battleArea[0] = permanent("demo-potatoes-base", "BT9-055", 0, 12000, [
      { instanceId: "demo-potatoes-battle-base", cardId: "BT1-075" },
    ]);
  }
  if (effect === "consumed-once") {
    you.battleArea[0] = permanent("demo-potatoes-first", "BT1-080", 0, 12000, [
      { instanceId: "demo-potatoes-first-base", cardId: "BT1-075" },
    ]);
    you.battleArea.push(
      permanent("demo-potatoes-second", "BT1-080", 0, 12000, [
        { instanceId: "demo-potatoes-second-base", cardId: "BT1-075" },
      ]),
    );
  }
  if (effect === "q1736-persisted") {
    const shivamon = permanent("demo-potatoes-shivamon", "BT8-057", 1, 12000);
    shivamon.isSuspended = true;
    opponent.battleArea.push(shivamon);
    you.hand.push(card("demo-potatoes-blocked-option", "BT1-108", 0));
    you.handCount = 1;
  }
  if (effect === null) {
    you.hand.push(card("demo-potatoes-option", "BT1-109", 0), card("demo-potatoes-evolution", "BT1-080", 0));
    you.handCount = 2;
  } else if (effect === "security-trashed") {
    you.trash.push(card("demo-potatoes-security", "BT1-109", 0));
    you.securityCount = 4;
  } else {
    you.trash.push(card("demo-potatoes-option", "BT1-109", 0));
    if (effect === "armed" || effect === "expired") {
      you.hand.push(card("demo-potatoes-evolution", "BT1-080", 0));
      you.handCount = 1;
    }
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    armed:
      "Smashed Potatoes armed a -4 cost adjustment for the next eligible green level-5-to-6 digivolution this turn.",
    "q978-free": "A printed cost-2 level 6 digivolution was reduced by 4 to 0 without gaining memory (Q978).",
    "q979-breeding":
      "The breeding-area digivolution paid full cost and did not consume the adjustment; the later battle-area digivolution was free (Q979).",
    "q980-effect": "An effect-driven X Antibody digivolution consumed the adjustment and was reduced to cost 0 (Q980).",
    "q1736-persisted":
      "After Shivamon became suspended and prohibited new Option uses, the already-resolved Smashed Potatoes adjustment still made the digivolution free (Q1736).",
    "consumed-once":
      "Only the first eligible digivolution was free; the second paid its printed cost after the adjustment was consumed.",
    expired: "The unused Smashed Potatoes adjustment expired at the end of the turn.",
    "security-trashed": "Smashed Potatoes has no Security effect and was simply trashed after the check.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-109",
        effectKey: effect === "security-trashed" ? "BT1-109/no-security-effect" : "BT1-109/main",
        description: descriptions[effect] ?? mainText,
        timing: effect === "security-trashed" ? "Security" : effect === "expired" ? "End of Turn" : "Main",
      },
    ],
  };
}

function hornBusterDemo(effect: string | null): CardEffectsFixture {
  const mainText = "[Main] 1 of your Digimon gets +3000 DP for the turn.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" ? Phase.End : Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === null || effect === "no-target" ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "no-target" || effect === "no-target-used") {
    you.battleArea.push(permanent("demo-horn-mimi", "BT1-089", 0, 0));
  } else {
    const recipient = permanent("demo-horn-recipient", "BT1-064", 0, effect === "main-boosted" ? 7000 : 4000);
    if (effect === "main-boosted") recipient.baseDP = 4000;
    you.battleArea.push(recipient);
  }
  if (effect === "security-resolved") {
    const target = permanent("demo-horn-security-target", "BT1-010", 1, 2000);
    target.isSuspended = true;
    opponent.battleArea.push(target);
  }
  if (effect === null || effect === "no-target") {
    you.hand.push(card("demo-horn-option", "BT1-108", 0));
    you.handCount = 1;
  } else if (effect === "security-resolved" || effect === "security-no-target") {
    you.hand.push(card("demo-horn-security", "BT1-108", 0));
    you.handCount = 1;
    you.securityCount = 4;
  } else {
    you.trash.push(card("demo-horn-option", "BT1-108", 0));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null || effect === "no-target") return { state };
  const descriptions: Record<string, string> = {
    "main-boosted":
      "Horn Buster gave the selected Digimon +3000 DP for the turn through the production Option-use timing.",
    expired: "Horn Buster's +3000 DP modifier expired at the end of the turn.",
    "no-target-used":
      "Horn Buster was legally used with a green Tamer satisfying its color requirement and no Digimon to select; the effect resolved without a target.",
    "security-resolved":
      "Horn Buster suspended 1 opposing Digimon, then added itself from security to its owner's hand.",
    "security-no-target":
      "With no opposing Digimon to suspend, Security Horn Buster still added itself to its owner's hand.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-108",
        effectKey:
          effect === "security-resolved" || effect === "security-no-target"
            ? "BT1-108/security-suspend-return"
            : "BT1-108/main-dp-boost",
        description: descriptions[effect] ?? mainText,
        timing:
          effect === "security-resolved" || effect === "security-no-target"
            ? "Security"
            : effect === "expired"
              ? "End of Turn"
              : "Main",
      },
    ],
  };
}

function holyWaveDemo(effect: string | null): CardEffectsFixture {
  const mainText = "[Main] Trigger ＜Recovery +1 (Deck)＞.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "q1237-q1249" ? 1 : 0;
  state.memory = effect === null || effect === "empty-deck" ? 6 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-wave-color", "BT1-047", 0, 6000));
  if (effect === "q1237-q1249") {
    you.battleArea.push(permanent("demo-wave-dan", "BT4-088", 0, 12000));
    const kari = permanent("demo-wave-kari", "BT4-097", 0, 0);
    kari.isSuspended = true;
    you.battleArea.push(kari);
    opponent.battleArea.push(permanent("demo-wave-attacker", "BT1-010", 1, 5000));
    you.securityCount = 1;
    opponent.securityCount = 0;
    opponent.trash.push(card("demo-wave-dan-trashed", "BT1-001", 1));
    you.deckCount = 35;
  } else if (effect === "main-recovered") {
    you.securityCount = 6;
    you.deckCount = 35;
  } else if (effect === "security-recovered") {
    you.securityCount = 5;
    you.deckCount = 35;
    you.trash.push(card("demo-wave-security", "BT1-107", 0));
  } else if (effect === "q977-continued") {
    you.securityCount = 0;
    you.deckCount = 35;
    you.trash.push(card("demo-wave-security", "BT1-107", 0), card("demo-wave-recovered", "BT1-010", 0));
  }
  if (effect === null || effect === "empty-deck") {
    you.hand.push(card("demo-wave-option", "BT1-107", 0));
    you.handCount = 1;
    if (effect === "empty-deck") you.deckCount = 0;
  } else if (effect === "main-recovered") {
    you.trash.push(card("demo-wave-option", "BT1-107", 0));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null || effect === "empty-deck") {
    if (effect === null) return { state };
  }
  const descriptions: Record<string, string> = {
    "main-recovered": "Holy Wave placed the top card of the deck face down on top of the security stack.",
    "security-recovered":
      "Holy Wave's Security effect activated Recovery +1; one card left security and one was added from deck.",
    "q977-continued":
      "After Security Holy Wave recovered a card into the empty stack, the remaining Security Attack +1 check continued into that new card (Q977).",
    "q1237-q1249":
      "Even though Holy Wave left the security count unchanged, removing the checked card triggered DanDevimon and let Kari suspend to gain 1 memory (Q1237/Q1249).",
    "empty-deck": "Holy Wave was legally used with an empty deck and resolved without recovering a card.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-107",
        effectKey: effect === "main-recovered" || effect === "empty-deck" ? "BT1-107/main" : "BT1-107/security",
        description: descriptions[effect ?? ""] ?? mainText,
        timing: effect === "main-recovered" || effect === "empty-deck" ? "Main" : "Security",
      },
    ],
  };
}

function polyphonyDemo(effect: string | null): CardEffectsFixture {
  const effectText = "[Main] 1 of your opponent's Digimon gets -7000 DP for the turn.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" ? Phase.End : Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === null ? 5 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-polyphony-color", "BT1-047", 0, 6000));
  if (effect !== "deleted" && effect !== "security-trashed") {
    opponent.battleArea.push(permanent("demo-polyphony-target", "BT10-028", 1, effect === "reduced" ? 5000 : 12000));
  }
  if (effect === null) {
    you.hand.push(card("demo-polyphony-option", "BT1-106", 0));
    you.handCount = 1;
  } else if (effect === "security-trashed") {
    you.trash.push(card("demo-polyphony-security", "BT1-106", 0));
    you.securityCount = 4;
  } else {
    you.trash.push(card("demo-polyphony-option", "BT1-106", 0));
    if (effect === "deleted") opponent.trash.push(card("demo-polyphony-deleted", "BT1-016", 1));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    reduced: "Symphony No.1 <Polyphony> gave exactly 1 opposing 12000 DP Digimon -7000 DP for 5000 DP.",
    deleted: "The -7000 DP modifier reduced a 7000 DP Digimon to 0 DP and deleted it.",
    expired: "The -7000 DP modifier expired at the end of the turn and the Digimon returned to its printed 12000 DP.",
    "security-trashed": "Symphony No.1 <Polyphony> has no Security effect and was simply trashed after the check.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-106",
        effectKey: effect === "security-trashed" ? "BT1-106/no-security-effect" : "BT1-106/dp-minus",
        description: descriptions[effect] ?? effectText,
        timing: effect === "security-trashed" ? "Security" : effect === "expired" ? "End of Turn" : "Main",
      },
    ],
  };
}

function blastFireDemo(effect: string | null): CardEffectsFixture {
  const mainText =
    "[Main] Change the original DP of 1 of your opponent's Digimon to 3000 until the end of your opponent's next turn.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" ? Phase.End : Phase.Main;
  state.turnCount = effect === "expired" ? 7 : 5;
  state.turnSeat = effect === "expired" ? 0 : effect === null ? 0 : 1;
  state.memory = effect === null ? 4 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-blast-color", "BT1-047", 0, 6000));
  if (effect !== "q973-deleted" && effect !== "security-trashed") {
    const target =
      effect === "q976-digivolved"
        ? permanent("demo-blast-target", "ST1-11", 1, 3000, [{ instanceId: "demo-blast-old-top", cardId: "ST1-09" }])
        : permanent(
            "demo-blast-target",
            "ST3-07",
            1,
            effect === "q974-plus"
              ? 6000
              : effect === "q975-existing"
                ? 4000
                : effect === "expired"
                  ? 6000
                  : effect === null
                    ? 6000
                    : 3000,
          );
    if (effect !== null && effect !== "expired") target.baseDP = 3000;
    opponent.battleArea.push(target);
  }
  if (effect === null) {
    you.hand.push(card("demo-blast-option", "BT1-105", 0));
    you.handCount = 1;
  } else if (effect === "security-trashed") {
    you.trash.push(card("demo-blast-security", "BT1-105", 0));
    you.securityCount = 4;
  } else {
    you.trash.push(card("demo-blast-option", "BT1-105", 0));
    if (effect === "q973-deleted") opponent.trash.push(card("demo-blast-deleted", "ST3-07", 1));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    changed: "Blast Fire changed only the selected Digimon's original DP to 3000 (Q972).",
    "q973-deleted":
      "After Blast Fire changed the original DP to 3000, a later -4000 DP effect deleted the Digimon at 0 DP (Q973).",
    "q974-plus": "A later +3000 DP modifier was added to the changed 3000 original DP for 6000 total DP (Q974).",
    "q975-existing":
      "An existing +1000 DP modifier remained and was added to the changed 3000 original DP for 4000 total DP (Q975).",
    "q976-digivolved": "After digivolving, the same permanent was still treated as having 3000 original DP (Q976).",
    expired:
      "Blast Fire's original-DP override expired after the opponent's next turn and the printed DP applied again.",
    "security-trashed": "Blast Fire has no Security effect and was simply trashed after the security check.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-105",
        effectKey: effect === "security-trashed" ? "BT1-105/no-security-effect" : "BT1-105/main",
        description: descriptions[effect] ?? mainText,
        timing: effect === "security-trashed" ? "Security" : effect === "expired" ? "End of Turn" : "Main",
      },
    ],
  };
}

function goldenRipperDemo(effect: string | null): CardEffectsFixture {
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
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-104",
        effectKey: effect === "security-trashed" ? "BT1-104/no-security-effect" : "BT1-104/main",
        description: descriptions[effect] ?? mainText,
        timing: effect === "security-trashed" ? "Security" : effect === "expired" ? "End of Turn" : "When Attacking",
      },
    ],
  };
}

function testamentDemo(effect: string | null): CardEffectsFixture {
  const mainText = "[Main] Until the end of your opponent's next turn, 1 of your Digimon gains ＜Blocker＞.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" ? Phase.End : Phase.Main;
  state.turnCount = effect === "expired" ? 7 : 5;
  state.turnSeat = effect === "main-active" ? 1 : 0;
  state.memory = effect === null || effect === "no-target" ? 3 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "no-target" || effect === "no-target-used") {
    you.battleArea.push(permanent("demo-testament-tamer", "BT1-087", 0, 0));
  } else {
    you.battleArea.push(permanent("demo-testament-recipient", "BT1-047", 0, 6000));
  }
  if (effect === null || effect === "no-target") {
    you.hand.push(card("demo-testament-option", "BT1-103", 0));
    you.handCount = 1;
  } else if (effect === "security-resolved") {
    you.hand.push(card("demo-testament-option", "BT1-103", 0), card("demo-testament-drawn", "BT1-001", 0));
    you.handCount = 2;
    you.deckCount = 35;
    you.securityCount = 4;
  } else {
    you.trash.push(card("demo-testament-option", "BT1-103", 0));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null || effect === "no-target") return { state };
  const descriptions: Record<string, string> = {
    "main-active": "Testament granted Blocker to the selected Digimon through the end of the opponent's next turn.",
    expired: "The Blocker granted by Testament expired at the end of the opponent's next turn.",
    "no-target-used":
      "Testament was legally used with a yellow Tamer satisfying its color requirement and no Digimon to select; the effect resolved without a target.",
    "security-resolved": "Testament's Security effect drew 1 card, then added Testament itself to its owner's hand.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-103",
        effectKey: effect === "security-resolved" ? "BT1-103/security-draw-return" : "BT1-103/main-gain-blocker",
        description: descriptions[effect] ?? mainText,
        timing: effect === "security-resolved" ? "Security" : effect === "expired" ? "End of Turn" : "Main",
      },
    ],
  };
}

function bladeOfTheTrueDemo(effect: string | null): CardEffectsFixture {
  const mainText = "[Main] Trigger ＜Draw 1＞ for every 2 security cards you have.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === null ? 2 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const securityCount = effect === "q966-zero" ? 0 : effect === "q966-one" ? 1 : effect === "security-drew-two" ? 3 : 4;
  you.securityCount = securityCount;
  if (effect === null) {
    you.hand.push(card("demo-blade-option", "BT1-102", 0));
    you.handCount = 1;
  } else {
    you.trash.push(card("demo-blade-option", "BT1-102", 0));
    if (effect === "main-drew-two" || effect === "security-drew-two") {
      you.hand.push(card("demo-blade-draw-one", "BT1-001", 0), card("demo-blade-draw-two", "BT1-002", 0));
      you.handCount = 2;
      you.deckCount = 34;
    }
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "main-drew-two": "Blade of the True saw 4 security cards and triggered Draw 1 twice.",
    "security-drew-two":
      "Blade of the True's Security effect activated Main and triggered Draw 1 twice from the 4-card security stack.",
    "q966-one": "Blade of the True was used with 1 security card, paid its cost, and drew nothing (Q966).",
    "q966-zero": "Blade of the True was used with no security cards, paid its cost, and drew nothing (Q966).",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-102",
        effectKey: effect === "security-drew-two" ? "BT1-102/security" : "BT1-102/main",
        description: descriptions[effect] ?? mainText,
        timing: effect === "security-drew-two" ? "Security" : "Main",
      },
    ],
  };
}

function howlingCrusherDemo(effect: string | null): CardEffectsFixture {
  const mainText = "[Main] Trash all digivolution cards under all of your opponent's Digimon.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "q1311-continued" ? 1 : 0;
  state.memory = effect === null ? 7 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const sources = [
    { instanceId: "demo-howling-source-one", cardId: "BT1-001" },
    { instanceId: "demo-howling-source-two", cardId: "BT1-002" },
    { instanceId: "demo-howling-source-three", cardId: "BT1-003" },
  ];
  const resolved = effect !== null;
  opponent.battleArea.push(
    permanent("demo-howling-first", "BT2-047", 1, 4000, resolved ? [] : sources.slice(0, 2)),
    permanent("demo-howling-second", "BT2-060", 1, 6000, resolved ? [] : sources.slice(2)),
  );
  if (effect === "q1311-continued") {
    const attacker = permanent("demo-howling-attacker", "BT1-081", 1, 10000);
    attacker.isSuspended = true;
    opponent.battleArea.push(attacker);
    you.battleArea.push(permanent("demo-howling-hexeblaumon", "BT5-032", 0, 11000));
  }
  if (effect === null) {
    you.hand.push(card("demo-howling-option", "BT1-101", 0));
    you.handCount = 1;
  } else {
    you.trash.push(card("demo-howling-option", "BT1-101", 0));
    opponent.trash.push(...sources.map((source) => card(source.instanceId, source.cardId, 1)));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "main-trashed": "Howling Crusher trashed every digivolution card under every opposing Digimon.",
    "security-trashed": "Howling Crusher's Security effect activated its Main effect and trashed all opposing sources.",
    "q1311-continued":
      "After Security Howling Crusher removed the attacker's sources, the already-declared attack continued through its additional security check despite Hexeblaumon (Q1311).",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-101",
        effectKey: effect === "main-trashed" ? "BT1-101/main" : "BT1-101/security",
        description: descriptions[effect] ?? mainText,
        timing: effect === "main-trashed" ? "Main" : "Security",
      },
    ],
  };
}

function graceCrossFreezerDemo(effect: string | null): CardEffectsFixture {
  const mainText =
    "[Main] Until the end of your opponent's next turn, their Digimon with no digivolution cards can't attack.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" || effect === "security-expired" ? Phase.End : Phase.Main;
  state.turnCount = effect === "expired" || effect === "security-expired" ? 6 : 5;
  state.turnSeat = effect === null ? 0 : 1;
  state.memory = effect === null ? 4 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-freezer-blue", "BT1-028", 0, 3000));
  const gainedSource = effect === "q965-gained";
  opponent.battleArea.push(
    permanent(
      "demo-freezer-first",
      "BT1-010",
      1,
      2000,
      gainedSource ? [{ instanceId: "demo-freezer-new-source", cardId: "BT1-001" }] : [],
    ),
    permanent("demo-freezer-loaded", "BT2-047", 1, 4000, [
      { instanceId: "demo-freezer-existing-source", cardId: "BT1-002" },
    ]),
  );
  if (effect === "late-arrival") opponent.battleArea.push(permanent("demo-freezer-late", "BT1-011", 1, 3000));
  if (effect === null) {
    you.hand.push(card("demo-freezer-option", "BT1-100", 0));
    you.handCount = 1;
  } else {
    you.trash.push(card("demo-freezer-option", "BT1-100", 0));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "main-active":
      "Grace Cross Freezer stopped every opposing source-less Digimon from attacking while the loaded Digimon could attack.",
    "q965-gained": "The formerly restricted Digimon gained a digivolution card and could attack immediately (Q965).",
    "late-arrival": "A source-less Digimon that entered after Grace Cross Freezer resolved was also unable to attack.",
    expired: "Grace Cross Freezer's Main restriction expired at the end of the opponent's next turn.",
    "security-active":
      "Grace Cross Freezer's Security effect stopped opposing source-less Digimon from attacking for the current turn.",
    "security-expired": "The Security restriction expired at the end of the current turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-100",
        effectKey: effect.startsWith("security-") ? "BT1-100/security" : "BT1-100/main",
        description: descriptions[effect] ?? mainText,
        timing: effect.startsWith("security-") ? "Security" : effect === "expired" ? "End of Turn" : "Main",
      },
    ],
  };
}

function palmonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "level-four-added" ? 0 : 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-palmon", "BT1-067", 0, 1000));
  if (effect === "level-four-added") {
    you.hand.push(card("demo-palmon-level-four", "BT1-016", 0));
    you.handCount = 1;
    you.deckCount = 35;
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "level-four-added") return { state };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-067",
        effectKey: "BT1-067/reveal-level-four",
        description: "Palmon added a non-green level 4 Digimon and bottom-decked the rest in the chosen order.",
        timing: "OnPlay",
      },
    ],
  };
}

function tentomonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const attacker = permanent("demo-tentomon-host", "BT1-068", 0, 5000, [
    { instanceId: "demo-tentomon-source", cardId: "BT1-066" },
  ]);
  const target = permanent("demo-tentomon-target", "BT1-016", 1, 3000);
  if (effect === "target-suspended") {
    attacker.isSuspended = true;
    target.isSuspended = true;
  }
  you.battleArea.push(attacker);
  opponent.battleArea.push(target);
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "target-suspended") return { state };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-066",
        effectKey: "BT1-066/suspend",
        description: "Tentomon's inherited effect suspended the opposing 3000 DP Digimon.",
        timing: "WhenAttacking",
      },
    ],
  };
}

function seraphimonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "recovered" ? 0 : 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.securityCount = effect === "recovered" ? 4 : 3;
  you.deckCount = effect === "recovered" ? 35 : 36;
  you.battleArea.push(
    permanent(
      "demo-seraphimon",
      effect === "recovered" ? "BT1-063" : "BT1-059",
      0,
      effect === "recovered" ? 10000 : 9000,
    ),
  );
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "recovered") return { state };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-063",
        effectKey: "BT1-063/recovery",
        description: "Seraphimon recovered the top deck card and has Security Attack +1 with 3 or more security.",
        timing: "WhenDigivolving",
      },
    ],
  };
}

function slashAngemonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "target-deleted" ? 0 : 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(
    permanent(
      "demo-slash-angemon",
      effect === "target-deleted" ? "BT1-062" : "BT1-059",
      0,
      effect === "target-deleted" ? 8000 : 9000,
    ),
  );
  if (effect === "target-deleted") {
    opponent.trash.push(card("demo-slash-angemon-target-card", "BT1-064", 1));
  } else {
    opponent.battleArea.push(permanent("demo-slash-angemon-target", "BT1-064", 1, 8000));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "target-deleted") return { state };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-062",
        effectKey: "BT1-062/dp-minus",
        description: "SlashAngemon gave the opposing Digimon -8000 DP, deleting it at 0 DP.",
        timing: "WhenDigivolving",
      },
    ],
  };
}

function mistymonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "two-reduced" ? 0 : 7;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-mistymon", "BT1-061", 0, 7000));
  opponent.battleArea.push(permanent("demo-mistymon-target-a", "BT1-070", 1, effect === "two-reduced" ? 3000 : 6000));
  opponent.battleArea.push(permanent("demo-mistymon-target-b", "BT1-071", 1, effect === "two-reduced" ? 4000 : 7000));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "two-reduced") return { state };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-061",
        effectKey: "BT1-061/dp-minus",
        description: "Mistymon gave exactly 2 opposing Digimon -3000 DP for the turn.",
        timing: "OnPlay",
      },
    ],
  };
}

function magnaAngemonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "recovered" ? 0 : 7;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.securityCount = effect === "recovered" ? 5 : 4;
  you.deckCount = effect === "recovered" ? 35 : 36;
  if (effect === "recovered") {
    you.battleArea.push(permanent("demo-magna-angemon", "BT1-060", 0, 6000));
  } else {
    you.hand.push(card("demo-magna-angemon-card", "BT1-060", 0));
    you.handCount = 1;
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "recovered") return { state };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-060",
        effectKey: "BT1-060/recovery",
        description: "MagnaAngemon placed the top card of the deck on top of security.",
        timing: "OnPlay",
      },
    ],
  };
}

function chirinmonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "loan-repaid-after-deletion" ? -6 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  opponent.handCount = 5;
  if (effect === "loan-repaid-after-deletion") {
    you.trash.push(card("demo-chirinmon-card", "BT1-058", 0));
  } else {
    you.battleArea.push(permanent("demo-chirinmon", "BT1-058", 0, 7000));
  }
  state.players.push(you, opponent);

  if (effect !== "loan-repaid-after-deletion") return { state };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-058",
        effectKey: "BT1-058/memory-loan",
        description: "Chirinmon's delayed payment still lost 3 memory after it left the battle area.",
        timing: "OnEndTurn",
      },
    ],
  };
}

function petermonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "tinkermon-played" ? 0 : 5;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-petermon", "BT1-056", 0, 5000));
  if (effect === "tinkermon-played") {
    you.battleArea.push(permanent("demo-petermon-tinkermon", "BT1-047", 0, 3000));
  } else {
    you.trash.push(card("demo-petermon-tinkermon-card", "BT1-047", 0));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "tinkermon-played") return { state };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-056",
        effectKey: "BT1-056/play-tinkermon",
        description: "Petermon played 1 Tinkermon from the trash without paying its memory cost.",
        timing: "OnPlay",
      },
    ],
  };
}

function angemonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "dp-reduced" ? 0 : 5;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-angemon", "BT1-055", 0, 3000));
  opponent.battleArea.push(permanent("demo-angemon-target", "BT1-070", 1, effect === "dp-reduced" ? 3000 : 6000));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "dp-reduced") return { state };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-055",
        effectKey: "BT1-055/dp-minus",
        description: "Angemon gave one opposing Digimon -3000 DP for the turn.",
        timing: "OnPlay",
      },
    ],
  };
}

function liamonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "reduced-after-memory-drop" ? 1 : 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const liamon = permanent("demo-liamon", "BT1-054", 0, 4000);
  const target = permanent("demo-liamon-target", "BT1-016", 1, effect === "reduced-after-memory-drop" ? 3000 : 5000);
  if (effect === "reduced-after-memory-drop") liamon.isSuspended = true;
  you.battleArea.push(liamon);
  opponent.battleArea.push(target);
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "reduced-after-memory-drop") return { state };
  return {
    state,
    events: [
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "BT1-054",
        effectKey: "BT1-054/dp-minus",
        description: "Liamon's -2000 DP remains active after memory dropped below 3.",
        timing: "WhenAttacking",
      },
    ],
  };
}

export function CardEffectsDemo({ cardId }: { cardId: string }) {
  const params = new URLSearchParams(window.location.search);
  const effect = params.get("effect");
  const step = params.get("step");
  const fixture = useMemo<CardEffectsFixture | undefined>(() => {
    if (cardId === "BT2-086") return rinaShinomiyaBt2Demo(effect);
    if (cardId === "BT2-085") return joeKidoBt2Demo(effect);
    if (cardId === "BT2-084") return soraTakenouchiBt2Demo(effect);
    if (cardId === "BT2-083") return millenniummonBt2Demo(effect);
    if (cardId === "BT2-082") return diaboromonBt2Demo(effect);
    if (cardId === "BT2-081") return metalGarurumonBt2Demo(effect);
    if (cardId === "BT2-080") return piedmonBt2Demo(effect);
    if (cardId === "BT2-079") return venomMyotismonBt2Demo(effect);
    if (cardId === "BT2-078") return wereGarurumonBt2Demo(effect);
    if (cardId === "BT2-077") return kimeramonBt2Demo(effect);
    if (cardId === "BT2-076") return pumpkinmonBt2Demo(effect);
    if (cardId === "BT2-075") return myotismonBt2Demo(effect);
    if (cardId === "BT2-074") return devimonBt2Demo(effect);
    if (cardId === "BT2-073") return garurumonPurpleBt2Demo(effect);
    if (cardId === "BT2-072") return vilemonBt2Demo(effect);
    if (cardId === "BT2-071") return wizardmonBt2Demo(effect);
    if (cardId === "BT2-070") return tapirmonBt2Demo(effect);
    if (cardId === "BT2-069") return gabumonPurpleBt2Demo(effect);
    if (cardId === "BT2-068") return impmonBt2Demo(effect);
    if (cardId === "BT2-067") return demiDevimonBt2Demo(effect);
    if (cardId === "BT2-066") return machinedramonBt2Demo(effect);
    if (cardId === "BT2-065") return warGreymonBt2Demo(effect);
    if (cardId === "BT2-064") return hiAndromonBt2Demo(effect);
    if (cardId === "BT2-063") return metalGreymonBt2Demo(effect);
    if (cardId === "BT2-062") return infermonBt2Demo(effect);
    if (cardId === "BT2-061") return andromonBt2Demo(effect);
    if (cardId === "BT2-060") return megadramonBt2Demo(effect);
    if (cardId === "BT2-059") return kurisarimonBt2Demo(effect);
    if (cardId === "BT2-058") return guardromonBt2Demo(effect);
    if (cardId === "BT2-057") return greymonBlackBt2Demo(effect);
    if (cardId === "BT2-056") return numemonBt2Demo(effect);
    if (cardId === "BT2-055") return toyAgumonBt2Demo(effect);
    if (cardId === "BT2-054") return gotsumonBt2Demo(effect);
    if (cardId === "BT2-053") return keramonBt2Demo(effect);
    if (cardId === "BT2-052") return hagurumonBt2Demo(effect);
    if (cardId === "BT2-051") return rustTyrannomonBt2Demo(effect);
    if (cardId === "BT2-050") return argomonMegaBt2Demo(effect);
    if (cardId === "BT2-049") return puppetmonBt2Demo(effect);
    if (cardId === "BT2-048") return cherrymonBt2Demo(effect);
    if (cardId === "BT2-047") return argomonUltimateBt2Demo(effect);
    if (cardId === "BT2-046") return metalTyrannomonBt2Demo(effect);
    if (cardId === "BT2-045") return argomonChampionBt2Demo(effect);
    if (cardId === "BT2-044") return tyrannomonBt2Demo(effect);
    if (cardId === "BT2-043") return agumonGreenBt2Demo(effect);
    if (cardId === "BT2-042") return vanillaPlayDemo(cardId, 3000, 2, effect);
    if (cardId === "BT2-041") return shineGreymonBt2Demo(effect);
    if (cardId === "BT2-040") return ophanimonBt2Demo(effect);
    if (cardId === "BT2-039") return magnadramonBt2Demo(effect);
    if (cardId === "BT2-038") return rizeGreymonBt2Demo(effect);
    if (cardId === "BT2-037") return vanillaPlayDemo(cardId, 10000, 7, effect);
    if (cardId === "BT2-036") return gatomonBt2Demo(effect);
    if (cardId === "BT2-035") return geoGreymonBt2Demo(effect);
    if (cardId === "BT2-034") return salamonBt2Demo(effect);
    if (cardId === "BT2-033") return agumonBt2Demo(effect);
    if (cardId === "BT2-032") return ulforceVeedramonBt2Demo(effect);
    if (cardId === "BT2-031") return vikemonBt2Demo(effect);
    if (cardId === "BT2-030") return metalSeadramonBt2Demo(effect);
    if (cardId === "BT2-029") return megaSeadramonBt2Demo(effect);
    if (cardId === "BT2-028") return aeroVeedramonBt2Demo(effect);
    if (cardId === "BT2-027") return vanillaPlayDemo(cardId, 9000, 6, effect);
    if (cardId === "BT2-026") return veedramonJammingBt2Demo(effect);
    if (cardId === "BT2-025") return ikkakumonBt2Demo(effect);
    if (cardId === "BT2-024") return vanillaPlayDemo(cardId, 4000, 3, effect);
    if (cardId === "BT2-023") return gomamonBt2Demo(effect);
    if (cardId === "BT2-022") return vanillaPlayDemo(cardId, 5000, 3, effect);
    if (cardId === "BT2-021") return veemonBt2Demo(effect);
    if (cardId === "BT2-020") return gallantmonBt2Demo(effect);
    if (cardId === "BT2-019") return phoenixmonBt2Demo(effect);
    if (cardId === "BT2-018") return volcanicdramonBt2Demo(effect);
    if (cardId === "BT2-017") return warGrowlmonBt2Demo(effect);
    if (cardId === "BT2-016") return vanillaPlayDemo(cardId, 8000, 7, effect);
    if (cardId === "BT2-015") return garudamonBt2Demo(effect);
    if (cardId === "BT2-014") return vanillaPlayDemo(cardId, 6000, 5, effect);
    if (cardId === "BT2-013") return growlmonBt2Demo(effect);
    if (cardId === "BT2-012") return birdramonBt2Demo(effect);
    if (cardId === "BT2-011") return vanillaPlayDemo(cardId, 5000, 4, effect);
    if (cardId === "BT2-010") return biyomonBt2Demo(effect);
    if (cardId === "BT2-009") return guilmonBt2Demo(effect);
    if (cardId === "BT2-008") return yaamonBt2Demo(effect);
    if (cardId === "BT2-007") return pagumonBt2Demo(effect);
    if (cardId === "BT2-006") return tsumemonBt2Demo(effect);
    if (cardId === "BT2-005") return kapurimonBt2Demo(effect);
    if (cardId === "BT2-004") return argomonEggBt2Demo(effect);
    if (cardId === "BT2-003") return nyaromonBt2Demo(effect);
    if (cardId === "BT2-002") return demiVeemonBt2Demo(effect);
    if (cardId === "BT2-001") return gigimonBt2Demo(effect);
    if (cardId === "BT1-115") return veedramonBt1Demo(effect);
    if (cardId === "BT1-114") return metalGreymonBt1Demo(effect);
    if (cardId === "BT1-113") return forbiddenTemptationDemo(effect);
    if (cardId === "BT1-112") return dimensionScissorDemo(effect);
    if (cardId === "BT1-111") return gigaBlasterDemo(effect);
    if (cardId === "BT1-110") return flowerCannonDemo(effect);
    if (cardId === "BT1-109") return smashedPotatoesDemo(effect);
    if (cardId === "BT1-108") return hornBusterDemo(effect);
    if (cardId === "BT1-107") return holyWaveDemo(effect);
    if (cardId === "BT1-106") return polyphonyDemo(effect);
    if (cardId === "BT1-105") return blastFireDemo(effect);
    if (cardId === "BT1-104") return goldenRipperDemo(effect);
    if (cardId === "BT1-103") return testamentDemo(effect);
    if (cardId === "BT1-102") return bladeOfTheTrueDemo(effect);
    if (cardId === "BT1-101") return howlingCrusherDemo(effect);
    if (cardId === "BT1-100") return graceCrossFreezerDemo(effect);
    if (cardId === "BT1-099") return heartsAttackDemo(effect);
    if (cardId === "BT1-098") return vNovaBlastDemo(effect);
    if (cardId === "BT1-097") return boringStormDemo(effect);
    if (cardId === "BT1-096") return madDogFireDemo(effect);
    if (cardId === "BT1-095") return braveShieldDemo(effect);
    if (cardId === "BT1-094") return oblivionBirdDemo(effect);
    if (cardId === "BT1-093") return greatTornadoDemo(effect);
    if (cardId === "BT1-092") return nuclearLaserDemo(effect);
    if (cardId === "BT1-091") return scrapClawDemo(effect);
    if (cardId === "BT1-090") return gravityCrushDemo(effect);
    if (cardId === "BT1-089") return mimiTachikawaDemo(effect);
    if (cardId === "BT1-088") return izzyIzumiDemo(effect);
    if (cardId === "BT1-087") return tkTakaishiDemo(effect);
    if (cardId === "BT1-086") return mattIshidaDemo(effect, step);
    if (cardId === "BT1-085") return taiKamiyaDemo(effect);
    if (cardId === "BT1-084") return omnimonDemo(effect, step);
    if (cardId === "BT1-083") return granKuwagamonDemo(effect);
    if (cardId === "BT1-082") return rosemonDemo(effect);
    if (cardId === "BT1-081") return herculesKabuterimonDemo(effect);
    if (cardId === "BT1-080") return vanillaPlayDemo(cardId, 12000, 10, effect);
    if (cardId === "BT1-079") return lillymonDemo(effect);
    if (cardId === "BT1-078") return jagamonDemo(step);
    if (cardId === "BT1-077") return okuwamonDemo(effect);
    if (cardId === "BT1-076") return megaKabuterimonDemo(effect);
    if (cardId === "BT1-075") return digitamamonDemo(effect);
    if (cardId === "BT1-074") return togemonDemo(step);
    if (cardId === "BT1-073") return kabuterimonDemo(effect);
    if (cardId === "BT1-072") return woodmonDemo(effect);
    if (cardId === "BT1-071") return vanillaPlayDemo(cardId, 6000, 4, effect);
    if (cardId === "BT1-070") return kuwagamonDemo(effect);
    if (cardId === "BT1-069") return ogremonDemo(effect);
    if (cardId === "BT1-068") return kokuwamonDemo(effect);
    if (cardId === "BT1-067") return palmonDemo(effect);
    if (cardId === "BT1-066") return tentomonDemo(effect);
    if (cardId === "BT1-065") return vanillaPlayDemo(cardId, 4000, 2, effect);
    if (cardId === "BT1-064") return vanillaPlayDemo(cardId, 3000, 2, effect);
    if (cardId === "BT1-063") return seraphimonDemo(effect);
    if (cardId === "BT1-062") return slashAngemonDemo(effect);
    if (cardId === "BT1-061") return mistymonDemo(effect);
    if (cardId === "BT1-060") return magnaAngemonDemo(effect);
    if (cardId === "BT1-059") return vanillaPlayDemo(cardId, 9000, 6, effect);
    if (cardId === "BT1-058") return chirinmonDemo(effect);
    if (cardId === "BT1-057") return vanillaPlayDemo(cardId, 6000, 5, effect);
    if (cardId === "BT1-056") return petermonDemo(effect);
    if (cardId === "BT1-055") return angemonDemo(effect);
    if (cardId === "BT1-054") return liamonDemo(effect);
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
