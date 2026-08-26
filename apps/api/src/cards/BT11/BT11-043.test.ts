import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-043.js";

describe("BT11-043 KingSukamon", () => {
  it("maps its alternate evolution, conditional rewrite, scaling, and unrestricted prevention cost", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, names: ["Sukamon"], cost: 3, isAlternate: true }]);
    expect(compiled.effects[3]).toMatchObject({ isInherited: true, actions: [{ kind: "Replacement", actions: [{ kind: "Prevent", cost: { target: { filter: { controller: "any", excludeSelf: true } } } }] }] });
  });

  it("replaces an opponent Digimon's original name, color and DP", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT11-043", as: "king" }], trash: ["BT11-040", "BT11-040", "BT11-040"] },
        1: { battleArea: [{ card: "ST15-11", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    const target = s.perm("target");

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => target.currentDP === 3000);

    expect(observe(s.engine).effectiveNames(target)).toEqual(["sukamon"]);
    expect(observe(s.engine).effectiveColors(target)).toEqual(["White"]);
    expect(target.currentDP).toBe(3000);
  });

  it("does nothing when neither trash condition is met", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT11-043", as: "king" }] },
        1: { battleArea: [{ card: "ST15-11", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    const target = s.perm("target");

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT11-043"));

    expect(observe(s.engine).effectiveNames(target)).toEqual(["metalgreymon"]);
    expect(observe(s.engine).effectiveColors(target)).toEqual(["Black"]);
    expect(target.currentDP).toBe(8000);
  });

  it("counts every other Sukamon for Security Attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-043", as: "king" }, { card: "BT11-040", as: "ally" }] },
      1: { battleArea: [{ card: "BT11-040", as: "opponentCost" }], security: ["BT1-001", "BT1-001", "BT1-001"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("king").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("king"), "SecurityAttack") === 2);
  });

  it("uses an opponent's Sukamon to prevent deletion from its inherited effect", async () => {
    const preferred: string[] = [];
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-042", as: "host", under: ["BT11-043"] }] }, 1: { battleArea: [{ card: "BT11-040", as: "cost" }] } }, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred });
    preferred.push(s.inst("cost").instanceId);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
