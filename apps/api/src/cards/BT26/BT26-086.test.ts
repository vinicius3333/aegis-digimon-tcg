import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-086.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT26-086 compiled behavior", () => {
  it("proves Assembly, Link +6, intrinsic keywords, and the link-then-attack windows", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.assemblyRequirement).toEqual([{ reduceCost: 7, materials: [{ traits: ["Seven Code"], count: 7, differentNames: true }] }]);
    expect(compiled.keywords).toEqual(expect.arrayContaining([
      expect.objectContaining({ keyword: "Rush" }),
      expect.objectContaining({ keyword: "Reboot" }),
      expect.objectContaining({ keyword: "Blocker" }),
      expect.objectContaining({ keyword: "Link", amount: 6 }),
    ]));
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions).toEqual([
        expect.objectContaining({ kind: "Link", from: ["digivolutionCards"], payCost: false, optional: true, target: { count: 7, upTo: true } }),
        expect.objectContaining({ kind: "Attack", withoutSuspending: true, optional: true }),
      ]);
    }
  });

  it("keeps the different-name and seven-link conditional seams explicit", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions[0]).toMatchObject({ differentNames: true });
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenLinked", sourceFilter: { isSelfRef: true }, actions: [{ kind: "Delete", optional: true }, { kind: "SecurityManipulation", op: "moveTopToBottom", condition: { kind: "selfLinkCountAtLeast", value: 7 } }] }] });
  });

  it("deletes an opposing Digimon and moves its security top card when seven links are present", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-086", as: "dantemon", linked: [
          { card: "BT26-010" }, { card: "BT26-019" }, { card: "BT26-028" },
          { card: "BT26-037" }, { card: "BT26-051" }, { card: "BT26-063" }, { card: "BT26-084" },
        ] }],
      },
      1: {
        battleArea: [{ card: "BT1-010", as: "victim" }],
        security: ["BT1-001", "BT1-002"],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("dantemon").permanentId,
    });

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-002", "BT1-001"]);
  });
});
