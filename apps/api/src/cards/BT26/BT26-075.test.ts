import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-075.js";

describe("BT26-075 compiled behavior", () => {
  it("proves both security/deletion costed plays and the Option lowest-level effect", () => {
    expect(getCardDefinition("BT26-075")).toMatchObject({
      kinds: ["Digimon", "Option"],
      isDualCard: true,
      dualEffect: "Despair Blast",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, traits: ["Glowing Dawn"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Security",
          isSecurity: true,
          actions: [
            expect.objectContaining({
              kind: "PlayWithoutCost",
              payCost: false,
              from: ["trash"],
              optional: true,
              cost: expect.objectContaining({ kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 1 }),
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "OnDeletion",
          actions: [
            expect.objectContaining({
              kind: "PlayWithoutCost",
              target: expect.objectContaining({
                filter: expect.objectContaining({
                  kind: ["Digimon", "Tamer"],
                  playCostLte: 5,
                  nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }],
                }),
              }),
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "Main",
          actions: [
            {
              kind: "Delete",
              target: expect.objectContaining({
                count: 1,
                filter: expect.objectContaining({
                  controller: "opponent",
                  kind: ["Digimon"],
                  superlative: "lowestLevel",
                }),
              }),
            },
          ],
        }),
      ]),
    );
  });

  it("requires a face-down bottom card under a Tamer and preserves the printed waiver", () => {
    const security = compiled.effects.find((effect) => effect.trigger === "Security")!;
    const cost = security.actions[0]!.cost;
    expect(cost).toMatchObject({ kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 1 });
    expect(compiled.effects[0]!.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "youHave" },
    });
    expect(compiled.effects[0]!.actions.slice(1)).toEqual([
      expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Execute" } }),
      expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Ascension" } }),
    ]);
  });

  it("pays the Tamer cost and plays a Glowing Dawn card when On Deletion is ordered before Ascension", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-075", as: "scourge" },
            { card: "BT1-089", as: "tamer", under: [{ card: "BT1-010", as: "faceDown", faceUp: false }] },
          ],
          trash: [{ card: "BT26-052", as: "glowingDawn" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    await s.ready();

    const deleting = advance(s.engine).verb.deletePermanent([s.perm("scourge").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const pending = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;
    const keys = request.options?.triggerKeys ?? [];
    expect(keys).toHaveLength(2);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "orderTriggers", order: [keys[1]!] },
      }),
    ).toEqual({ ok: true });
    await deleting;

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT26-052");
    expect(s.perm("tamer").stack.map(({ cardId }) => cardId)).not.toContain("BT1-010");
  });

  it("drops the pending On Deletion effect when Ascension is ordered first (Q7100)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-075", as: "scourge" },
            { card: "BT1-089", as: "tamer", under: [{ card: "BT1-010", faceUp: false }] },
          ],
          trash: [{ card: "BT26-052", as: "glowingDawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("scourge").permanentId], "byEffect")).toBe(1);

    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toContain("BT26-075");
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).not.toContain("BT26-052");
    expect(s.perm("tamer").stack.map(({ cardId }) => cardId)).toContain("BT1-010");
  });
});
