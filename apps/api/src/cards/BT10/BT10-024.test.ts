import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-024.js";

describe("BT10-024 MetalGreymon", () => {
  it("gains Rush on play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT10-024", as: "source" }] } });
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => {
      const played = s.state.players[0]!.battleArea.find(p => p.topCard.cardId === "BT10-024");
      return played !== undefined && observe(s.engine).hasKeyword(played, "Rush");
    });
    const played = s.state.players[0]!.battleArea.find(p => p.topCard.cardId === "BT10-024");
    expect(played !== undefined && observe(s.engine).hasKeyword(played, "Rush")).toBe(true);
  });

  it("DigiXroses from a Blue Flare board and freezes only Digimon with no more sources than itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-019", as: "greymon" },
            { card: "BT10-021", as: "mailbirdramon" },
          ],
          hand: [{ card: "BT10-024", as: "metalGreymon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "zeroSources" },
            { card: "BT1-011", as: "twoSources", under: ["BT1-001", "BT1-002"] },
            { card: "BT1-012", as: "threeSources", under: ["BT1-003", "BT1-004", "BT1-005"] },
          ],
          hand: [{ card: "BT1-006", as: "newSource" }],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("metalGreymon").instanceId,
      digiXros: {
        materialInstanceIds: [
          s.perm("greymon").topCard.instanceId,
          s.perm("mailbirdramon").topCard.instanceId,
        ],
      },
    })).toEqual({ ok: true });
    await settle(() => ["zeroSources", "twoSources"].every((alias) =>
      observe(s.engine).isRestricted(s.perm(alias), "attack") &&
      observe(s.engine).isRestricted(s.perm(alias), "block"),
    ));
    await settle();

    expect(observe(s.engine).isRestricted(s.perm("zeroSources"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("zeroSources"), "block")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("twoSources"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("twoSources"), "block")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("threeSources"), "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("threeSources"), "block")).toBe(false);

    // Q1950: the selected Digimon stays restricted even after gaining more sources.
    await advance(s.engine).verb.placeUnder(
      s.perm("twoSources").permanentId,
      [s.inst("newSource").instanceId],
    );
    expect(s.perm("twoSources").stack).toHaveLength(3);
    expect(observe(s.engine).isRestricted(s.perm("twoSources"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("twoSources"), "block")).toBe(true);
  });

  it("rejects Greymon (X Antibody) as the exact [Greymon] DigiXros material", () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT9-012", as: "greymonX" },
          { card: "BT10-021", as: "mailbirdramon" },
        ],
        hand: [{ card: "BT10-024", as: "metalGreymon" }],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("metalGreymon").instanceId,
      digiXros: {
        materialInstanceIds: [
          s.perm("greymonX").topCard.instanceId,
          s.perm("mailbirdramon").topCard.instanceId,
        ],
      },
    })).toEqual({ ok: false, reason: "invalid-material" });

    expect(s.state.players[0]!.hand.some((card) =>
      card.instanceId === s.inst("metalGreymon").instanceId,
    )).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("uses Material Save 2 to place its Blue Flare materials under Kiriha when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-088", as: "kiriha" },
            {
              card: "BT10-024",
              as: "metalGreymon",
              under: [
                { card: "BT10-019", as: "greymon" },
                { card: "BT10-021", as: "mailbirdramon" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const metalGreymonId = s.perm("metalGreymon").topCard.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([
      s.perm("metalGreymon").permanentId,
    ])).toBe(1);
    await settle(() => s.perm("kiriha").stack.length === 2);

    expect(s.perm("kiriha").stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("greymon").instanceId,
        s.inst("mailbirdramon").instanceId,
      ]),
    );
    expect(s.state.players[0]!.trash.some((card) =>
      card.instanceId === metalGreymonId,
    )).toBe(true);
  });
});
