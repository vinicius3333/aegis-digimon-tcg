import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-027.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-027", () => {
  it("gives an opposing Digimon -4000 DP on digivolving or deletion by trashing a hand card", () => {
    for (const trigger of ["WhenDigivolving", "OnDeletion"]) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "ModifyDP", amount: -4000, duration: "forTheTurn", cost: { kind: "trash", target: { filter: { zone: "hand" } } } }] });
    }
  });
  it("inherits once-per-turn attack prevention by deleting another own Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "Prevent", cost: { kind: "deleteOwn" } }] }] });
  });

  it("trashes the hand card and reduces one opposing Digimon when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-027", as: "source" }], hand: ["BT1-001"] },
      1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.perm("target").currentDP !== 5000);
    expect(s.state.players[0].hand).toHaveLength(0);
    expect(s.state.players[0].trash.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.perm("target").currentDP).toBe(1000);
  });

  it("trashes the hand card and reduces one opposing Digimon on deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-027", as: "source" }], hand: ["BT1-001"] },
      1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle(() => s.perm("target").currentDP !== 5000);
    expect(s.state.players[0].trash.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.perm("target").currentDP).toBe(1000);
  });
});
