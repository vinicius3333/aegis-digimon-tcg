import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-075.js";

describe("BT18-075 Liollmon", () => {
  it("matches the catalog and full IR reduction, scope, frequency, and inherited keyword", () => {
    expect(getCardDefinition("BT18-075")).toMatchObject({
      cardId: "BT18-075",
      nameEn: "Liollmon",
      colors: ["Purple", "Yellow"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Purple", level: 2, memoryCost: 1 },
        { color: "Yellow", level: 2, memoryCost: 1 },
      ],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Holy Beast"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    const replacements = compiled.effects[0]!.actions;
    expect(replacements).toHaveLength(2);
    expect(replacements[0]).toMatchObject({
      event: "wouldDigivolve",
      sourceFilter: { isSelfRef: true, zone: "battleArea" },
      into: { multicolor: true, colors: ["Purple", "Yellow"] },
      actions: [{ mode: "reduceCost", amount: 1 }],
    });
    expect(replacements[1]).toMatchObject({
      event: "wouldDigivolve",
      sourceFilter: { controller: "mine", kind: ["Tamer"] },
      into: { multicolor: true, colors: ["Purple", "Yellow"] },
      actions: [{ mode: "reduceCost", amount: 1 }],
    });
    expect(compiled.effects[0]!.frequency).toBe("OncePerTurn");
    expect(compiled.effects[1]).toMatchObject({ isInherited: true, keywords: [{ keyword: "Retaliation" }] });
  });

  it("naturally reduces this Digimon's legal multicolor purple/yellow evolution by 1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-075", as: "source" }],
        hand: [{ card: "BT18-076", as: "target" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("target").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT18-076");

    expect(s.state.memory).toBe(1);
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toContain("BT18-075");
    assertNoLoudGap(s);
  });

  it("naturally reduces one own Tamer's alternate evolution, but not a second one in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-075", as: "source" },
            { card: "BT7-091", as: "firstKoichi" },
            { card: "BT7-091", as: "secondKoichi" },
          ],
          hand: [
            { card: "BT1-010", as: "discard" },
            { card: "BT18-076", as: "firstTarget" },
            { card: "BT18-077", as: "secondTarget" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("firstKoichi").permanentId,
        instanceId: s.inst("firstTarget").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstKoichi").topCard?.cardId === "BT18-076");
    expect(s.state.memory).toBe(9);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("secondKoichi").permanentId,
        instanceId: s.inst("secondTarget").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("secondKoichi").topCard?.cardId === "BT18-077");
    expect(s.state.memory).toBe(6);
    assertNoLoudGap(s);
  });

  it("does not reduce a matching evolution from the breeding area (Q3019)", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT18-075", as: "source" },
          hand: [{ card: "BT18-076", as: "target" }],
          deck: ["BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("target").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT18-076");

    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });
});
