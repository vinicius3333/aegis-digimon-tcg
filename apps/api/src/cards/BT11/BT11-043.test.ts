import "./BT11-040.js";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-043.js";

describe("BT11-043 KingSukamon", () => {
  it("maps its alternate evolution, conditional rewrite, scaling, and unrestricted prevention cost", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, names: ["Sukamon"], cost: 3, isAlternate: true }]);
    expect(compiled.effects[3]).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Replacement",
          actions: [{ kind: "Prevent", cost: { target: { filter: { controller: "any", excludeSelf: true } } } }],
        },
      ],
    });
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
    // Published to the client too: the board draws the token from these fields rather than
    // inferring a transformation from a name that no longer matches the art.
    expect(target.originalNameOverride).toBe("Sukamon");
    expect([...target.originalColorsOverride]).toEqual(["White"]);
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
    expect(target.originalNameOverride).toBe("");
    expect([...target.originalColorsOverride]).toEqual([]);
  });

  it("counts every other Sukamon for Security Attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-043", as: "king" },
            { card: "BT11-040", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "BT11-040", as: "opponentCost" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("king").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("king"), "SecurityAttack") === 2);
  });

  it("uses an own Sukamon during a real losing battle to prevent deletion from its inherited effect", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-044", as: "host", dp: 11000, under: ["BT11-043"] },
            { card: "BT11-040", as: "cost" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "target", suspended: true }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const costId = s.inst("cost").instanceId;
    const costPermanentId = s.perm("cost").permanentId;
    const revealedTrashIds = s.state.players[0]!.deck.slice(0, 3).map((c) => c.instanceId);
    const targetId = s.perm("target").permanentId;
    preferred.push(costId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(hostId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([costId, ...revealedTrashIds]);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(costPermanentId);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([targetId]);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.memory).toBe(3);
  });
});
