import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-010.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-010", () => {
  it("has Training and once per turn may place a card from hand face-down underneath to delete an opposing Digimon up to 4000 DP when digivolving or attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "Delete", optional: true, target: { filter: { dp: { op: "lte", value: 4000 } } }, cost: { kind: "place", destination: "digivolutionStack", faceDown: true } });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Delete", optional: true }] });
  });
  it("inherits Raid", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Raid", raw: "＜Raid＞" }));

  it("places a hand card face-down underneath and deletes one opposing Digimon up to 4000 DP when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-010", as: "source" }], hand: ["BT1-009"] },
      1: {
        battleArea: [
          { card: "BT1-010", as: "valid", dp: 4000 },
          { card: "BT1-011", as: "invalid", dp: 4001 },
        ],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));

    expect(s.perm("source").stack).toHaveLength(1);
    expect(s.perm("source").stack[0]).toMatchObject({ cardId: "BT1-009", faceUp: false });
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-010")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-011")).toBe(true);
  });

  it("places a hand card face-down underneath and deletes an opposing Digimon when attacking", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-010", as: "source" }], hand: ["BT1-009", "BT1-012"] },
      1: {
        battleArea: [
          { card: "BT1-011", as: "attackTarget", dp: 3000, suspended: true },
        ],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.turnSeat = 0;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("source").permanentId, target: { kind: "permanent", permanentId: s.perm("attackTarget").permanentId } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("source").stack).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
