import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-059.js";

describe("BT14-059", () => {
  it("has Retaliation and Save on deletion", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({
      actions: [{ kind: "PlaceUnder", underFilter: { kind: ["Tamer"] } }],
      keywords: expect.arrayContaining([
        { keyword: "Retaliation", raw: "＜Retaliation＞" },
        { keyword: "Save", raw: "＜Save＞" },
      ]),
    }));
  it("inherits Blocker", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    }));

  it("naturally retaliates against the battle winner and saves itself under an own Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-086", as: "tamer" },
            { card: "BT14-059", as: "damemon", dp: 3000, suspended: true },
          ],
        },
        1: { battleArea: [{ card: "BT14-042", as: "attacker", dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("damemon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.some((card) => card.cardId === "BT14-059"));
    expect(s.perm("tamer").stack.some((card) => card.cardId === "BT14-059")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
