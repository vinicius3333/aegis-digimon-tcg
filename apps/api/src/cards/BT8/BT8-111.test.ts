import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT8-111.js";
import "./BT8-111.js";

describe("BT8-111 Creepymon", () => {
  it("keeps the opponent-count mill, threshold, and per-ten attack scaling in IR", () => {
    expect(compiled.effects).toMatchObject([
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "TrashTopDeck",
            amount: 2,
            trackCount: "creepymonMilled",
            scaling: { per: 1, unit: "cards", filter: { controller: "opponent", kind: ["Digimon"] } },
          },
          {
            kind: "PlayWithoutCost",
            from: ["trash"],
            payCost: false,
            optional: true,
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                colors: ["Purple"],
                levelComparison: { op: "lte", value: 5 },
              },
              count: 1,
            },
            condition: { kind: "namedCountAtLeast", countSource: "creepymonMilled", count: 4 },
          },
        ],
      },
      {
        trigger: "WhenAttacking",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "TrashTopDeck",
            controller: "opponent",
            amount: 3,
            scaling: { per: 10, unit: "cards", filter: { zone: "trash", controller: "mine" } },
          },
          {
            kind: "ModifyDP",
            amount: 3000,
            duration: "forTheTurn",
            scaling: { per: 10, unit: "cards", filter: { zone: "trash", controller: "mine" } },
          },
        ],
      },
    ]);
  });

  it("mills 2 per opposing Digimon and may play a purple level-5-or-lower Digimon after milling at least 4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-012", as: "base" }],
          hand: [{ card: "BT8-111", as: "evolving" }],
          deck: ["BT1-009", { card: "BT8-080", as: "played" }, "BT1-010", "BT1-011", "BT1-012"],
        },
        1: { battleArea: ["BT1-015", "BT1-016"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT8-111"));
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("played").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(3);
  });
});
