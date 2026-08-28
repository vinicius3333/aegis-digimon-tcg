import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-023.js";

describe("BT14-023", () => {
  it("preserves Ikkakumon's exact catalog identity", () =>
    expect(getCardDefinition("BT14-023")).toMatchObject({
      nameEn: "Ikkakumon",
      colors: ["Blue"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      attributes: ["Vaccine"],
      types: ["Sea Beast"],
    }));
  it("trashes two opposing sources on digivolution", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "TrashDigivolution",
      amount: 2,
      scope: "acrossDigimon",
    }));
  it("restricts an opposing Digimon with no more sources than this one from attacking", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking" && !entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Restrict",
          restriction: "attack",
          duration: "untilOpponentTurnEnd",
          target: { filter: { digivolutionCardsCompareToSource: "lte" } },
        },
      ],
    }));
  it("inherits the same once-per-turn attack restriction", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Restrict", restriction: "attack" }],
    }));

  it("Q2393 trashes 1 source from each of 2 opposing Digimon when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-020", as: "base" }], hand: [{ card: "BT14-023", as: "ikkakumon" }] },
        1: {
          battleArea: [
            { card: "BT14-015", as: "first", under: ["BT14-012"] },
            { card: "BT14-016", as: "second", under: ["BT14-012"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ikkakumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.length >= 2);
    expect(s.perm("first").stack).toHaveLength(0);
    expect(s.perm("second").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.filter((card) => card.cardId === "BT14-012")).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("Q2392 snapshots the as-many-or-fewer comparison for the full duration", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-023", as: "ikkakumon", under: ["BT14-002", "BT14-020"] }],
        },
        1: {
          battleArea: [{ card: "BT14-016", as: "target", under: ["BT14-001", "BT14-007"] }],
          hand: [{ card: "BT14-012", as: "extraSource" }],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ikkakumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "attack"));
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);
    await advance(s.engine).verb.placeUnder(s.perm("target").permanentId, [s.inst("extraSource").instanceId]);
    expect(s.perm("target").stack).toHaveLength(3);
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);
    assertNoLoudGap(s);
  });

  it("the inherited copy applies the same inclusive comparison from a level 5 host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-026", as: "host", under: ["BT14-002", "BT14-020", "BT14-023"] }],
        },
        1: {
          battleArea: [{ card: "BT14-016", as: "target", under: ["BT14-001", "BT14-007", "BT14-012"] }],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "attack"));
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);
    assertNoLoudGap(s);
  });
});
