import { describe, expect, it } from "vitest";
import type { CardInstance, Permanent, PlayerState } from "@aegis/shared";
import { blowField, deletionField, phaseField, liveProjectionFields } from "./presentedBoard";
import type { HeldDeletion } from "../../match/types";

function permanent(permanentId: string, isSuspended = false): Permanent {
  return {
    permanentId,
    isSuspended,
    topCard: { cardId: "BT1-010", instanceId: `${permanentId}-top` },
  } as unknown as Permanent;
}

function player(battleArea: readonly Permanent[], trash: readonly CardInstance[] = []): PlayerState {
  return { battleArea, trash } as unknown as PlayerState;
}

it("preserves the held top's resolved DP while the live board has advanced to another top", () => {
  const shown = { ...permanent("host"), currentDP: 7000 } as Permanent;
  const live = { ...shown, topCard: { instanceId: "rookie", cardId: "BT1-009" }, currentDP: 3000 } as Permanent;
  expect(liveProjectionFields({ player: player([shown]), live: player([live]) }).battleArea[0]!.currentDP).toBe(7000);
  expect(
    liveProjectionFields({ player: player([shown]), live: player([{ ...shown, currentDP: 8000 } as Permanent]) })
      .battleArea[0]!.currentDP,
  ).toBe(8000);
});

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

describe("phaseField", () => {
  it("holds the rotation of a permanent the unsuspend phase has just unsuspended", () => {
    const presented = phaseField({
      player: player([permanent("a")]),
      held: player([permanent("a", true)]),
    });
    expect(presented.battleArea[0]!.isSuspended).toBe(true);
  });

  it("shows a suspension the snapshot predates, so an end-of-turn attacker rotates at once", () => {
    const shown = player([permanent("a", true)]);
    const presented = phaseField({ player: shown, held: player([permanent("a")]) });
    expect(presented.battleArea[0]!.isSuspended).toBe(true);
    expect(presented.battleArea[0]).toBe(shown.battleArea[0]);
  });

  it("leaves a permanent the snapshot does not know alone", () => {
    const shown = player([permanent("b", true)]);
    const presented = phaseField({ player: shown, held: player([permanent("a", true)]) });
    expect(presented.battleArea[0]).toBe(shown.battleArea[0]);
  });

  it("does nothing with no hold", () => {
    const shown = player([permanent("a", true)]);
    expect(phaseField({ player: shown, held: undefined })).toBe(shown);
  });
});

describe("blowField", () => {
  it("keeps a security-battle loser in its own slot instead of moving it to the end", () => {
    const attacker = permanent("attacker", true);
    const tamer = permanent("tamer", true);
    const held = player([attacker, tamer]);
    const presented = blowField({ player: player([tamer], [{ cardId: "BT21-018" } as CardInstance]), held });
    expect(presented.battleArea.map((p) => p.permanentId)).toEqual(["attacker", "tamer"]);
    expect(presented.trash).toEqual([]);
  });
});
