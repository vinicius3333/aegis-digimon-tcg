import { describe, expect, it } from "vitest";
import type { CardInstance, Permanent, PlayerState } from "@aegis/shared";
import { deletionField } from "./presentedBoard";
import type { HeldDeletion } from "../../match/types";

function permanent(permanentId: string): Permanent {
  return { permanentId, topCard: { cardId: "BT1-010", instanceId: `${permanentId}-top` } } as unknown as Permanent;
}

function player(battleArea: readonly Permanent[], trash: readonly CardInstance[] = []): PlayerState {
  return { battleArea, trash } as unknown as PlayerState;
}

describe("deletionField", () => {
  const trashedCard = { cardId: "BT1-010", instanceId: "b-top" } as CardInstance;
  const held: HeldDeletion = { seat: 0, permanent: permanent("b"), index: 1, trash: [] };

  it("puts a dropped permanent back in its slot and keeps the card out of the trash", () => {
    const shown = player([permanent("a"), permanent("c")], [trashedCard]);
    const presented = deletionField({ player: shown, held: [held] });
    expect(presented.battleArea.map((p) => p.permanentId)).toEqual(["a", "b", "c"]);
    expect(presented.trash).toEqual([]);
  });

  it("leaves the board alone while it still shows the permanent", () => {
    const shown = player([permanent("a"), permanent("b")], []);
    expect(deletionField({ player: shown, held: [held] })).toBe(shown);
  });

  it("clamps a slot the row has since shrunk past", () => {
    const shown = player([], [trashedCard]);
    const presented = deletionField({ player: shown, held: [{ ...held, index: 4 }] });
    expect(presented.battleArea.map((p) => p.permanentId)).toEqual(["b"]);
  });

  it("does nothing with no hold", () => {
    const shown = player([permanent("a")]);
    expect(deletionField({ player: shown, held: [] })).toBe(shown);
  });
});
