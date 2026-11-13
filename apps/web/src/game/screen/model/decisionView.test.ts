// @vitest-environment jsdom
import { expect, it } from "vitest";
import { CardInstance, Permanent, type SequencedServerEvent, type DecisionRequest, type Seat } from "@aegis/shared";
import { createArenaDemoState } from "../../../dev/ArenaDemo";
import { decisionViewFor } from "./decisionView";

it("keeps field-card choices on the board even when a preceding prompt requested a dialog", () => {
  const state = createArenaDemoState();
  const permanents = [...state.players].flatMap((player) => [...player.battleArea]);
  const target = permanents[0]!;
  const request: DecisionRequest = {
    decisionId: "field-target",
    seat: 0,
    kind: "chooseTargets",
    promptText: "Select a Digimon to suspend.",
    options: { candidateInstanceIds: [target.permanentId], min: 0, max: 1 },
  };
  const inputs = {
    decision: request,
    decisionAnimationsPending: false,
    decisionAsDialog: true,
    viewerSeat: 0 as const,
    events: [],
    state,
    instanceIndex: new Map<string, string>(),
    permanents,
    breedingPermanents: [],
    handInstanceIds: [...state.players[0]!.hand].map((card) => card.instanceId),
  };
  expect(decisionViewFor(inputs).answerOnBoard).toBe(true);
  expect(decisionViewFor({ ...inputs, decisionAnimationsPending: true }).viewerDecision).toBeUndefined();
  expect(
    decisionViewFor({
      ...inputs,
      decision: { ...request, options: { candidateInstanceIds: [inputs.handInstanceIds[0]!], min: 0, max: 1 } },
    }).answerOnBoard,
  ).toBe(false);
});

it.each(["optional", "chooseOption", "selectCards"] as const)(
  "keeps the precise field source highlighted while a %s dialog is open",
  (kind) => {
    const state = createArenaDemoState();
    const permanents = [...state.players].flatMap((player) => [...player.battleArea]);
    const source = permanents[0]!;
    const inputs = {
      decision: {
        decisionId: "field-source-dialog",
        seat: 0 as const,
        kind,
        sourceCardId: source.topCard.cardId,
        sourceInstanceId: source.topCard.instanceId,
        promptText: "Resolve this effect?",
        options: { choices: ["2 cards", "1 card"], candidateInstanceIds: [state.players[0]!.hand[0]!.instanceId] },
      },
      decisionAnimationsPending: false,
      decisionAsDialog: true,
      viewerSeat: 0 as const,
      events: [],
      state,
      instanceIndex: new Map<string, string>(),
      permanents,
      breedingPermanents: [],
      handInstanceIds: [...state.players[0]!.hand].map((card) => card.instanceId),
    };
    expect(decisionViewFor(inputs).answerOnBoard).toBe(false);
    expect(decisionViewFor(inputs).decisionHighlightPermanentId).toBe(source.permanentId);
    expect(
      decisionViewFor({ ...inputs, decisionAnimationsPending: true }).decisionHighlightPermanentId,
    ).toBeUndefined();
    expect(decisionViewFor({ ...inputs, decision: undefined }).decisionHighlightPermanentId).toBeUndefined();
    expect(
      decisionViewFor({ ...inputs, permanents: permanents.slice(1) }).decisionHighlightPermanentId,
    ).toBeUndefined();
  },
);

it("keeps an activation source highlighted while answering its movable dialog", () => {
  const state = createArenaDemoState();
  const permanents = [...state.players].flatMap((player) => [...player.battleArea]);
  const source = permanents[0]!;
  const inputs = {
    decision: {
      decisionId: "activation-source",
      seat: 0 as const,
      kind: "optional" as const,
      sourceCardId: source.topCard.cardId,
      sourceInstanceId: source.topCard.instanceId,
      promptText: "Activate this effect?",
    },
    decisionAnimationsPending: false,
    decisionAsDialog: false,
    viewerSeat: 0 as const,
    events: [],
    state,
    instanceIndex: new Map<string, string>(),
    permanents,
    breedingPermanents: [],
    handInstanceIds: [],
  };
  expect(decisionViewFor(inputs).answerOnBoard).toBe(false);
  expect(decisionViewFor(inputs).decisionHighlightPermanentId).toBe(source.permanentId);
});

it("#60 carries synchronized trash provenance into the decision model after reconnect", () => {
  const state = createArenaDemoState();
  for (const instanceId of ["old-shot", "source-shot"]) {
    const card = new CardInstance();
    card.instanceId = instanceId;
    card.cardId = "EX7-071";
    card.trashOriginCardId = instanceId === "source-shot" ? "BT25-083" : "";
    state.players[0]!.trash.push(card);
  }
  const events: SequencedServerEvent[] = [];
  const view = decisionViewFor({
    decision: {
      decisionId: "pick-shot",
      seat: 0,
      kind: "selectCards",
      promptText: "Choose an Option",
      options: { candidateInstanceIds: ["old-shot", "source-shot"], min: 1, max: 1 },
    },
    decisionAnimationsPending: false,
    decisionAsDialog: false,
    viewerSeat: 0,
    events,
    state,
    instanceIndex: new Map([
      ["old-shot", "EX7-071"],
      ["source-shot", "EX7-071"],
    ]),
    permanents: [],
    breedingPermanents: [],
    handInstanceIds: [],
  });
  expect(view.decisionVisible).toEqual([
    { instanceId: "old-shot", cardId: "EX7-071", zone: "trash", trashPosition: 2 },
    { instanceId: "source-shot", cardId: "EX7-071", zone: "trash", trashOriginCardId: "BT25-083", trashPosition: 3 },
  ]);
});

function raisedDigimon(seat: Seat, permanentId: string) {
  const card = new CardInstance();
  card.instanceId = `${permanentId}-top`;
  card.cardId = "BT24-008";
  const permanent = new Permanent();
  permanent.permanentId = permanentId;
  permanent.controllerSeat = seat;
  permanent.topCard = card;
  return permanent;
}

it("answers a link onto a battle or raised Digimon on the board", () => {
  const state = createArenaDemoState();
  const permanents = [...state.players[0]!.battleArea];
  const battle = permanents[0]!;
  const ownRaised = raisedDigimon(0, "own-raised");
  const opponentRaised = raisedDigimon(1, "opponent-raised");
  const linkTargets = (candidateInstanceIds: string[]) =>
    decisionViewFor({
      decision: {
        decisionId: "link-target",
        seat: 0,
        kind: "chooseTargets",
        sourceCardId: "BT24-095",
        promptText: "Choose a Digimon to link to.",
        options: { candidateInstanceIds, min: 0, max: 1 },
      },
      decisionAnimationsPending: false,
      decisionAsDialog: false,
      viewerSeat: 0,
      events: [],
      state,
      instanceIndex: new Map<string, string>(),
      permanents,
      breedingPermanents: [ownRaised, opponentRaised],
      handInstanceIds: [],
    }).answerOnBoard;
  expect(linkTargets([battle.permanentId, ownRaised.permanentId])).toBe(true);
  expect(linkTargets([battle.permanentId, opponentRaised.permanentId])).toBe(false);
});
