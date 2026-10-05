import { ArraySchema } from "@colyseus/schema";
import { CardInstance, GameState, Permanent, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { presentedSeats } from "./presentedSeats";
import type { HeldHandArrival } from "../../match/types";

function permanent({ rush, duringAttack = false }: { rush: boolean; duringAttack?: boolean }): Permanent {
  const result = new Permanent();
  result.permanentId = "grademon";
  result.topCard = new CardInstance();
  result.topCard.cardId = "BT20-055";
  result.topCard.instanceId = "grademon-card";
  result.summoningSick = !rush;
  result.baseDP = 7000;
  result.currentDP = duringAttack ? 12_000 : 7000;
  result.immuneToOpponentDigimonEffects = duringAttack;
  if (rush) {
    result.keywords = new ArraySchema<string>("Rush");
    result.grantedKeywords = new ArraySchema<string>("Rush");
  }
  return result;
}

function player(seat: 0 | 1, battleArea: Permanent[] = []): PlayerState {
  const result = new PlayerState();
  result.seat = seat;
  result.battleArea.push(...battleArea);
  return result;
}

describe("presentedSeats live projection", () => {
  it.each([0, 1] as const)("holds a count-only private opponent hand for viewer seat%s", (viewerSeat) => {
    const viewer = player(viewerSeat);
    const other = player(viewerSeat === 0 ? 1 : 0);
    other.handCount = 8;
    other.deckCount = 24;
    const opaque = other.toJSON();
    delete opaque.hand;
    const opponent = opaque as unknown as PlayerState;
    const shownState = {
      stateVersion: 4,
      players: viewerSeat === 0 ? [viewer, opponent] : [opponent, viewer],
    } as unknown as GameState;
    for (const presentationPacing of ["current", "sequential"] as const) {
      const result = presentedSeats({
        shownState,
        viewer,
        opponent,
        viewerSeat,
        presentationPacing,
        heldPhaseState: undefined,
        heldBlowState: undefined,
        heldSecurityEffectState: undefined,
        heldDrawState: undefined,
        heldBreedingState: undefined,
        heldDeletions: new Map(),
        heldTrashArrivals: new Map(),
        heldHandArrivals: new Map([
          [1, { seat: opponent.seat as 0 | 1, stateVersion: 4, handCountAfter: 8, deckCountAfter: 24 }],
        ]),
        optimisticPlayedInstanceId: undefined,
      });
      expect(result.shownOpponentHandCount).toBe(7);
      expect(result.shownOpponent.deckCount).toBe(25);
      expect(result.shownOpponent.hand).toBeUndefined();
      expect(result.shownHand).toHaveLength(0);
      expect(opponent.handCount).toBe(8);
    }
  });

  it("hands a Draw 2 over one physical card at a time, without importing future counts", () => {
    function handCard(id: string) {
      const card = new CardInstance();
      card.instanceId = id;
      card.cardId = "ST1-03";
      return card;
    }
    const viewer = player(0);
    viewer.hand.push(handCard("kept"), handCard("first"), handCard("second"));
    viewer.handCount = 3;
    viewer.deckCount = 28;
    const opponent = player(1);
    const after = new GameState();
    after.stateVersion = 2;
    after.players.push(viewer, opponent);
    const before = new GameState();
    before.stateVersion = 1;
    const oldViewer = player(0);
    oldViewer.hand.push(handCard("kept"));
    oldViewer.handCount = 1;
    oldViewer.deckCount = 30;
    before.players.push(oldViewer, opponent);
    const held = new Map<number, HeldHandArrival>([
      [1, { seat: 0, instanceId: "first", stateVersion: 2, handCountAfter: 3, deckCountAfter: 28 }],
      [2, { seat: 0, instanceId: "second", stateVersion: 2, handCountAfter: 3, deckCountAfter: 28 }],
    ]);
    function show(shownState: GameState) {
      return presentedSeats({
        shownState,
        viewer,
        opponent,
        viewerSeat: 0,
        heldPhaseState: undefined,
        heldBlowState: undefined,
        heldSecurityEffectState: undefined,
        heldDrawState: undefined,
        heldBreedingState: undefined,
        heldDeletions: new Map(),
        heldTrashArrivals: new Map(),
        heldHandArrivals: held,
        optimisticPlayedInstanceId: undefined,
        presentationPacing: "sequential",
      });
    }
    expect(show(before).shownViewer).toMatchObject({ handCount: 1, deckCount: 30 });
    expect(show(after).shownViewer).toMatchObject({ handCount: 1, deckCount: 30 });
    expect(show(after).shownHand!.map((card) => card.instanceId)).toEqual(["kept"]);
    held.delete(1);
    expect(show(after).shownViewer).toMatchObject({ handCount: 2, deckCount: 29 });
    expect(show(after).shownHand!.map((card) => card.instanceId)).toEqual(["kept", "first"]);
    held.delete(2);
    expect(show(after).shownViewer).toMatchObject({ handCount: 3, deckCount: 28 });
    expect(viewer.handCount).toBe(3);
    expect(viewer.hand).toHaveLength(3);
  });

  it.each([0, 1] as const)(
    "holds an opaque opponent hand and deck at the same beat for viewer seat %s",
    (viewerSeat) => {
      const viewer = player(viewerSeat);
      const opponent = player(viewerSeat === 0 ? 1 : 0);
      opponent.handCount = 8;
      opponent.deckCount = 24;
      const shownState = new GameState();
      shownState.stateVersion = 4;
      shownState.players.push(viewerSeat === 0 ? viewer : opponent, viewerSeat === 0 ? opponent : viewer);
      const result = presentedSeats({
        shownState,
        viewer,
        opponent,
        viewerSeat,
        heldPhaseState: undefined,
        heldBlowState: undefined,
        heldSecurityEffectState: undefined,
        heldDrawState: undefined,
        heldBreedingState: undefined,
        heldDeletions: new Map(),
        heldTrashArrivals: new Map(),
        heldHandArrivals: new Map([
          [1, { seat: opponent.seat as 0 | 1, stateVersion: 4, handCountAfter: 8, deckCountAfter: 24 }],
        ]),
        optimisticPlayedInstanceId: undefined,
        presentationPacing: "sequential",
      });
      expect(result.shownOpponentHandCount).toBe(7);
      expect(result.shownOpponent.deckCount).toBe(25);
      expect(result.shownOpponent.hand).toHaveLength(0);
      expect(opponent.handCount).toBe(8);
    },
  );

  it("keeps future DP and granted abilities on the narrated snapshot while paced, then shows them at the decision horizon", () => {
    const viewer = player(0, [permanent({ rush: true, duringAttack: true })]);
    viewer.battleArea[0]!.securityAttackModifier = 1;
    const opponent = player(1);
    const before = new GameState();
    before.stateVersion = 1;
    before.players.push(player(0, [permanent({ rush: false })]), player(1));
    const after = new GameState();
    after.stateVersion = 2;
    after.players.push(viewer, opponent);
    const show = (shownState: GameState) =>
      presentedSeats({
        shownState,
        viewer,
        opponent,
        viewerSeat: 0,
        heldPhaseState: undefined,
        heldBlowState: undefined,
        heldSecurityEffectState: undefined,
        heldDrawState: undefined,
        heldBreedingState: undefined,
        heldDeletions: new Map(),
        heldTrashArrivals: new Map(),
        optimisticPlayedInstanceId: undefined,
        presentationPacing: "sequential",
      }).shownViewer.battleArea[0]!;

    const held = show(before);
    expect([...held.keywords]).toEqual([]);
    expect([...held.grantedKeywords]).toEqual([]);
    expect(held).toMatchObject({
      currentDP: 7000,
      summoningSick: true,
      securityAttackModifier: 0,
      immuneToOpponentDigimonEffects: false,
    });
    const released = show(after);
    expect([...released.keywords]).toEqual(["Rush"]);
    expect([...released.grantedKeywords]).toEqual(["Rush"]);
    expect(released).toMatchObject({
      currentDP: 12_000,
      summoningSick: false,
      securityAttackModifier: 1,
      immuneToOpponentDigimonEffects: true,
    });
  });

  it("shows Grademon's live Rush and attack rider while an older arrival snapshot is still presented", () => {
    const viewer = player(0, [permanent({ rush: true, duringAttack: true })]);
    const opponent = player(1);
    const shownState = new GameState();
    shownState.players.push(player(0, [permanent({ rush: false })]), player(1));

    const result = presentedSeats({
      shownState,
      viewer,
      opponent,
      viewerSeat: 0,
      heldPhaseState: undefined,
      heldBlowState: undefined,
      heldSecurityEffectState: undefined,
      heldDrawState: undefined,
      heldBreedingState: undefined,
      heldDeletions: new Map(),
      heldTrashArrivals: new Map(),
      optimisticPlayedInstanceId: undefined,
    });

    const grademon = result.shownViewer.battleArea[0]!;
    expect([...grademon.keywords]).toContain("Rush");
    expect([...grademon.grantedKeywords]).toContain("Rush");
    expect(grademon.summoningSick).toBe(false);
    expect(grademon.currentDP).toBe(12_000);
    expect(grademon.immuneToOpponentDigimonEffects).toBe(true);
  });

  it("keeps a held trash arrival out of the pile until its batch is narrated (Discord 1555578375677018193)", () => {
    const trashed = (instanceId: string, cardId: string) => {
      const card = new CardInstance();
      card.instanceId = instanceId;
      card.cardId = cardId;
      return card;
    };
    const viewer = player(0);
    viewer.trash.push(trashed("older", "BT1-009"), trashed("shot", "EX7-071"));
    const opponent = player(1);
    const shownState = new GameState();
    shownState.players.push(viewer, opponent);

    const result = presentedSeats({
      shownState,
      viewer,
      opponent,
      viewerSeat: 0,
      heldPhaseState: undefined,
      heldBlowState: undefined,
      heldSecurityEffectState: undefined,
      heldDrawState: undefined,
      heldBreedingState: undefined,
      heldDeletions: new Map(),
      heldTrashArrivals: new Map([[1, { seat: 0, instanceIds: ["shot"], stateVersion: 11 }]]),
      optimisticPlayedInstanceId: undefined,
    });

    expect(result.shownViewer.trash.map((card) => card.instanceId)).toEqual(["older"]);
    expect(result.shownOpponent.trash).toHaveLength(0);
  });
});
