import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-022.js";

describe("BT14-022", () => {
  it("preserves Gesomon's catalog identity and ordered When Attacking IR", () => {
    expect(getCardDefinition("BT14-022")).toMatchObject({
      nameEn: "Gesomon",
      colors: ["Blue"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      attributes: ["Virus"],
      types: ["Mollusk"],
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "WhenAttacking",
          actions: [
            { kind: "TrashDigivolution", amount: 1, choose: true },
            {
              kind: "Return",
              to: "hand",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  digivolutionCards: "none",
                  levelComparison: { op: "lte", value: 5 },
                },
                count: 1,
              },
            },
          ],
        },
      ],
    });
  });

  it("lets the controller trash any source, then returns a separate source-less level 5", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-022", as: "gesomon" }], security: ["BT1-001"] },
      1: {
        battleArea: [
          {
            card: "BT14-017",
            as: "sourced",
            under: [
              { card: "BT14-001", as: "bottom" },
              { card: "BT14-007", as: "chosen" },
              { card: "BT14-012", as: "topSource" },
            ],
          },
          { card: "BT14-015", as: "returnable" },
        ],
      },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gesomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some((decision) => decision.req.kind === "selectCards"));
    const sourceChoice = s.decisions.find((decision) => decision.req.kind === "selectCards")!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: sourceChoice.req.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("chosen").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT14-015"));
    expect(s.perm("sourced").stack.map((card) => card.cardId)).toEqual(["BT14-001", "BT14-012"]);
    assertNoLoudGap(s);
  });

  it("re-evaluates after trashing and can return that newly source-less Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-022", as: "gesomon" }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT14-015", as: "target", under: ["BT14-012"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gesomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT14-015"));
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT14-012");
    assertNoLoudGap(s);
  });

  it("does not return a source-less level 6 or a level 5 that still has sources", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-022", as: "gesomon" }], security: ["BT1-001"] },
        1: {
          battleArea: [
            { card: "BT14-017", as: "level6" },
            { card: "BT14-015", as: "level5", under: ["BT14-001", "BT14-007"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gesomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("level5").stack.length === 1);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(
      expect.arrayContaining(["BT14-017", "BT14-015"]),
    );
    expect(s.state.players[1]!.hand).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
