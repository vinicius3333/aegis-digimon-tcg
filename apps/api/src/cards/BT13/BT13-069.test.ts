import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-069.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-069 KingSukamon", () => {
  it("plays a level-4 Sukamon on attack and prevents deletion by deleting another Sukamon", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toContainEqual(
      expect.objectContaining({ level: 4, names: ["Sukamon"], cost: 3 }),
    );
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 4 },
              nameOrTrait: [{ match: "name", tokens: ["Sukamon"] }],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Prevent",
              optional: true,
              abortOnDecline: true,
              cost: {
                kind: "deleteOwn",
                target: {
                  filter: {
                    controller: "any",
                    excludeSelf: true,
                    kind: ["Digimon"],
                    nameOrTrait: [{ match: "name", tokens: ["Sukamon"] }],
                  },
                  count: 1,
                },
              },
            },
          ],
        },
      ],
    });
  });

  it("plays a Sukamon from hand when the host attacks", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-069", as: "king" }], hand: ["BT11-040"] }, 1: { security: ["BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("king").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT11-040"), 3000);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT11-040")).toBe(true);
  });

  it("may delete an opponent's other Sukamon to prevent its inherited host's deletion (Q2309)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-040", as: "host", under: ["BT13-069"] }] },
        1: { battleArea: [{ card: "BT11-040", as: "opponent-sukamon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const opponentSukamonId = s.perm("opponent-sukamon").permanentId;
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("host"));
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === opponentSukamonId)).toBe(false);
  });
});
