import { ArraySchema } from "@colyseus/schema";
import { CardInstance, GameState, Permanent, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { presentedSeats } from "./presentedSeats";

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
