import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-005.js";

describe("BT18-005 Kozenimon", () => {
  it("draws once when its host wins a battle and does not repeat in the turn", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
        },
      ],
    });

    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-030", dp: 3000, as: "host", under: ["BT18-005"] }],
          deck: [{ card: "BT1-001", as: "drawn" }, { card: "BT1-002" }],
        },
        1: {
          battleArea: [{ card: "BT1-030", dp: 2000, suspended: true, as: "target" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
    const handSize = s.state.players[0]!.hand.length;
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: s.perm("host").permanentId });
    expect(s.state.players[0]!.hand.length).toBe(handSize);
  });

  it("does not draw when its host loses the battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-030", dp: 3000, as: "host", under: ["BT18-005"] }],
        deck: [{ card: "BT1-001", as: "top" }],
      },
      1: { battleArea: [{ card: "BT1-030", dp: 4000, suspended: true, as: "target" }] },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId));
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
