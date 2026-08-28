import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-026.js";
import "./index.js";

describe("BT20-026 MegaSeadramon (X Antibody)", () => {
  it("returns level 4 or lower and conditionally restricts suspension on both entry triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Return",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
              count: 1,
            },
            to: "deckBottom",
          },
          {
            kind: "Restrict",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            restriction: "suspend",
            duration: "untilOpponentTurnEnd",
            condition: {
              kind: "selfDigivolutionStackHasTrait",
              filter: {
                nameOrTrait: [
                  { tokens: ["MegaSeadramon"], match: "name" },
                  { tokens: ["X Antibody"], match: "trait" },
                ],
              },
            },
          },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [
        { kind: "Restrict", restriction: "attackTargetChange", duration: "permanent", target: { isSelf: true } },
      ],
    });
  });

  it("bottoms only a level-4-or-lower Digimon and locks another Digimon from effect suspension", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-026", as: "megaX", under: ["BT15-029"] }] },
        1: {
          battleArea: [
            { card: "BT20-023", as: "level4" },
            { card: "BT20-025", as: "level5" },
            { card: "BT20-014", as: "locked" },
          ],
          deck: ["BT20-001"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("level4").permanentId, s.perm("locked").permanentId);
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("megaX"));
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT20-023");
    expect(s.perm("level5")).toBeDefined();
    await advance(s.engine).verb.suspend([s.perm("locked").permanentId], 0);
    expect(s.perm("locked").isSuspended).toBe(false);
  });

  it("as an inherited source prevents a Blocker from changing the host's attack target on your turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-027", as: "host", under: ["BT20-026"] }] },
        1: {
          battleArea: [{ card: "BT20-044", as: "blocker" }],
          security: ["BT20-001", "BT20-001"],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.perm("blocker")).toBeDefined();
  });
});
