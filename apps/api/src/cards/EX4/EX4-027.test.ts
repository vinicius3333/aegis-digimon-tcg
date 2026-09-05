import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX4-027.js";
import "../BT8/BT8-038.js";

describe("EX4-027 GoldVeedramon", () => {
  it("has Armor Purge", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords?.[0]).toMatchObject({
      keyword: "Armor Purge",
    });
  });

  it("reduces one opposing Digimon then restricts one at 6000 DP or less", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions;
    expect(actions?.[0]).toMatchObject({ kind: "ModifyDP", amount: -2000 });
    expect(actions?.[1]).toMatchObject({
      kind: "Restrict",
      restriction: "attackOrBlock",
      duration: "untilOpponentTurnEnd",
      target: { filter: { dp: { op: "lte", value: 6000 } } },
    });
  });
  it("gates the restriction on a blue/yellow Tamer or Armor Form trash card", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[1]).toMatchObject({
      condition: {
        kind: "orConditions",
        conditions: [
          { kind: "youHave", filter: { colors: ["Blue", "Yellow"] } },
          { kind: "youHave", filter: { nameOrTrait: [{ match: "trait", tokens: ["Armor Form"] }] } },
        ],
      },
    });
  });

  it("requires the exact Veemon name for its alternate evolution", () => {
    expect(compiled.digivolutionRequirement).toMatchObject([{ namesExact: ["Veemon"], cost: 2 }]);
  });

  it("applies the DP loss at the 6000-DP restriction boundary after a real evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST8-04", as: "veemon" },
            { card: "ST21-12", as: "blueTamer" },
          ],
          hand: [{ card: "EX4-027", as: "goldVeedramon" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-019", as: "boundary", dp: 6000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("veemon").permanentId,
        instanceId: s.inst("goldVeedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("boundary").currentDP === 4000);

    expect(s.perm("boundary").currentDP).toBe(4000);
    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).isRestricted(s.perm("boundary"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("boundary"), "block")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("goldVeedramon"), "Armor Purge")).toBe(true);
  });

  it("qualifies an 8000-DP target only after the public -2000 reduction reaches 6000", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST8-04", as: "veemon" },
            { card: "ST21-12", as: "blueTamer" },
          ],
          hand: [{ card: "EX4-027", as: "goldVeedramon" }],
          security: ["BT1-001", "BT1-002"],
        },
        1: { battleArea: [{ card: "BT1-019", as: "q3470", dp: 8000 }], security: ["BT1-001", "BT1-002"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("veemon").permanentId,
        instanceId: s.inst("goldVeedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("q3470").currentDP === 6000);
    expect(s.perm("q3470").currentDP).toBe(6000);
    expect(observe(s.engine).isRestricted(s.perm("q3470"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("q3470"), "block")).toBe(true);
  });

  it("does not grant the attack restriction without either qualifying gate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST8-04", as: "veemon" }],
          hand: [{ card: "EX4-027", as: "goldVeedramon" }],
        },
        1: { battleArea: [{ card: "BT1-019", as: "target", dp: 6000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("veemon").permanentId,
        instanceId: s.inst("goldVeedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000);
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(false);
    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("accepts the Armor Form card in trash as the alternate restriction gate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST8-04", as: "veemon" }],
          hand: [{ card: "EX4-027", as: "goldVeedramon" }],
          trash: [{ card: "BT8-038", as: "armor" }],
        },
        1: { battleArea: [{ card: "BT1-019", as: "target", dp: 6000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("veemon").permanentId,
        instanceId: s.inst("goldVeedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000);
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);
  });

  it("uses Armor Purge to preserve the evolved Digimon by trashing its top card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-027", as: "goldVeedramon", under: ["BT1-009"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("goldVeedramon").permanentId], "byEffect")).toBe(0);
    expect(s.perm("goldVeedramon").topCard.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("EX4-027");
  });
});
