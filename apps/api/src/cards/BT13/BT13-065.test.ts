import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-065.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT13-065 PlatinumSukamon", () => {
  it("uses De-Digivolve 1 stopping at level 3 and the inherited deletion replacement", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 1,
          stopAtLevel: 3,
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

  it("loads the compiled PlatinumSukamon implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-065", as: "platinum" }] } });
    await s.ready();
    expect(s.perm("platinum").topCard?.cardId).toBe("BT13-065");
  });

  it("may delete an opponent's other Sukamon to prevent its host's deletion (Q2307)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-040", as: "host", under: ["BT13-065"] }] },
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
