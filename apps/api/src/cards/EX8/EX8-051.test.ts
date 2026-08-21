import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-051.js";

describe("EX8-051", () => {
  it("has Collision, Piercing, and Fragment (3)", () =>
    expect(
      compiled.effects?.filter((entry) => entry.trigger === "Static").flatMap((entry) => entry.keywords ?? []),
    ).toEqual(
      expect.arrayContaining([
        { keyword: "Collision", raw: "＜Collision＞" },
        { keyword: "Piercing", raw: "＜Piercing＞" },
        { keyword: "Fragment", amount: 3, raw: "＜Fragment (3)＞" },
      ]),
    ));
  it("exposes all three keywords on the live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-051", as: "proganomon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("proganomon"), "Collision")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("proganomon"))).toBe(true);
  });
  it("prevents deletion by trashing exactly three digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-051", as: "proganomon", under: ["EX8-050", "EX8-049", "EX8-048"] }] },
        1: { battleArea: [{ card: "BT1-016", as: "attacker", dp: 20000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.players[0]!.battleArea[0]!.isSuspended = true;
    s.state.turnSeat = 1;
    await s.ready();

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("proganomon").permanentId },
    })).toEqual({ ok: true });
    await settle(() => s.perm("proganomon").stack.length === 0);

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("proganomon").permanentId)).toBe(true);
    expect(s.perm("proganomon").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.filter((card) => ["EX8-050", "EX8-049", "EX8-048"].includes(card.cardId))).toHaveLength(3);
  });
});
