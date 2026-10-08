// @vitest-environment jsdom
import { CardInstance, Permanent, type DecisionRequest } from "@aegis/shared";
import { expect, it } from "vitest";
import { createArenaDemoState } from "../../../dev/ArenaDemo";
import { buildInstanceIndex } from "../../decisionModel";
import { decisionAllowsPick, nextDecisionPicks } from "./decisionPicks";
import { decisionViewFor } from "./decisionView";

it.each([
  ["BT18-078", "BT18-079"],
  ["BT18-076", "BT18-077"],
])("Discord 1557790296379625482: %s host selection precedes its trash destination %s", (source, destination) => {
  const state = createArenaDemoState();
  const host = state.players[0]!.battleArea[0]!;
  host.topCard.cardId = source;
  state.players[0]!.trash.clear();
  for (const cardId of ["BT18-079", "BT18-077", "BT16-082", destination]) {
    const card = new CardInstance();
    card.instanceId = `trash-${state.players[0]!.trash.length}`;
    card.cardId = cardId;
    card.ownerSeat = 0;
    card.faceUp = true;
    state.players[0]!.trash.push(card);
  }
  const trash = [...state.players[0]!.trash];
  const legal = trash.filter((c) => c.cardId === destination).map((c) => c.instanceId);
  const request: DecisionRequest = {
    decisionId: "host-stage",
    seat: 0,
    kind: "chooseTargets",
    sourceCardId: source,
    sourceInstanceId: host.topCard.instanceId,
    promptText: "1 of your Digimon or Tamers may digivolve.",
    options: { candidateInstanceIds: [host.permanentId], min: 0, max: 1 },
  };
  const inputs = {
    decision: request,
    decisionAnimationsPending: false,
    decisionAsDialog: true,
    viewerSeat: 0 as const,
    events: [],
    state,
    instanceIndex: buildInstanceIndex(state, 0),
    permanents: [...state.players].flatMap((p) => [...p.battleArea]),
    breedingPermanents: [],
    handInstanceIds: [...state.players[0]!.hand].map((c) => c.instanceId),
  };
  const board = decisionViewFor(inputs);
  expect(board.answerOnBoard).toBe(true);
  expect(board.decisionHighlightPermanentId).toBe(host.permanentId);
  expect(decisionAllowsPick({ ...board, instanceId: host.permanentId, picks: [] })).toBe(true);
  expect(decisionAllowsPick({ ...board, instanceId: legal[0]!, picks: [] })).toBe(false);

  const dialog = decisionViewFor({
    ...inputs,
    decision: {
      ...request,
      decisionId: "destination-stage",
      kind: "selectCards",
      options: { candidateInstanceIds: legal, visibleInstanceIds: trash.map((c) => c.instanceId), min: 1, max: 1 },
    },
  });
  expect(dialog.answerOnBoard).toBe(false);
  expect(dialog.decisionHighlightPermanentId).toBe(host.permanentId);
  expect(dialog.decisionVisible.map((c) => [c.instanceId, c.cardId, c.zone])).toEqual(
    trash.map((c) => [c.instanceId, c.cardId, "trash"]),
  );
  for (const card of trash) {
    expect(decisionAllowsPick({ ...dialog, instanceId: card.instanceId, picks: [] })).toBe(card.cardId === destination);
  }
  expect(nextDecisionPicks({ picks: [legal[0]!], instanceId: legal[1]!, max: dialog.decisionMax })).toEqual([legal[1]]);
});

it("Discord 1557790296379625482: dec-6 resolves all three observed hosts despite empty visibleCards", () => {
  const state = createArenaDemoState();
  const player = state.players[0]!;
  player.battleArea.clear();
  for (const [permanentId, cardId, instanceId, under] of [
    ["perm-2", "ST14-11", "observed-tamer", []],
    ["perm-1", "BT11-076", "observed-ignitemon", ["BT15-006"]],
    ["perm-5", "BT18-076", "s0-18", ["BT18-094"]],
  ] as const) {
    const host = new Permanent();
    host.permanentId = permanentId;
    host.controllerSeat = 0;
    host.topCard = new CardInstance();
    host.topCard.instanceId = instanceId;
    host.topCard.cardId = cardId;
    host.topCard.ownerSeat = 0;
    host.topCard.faceUp = true;
    for (const sourceCardId of under) {
      const card = new CardInstance();
      card.cardId = sourceCardId;
      card.instanceId = `under-${permanentId}`;
      host.stack.push(card);
    }
    player.battleArea.push(host);
  }
  const ids = ["perm-2", "perm-1", "perm-5"];
  const decision: DecisionRequest = {
    decisionId: "dec-6",
    seat: 0,
    kind: "chooseTargets",
    promptText: "Loweemon",
    sourceCardId: "BT18-076",
    sourceInstanceId: "s0-18",
    sourcePermanentId: "perm-5",
    options: {
      candidateInstanceIds: ids,
      visibleInstanceIds: ids,
      visibleCards: [],
      min: 0,
      max: 1,
      targetFate: "digivolve",
      timing: "WhenAttacking",
      effectKey: "BT18-076/ir-12-0",
      purpose: "acceptedOptional",
    },
  };
  for (const decisionAsDialog of [false, true]) {
    const view = decisionViewFor({
      decision,
      decisionAnimationsPending: false,
      decisionAsDialog,
      viewerSeat: 0,
      events: [],
      state,
      instanceIndex: buildInstanceIndex(state, 0),
      permanents: [...player.battleArea],
      breedingPermanents: [],
      handInstanceIds: [],
    });
    expect(view.answerOnBoard).toBe(true);
    expect(view.decisionHighlightPermanentId).toBe("perm-5");
    expect(view.decisionVisible.map((c) => [c.instanceId, c.cardId, c.zone])).toEqual([
      ["perm-2", "ST14-11", "battle"],
      ["perm-1", "BT11-076", "battle"],
      ["perm-5", "BT18-076", "battle"],
    ]);
    for (const instanceId of ids) {
      expect(decisionAllowsPick({ ...view, instanceId, picks: [] })).toBe(true);
      expect(nextDecisionPicks({ picks: [], instanceId, max: view.decisionMax })).toEqual([instanceId]);
    }
    expect(decisionAllowsPick({ ...view, instanceId: "s0-18", picks: [] })).toBe(false);
  }
});
