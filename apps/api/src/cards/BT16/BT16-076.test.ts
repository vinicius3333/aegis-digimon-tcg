import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-076.js";

describe("BT16-076", () => {
  it("may delete an opposing Digimon at 6000 DP or lower by trashing two hand cards", () => {
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({
      kind: "Delete",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "trash", target: { count: 2 } },
      target: { filter: { dp: { op: "lte", value: 6000 } } },
    });
  });

  it("plays a level 4 or lower SoC Digimon from trash if deletion did not happen", () => {
    expect(compiled.effects?.[0]?.actions?.[1]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      condition: { kind: "ifThisEffectDidNotDelete" },
    });
  });

  it("digivolves into Fenriloogamon from trash when another SoC Digimon is deleted", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          actions: [
            {
              kind: "Digivolve",
              from: ["trash"],
              payCost: false,
              optional: true,
              condition: { kind: "selfDigivolutionStackMatchesFilter", filter: { kind: ["Tamer"] } },
            },
          ],
        },
      ],
    });
  });

  it("deletes a 6000-DP opponent after a legal alternate evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-074", as: "base" }],
          hand: [{ card: "BT16-076", as: "soloogar" }, "BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 6000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("soloogar").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("base").topCard?.cardId === "BT16-076" && s.state.players[1]!.battleArea.length === 0,
    );

    expect(s.perm("base").topCard?.cardId).toBe("BT16-076");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("uses the fallback SoC play when no opposing Digimon is at or below 6000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-074", as: "base" }],
          hand: [{ card: "BT16-076", as: "soloogar" }, "BT1-009", "BT1-009"],
          trash: [{ card: "BT14-074", as: "fallback" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 6001 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("soloogar").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard?.cardId === "BT16-076" &&
        s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT14-074").length === 1,
    );

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]?.currentDP).toBe(6001);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT14-074")).toHaveLength(1);
  });
});
