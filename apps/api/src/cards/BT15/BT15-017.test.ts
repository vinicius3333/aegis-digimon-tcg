import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-017.js";

describe("BT15-017", () => {
  it("deletes the lowest DP opposing Digimon or trashes security based on security count", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "Delete", condition: { kind: "zoneCount", op: "lte", value: 3 } },
        { kind: "SecurityManipulation", op: "trashTop", condition: { kind: "zoneCount", op: "gte", value: 4 } },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "Delete" }, { kind: "SecurityManipulation" }],
    });
  });
  it("plays a red Digimon at 5000 DP or less or any red Tamer when digivolving", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          target: {
            filter: {
              or: [
                { kind: ["Digimon"], colors: ["Red"], dp: { op: "lte", value: 5000 } },
                { kind: ["Tamer"], colors: ["Red"] },
              ],
            },
          },
        },
      ],
    }));

  it("deletes exactly one lowest-DP opposing Digimon when 3 security remain", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT15-017", as: "phoenixmon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest", dp: 3000 },
            { card: "BT1-009", as: "higher", dp: 4000 },
          ],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 11;
    const lowestId = s.perm("lowest").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("phoenixmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((card) => card.permanentId === lowestId));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("higher").permanentId).toBeDefined();
    expect(s.state.players[1]!.security).toHaveLength(3);
  });

  it("trashes only the top opposing security on deletion when 4 security remain", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-017", as: "phoenixmon" }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }],
          security: [
            { card: "BT1-001", as: "top" },
            "BT1-001",
            "BT1-001",
            { card: "BT1-001", as: "bottom" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const topId = s.inst("top").instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("phoenixmon").permanentId]);
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === topId));

    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(topId);
    expect(s.perm("target").permanentId).toBeDefined();
  });

  it("normally digivolves and plays an eligible red Digimon for no additional memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-014", as: "base" }],
          hand: [
            { card: "BT15-017", as: "phoenixmon" },
            { card: "BT15-009", as: "freeDigimon" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("phoenixmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([
      "BT15-017",
      "BT15-009",
    ]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-001"]);
  });
});
