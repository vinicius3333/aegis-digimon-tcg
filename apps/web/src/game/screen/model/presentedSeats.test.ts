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
      heldDrawState: undefined,
      heldBreedingState: undefined,
      heldDeletions: new Map(),
      optimisticPlayedInstanceId: undefined,
    });

    const grademon = result.shownViewer.battleArea[0]!;
    expect([...grademon.keywords]).toContain("Rush");
    expect([...grademon.grantedKeywords]).toContain("Rush");
    expect(grademon.summoningSick).toBe(false);
    expect(grademon.currentDP).toBe(12_000);
    expect(grademon.immuneToOpponentDigimonEffects).toBe(true);
  });
});
