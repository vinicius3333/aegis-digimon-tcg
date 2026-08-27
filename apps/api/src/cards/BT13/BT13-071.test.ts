import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-071.js";

describe("BT13-071 Giromon", () => {
  it("keeps Blocker and inherited opponent-turn security trash", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    });
  });

  it("trashes the opponent's top security when an inherited Digimon becomes suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", under: ["BT13-071"], as: "host" }] },
      1: { security: ["BT1-001"] },
    });
    await s.ready();
    s.state.turnSeat = 1;
    await advance(s.engine).fireForPermanent(EffectTiming.None, s.perm("host"));
    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("host").permanentId });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
  });
});
