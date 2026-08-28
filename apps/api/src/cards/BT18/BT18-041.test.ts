import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-041.js";

describe("BT18-041 MetalEtemon", () => {
  it("preserves the four DNA combinations documented by Q2965 and accepts a natural blue-green pair", async () => {
    expect(compiled.dnaDigivolveRequirement).toEqual([
      { cost: 0, materials: [{ color: "Blue", level: 5 }, { color: "Green", level: 5 }] },
      { cost: 0, materials: [{ color: "Blue", level: 5 }, { color: "Black", level: 5 }] },
      { cost: 0, materials: [{ color: "Yellow", level: 5 }, { color: "Green", level: 5 }] },
      { cost: 0, materials: [{ color: "Yellow", level: 5 }, { color: "Black", level: 5 }] },
    ]);
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-040", as: "blueLevel5" },
            { card: "BT1-078", as: "greenLevel5" },
          ],
          hand: [{ card: "BT18-041", as: "metal" }],
        },
        1: { battleArea: [{ card: "BT1-060", as: "target", under: ["BT1-030"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("blueLevel5").permanentId, s.perm("greenLevel5").permanentId],
        instanceId: s.inst("metal").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.players[0]!.battleArea[0]!.topCard?.cardId).toBe("BT18-041");
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("reduces an opponent's Security Attack by 2 and De-Digivolves exactly 1", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-041", as: "metal" }] },
        1: { battleArea: [{ card: "BT1-060", as: "target", under: ["BT1-030"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 11;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("metal").topCard?.cardId === "BT18-041");

    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-2);
    expect(s.perm("target").topCard!.cardId).toBe("BT1-030");
    expect(s.perm("target").stack).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it.each([
    ["BT1-060", "yellow"],
    ["BT10-064", "black"],
  ])("digivolves over a %s level 5 for 3 and resolves When Digivolving (%s route)", async (base) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [{ card: "BT18-041", as: "metal" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-060", as: "target", under: ["BT1-030"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("metal").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 0);

    expect(s.state.memory).toBe(7);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual([base]);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-2);
    assertNoLoudGap(s);
  });

  it("resolves both clauses when deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-041", as: "metal" }] },
        1: { battleArea: [{ card: "BT1-060", as: "target", under: ["BT1-030"] }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("metal").permanentId])).toBe(1);
    await settle(() => s.perm("target").stack.length === 0);

    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-2);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT18-041")).toBe(true);
    assertNoLoudGap(s);
  });
});
