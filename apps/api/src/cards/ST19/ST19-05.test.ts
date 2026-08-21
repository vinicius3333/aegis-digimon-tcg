import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST19-05.js";

describe("ST19-05 PawnChessmon", () => {
  it("trashes one Puppet from hand and draws two when deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST19-05", as: "pawn" }],
        hand: [{ card: "ST19-02", as: "cost" }],
        deck: [{ card: "BT1-010", as: "first" }, { card: "BT1-011", as: "second" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const primitives = (s.engine as unknown as { primitives: { deletePermanent(ids: string[]): Promise<number> } }).primitives;
    await primitives.deletePermanent([s.perm("pawn").permanentId]);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("second").instanceId));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
    ]);
  });

  it("catalogues Blocker and the On Deletion cost", () => {
    expect(getCardDefinition("ST19-05")).toMatchObject({
      effectText: expect.stringContaining("＜Blocker＞"),
    });
  });
});
