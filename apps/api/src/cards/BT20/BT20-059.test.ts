import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-059.js";
import "./index.js";
import "../BT5/BT5-035.js";

describe("BT20-059 Gankoomon (X Antibody)", () => {
  it("publishes the complete catalog identity and printed clauses", () => {
    expect(getCardDefinition("BT20-059")).toMatchObject({
      cardId: "BT20-059",
      nameEn: "Gankoomon (X Antibody)",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13000,
      evoCosts: [
        { color: "Black", level: 5, memoryCost: 5 },
        { color: "Red", level: 5, memoryCost: 5 },
      ],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Holy Warrior", "X Antibody", "Royal Knight"],
    });
    expect(getCardDefinition("BT20-059")!.effectText).toContain("＜De-Digivolve 2＞");
    expect(getCardDefinition("BT20-059")!.effectText).toContain("none of your Digimon are affected");
    expect(getCardDefinition("BT20-059")!.effectText).toContain("[Sistermon]/[Huckmon]");
    expect(getCardDefinition("BT20-059")!.inheritedEffectText).toBe(
      "[Opponent's Turn] While this Digimon is [Jesmon GX] all of your Digimon gain ＜Reboot＞ and ＜Blocker＞.",
    );
  });

  it("de-digivolves one opposing Digimon and conditionally protects all own Digimon", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        { kind: "DeDigivolve", amount: 2, target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
        {
          kind: "GrantStatic",
          grant: "immuneToOpponentDigimonEffects",
          duration: "untilOpponentTurnEnd",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: "all" },
          condition: {
            kind: "selfDigivolutionStackMatchesFilter",
            filter: {
              nameOrTrait: [
                { tokens: ["Gankoomon"], match: "nameExact" },
                { tokens: ["X Antibody"], match: "nameExact" },
              ],
            },
          },
        },
      ],
    });
  });

  it("grants Reboot and Blocker to own Sistermon/Huckmon or Royal Knight Digimon during the opponent's turn", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OpponentsTurn" && !entry.isInherited);
    expect(effect?.actions).toMatchObject([
      {
        kind: "GainKeyword",
        keyword: { keyword: "Reboot" },
        duration: "untilOpponentTurnEnd",
        target: {
          count: "all",
          filter: {
            nameOrTrait: [
              { tokens: ["Sistermon", "Huckmon"], match: "name" },
              { tokens: ["Royal Knight"], match: "trait" },
            ],
          },
        },
      },
      { kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "untilOpponentTurnEnd" },
    ]);
  });

  it("gives all own Digimon Reboot and Blocker when the inherited host is Jesmon GX", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Reboot" },
          condition: {
            kind: "selfTopHasText",
            filter: { nameOrTrait: [{ tokens: ["Jesmon GX"], match: "nameExact" }] },
          },
        },
        {
          kind: "GainKeyword",
          keyword: { keyword: "Blocker" },
          condition: {
            kind: "selfTopHasText",
            filter: { nameOrTrait: [{ tokens: ["Jesmon GX"], match: "nameExact" }] },
          },
        },
      ],
    });
  });

  it("de-digivolves by 2 and protects all allies only with Gankoomon or X Antibody underneath", async () => {
    for (const [base, cost, protects, extraSource] of [
      ["BT20-057", 2, true, undefined],
      ["BT20-053", 5, false, undefined],
      ["BT20-054", 5, false, undefined],
      ["BT20-054", 5, true, "BT9-109"],
      ["BT20-054", 5, true, "EX5-070"],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: base,
                as: "base",
                under: [
                  ...(extraSource ? [extraSource] : []),
                  "BT13-005",
                  "BT20-048",
                  "BT20-051",
                  ...(base === "BT20-057" ? ["BT20-054"] : []),
                ],
              },
              { card: "BT20-057", as: "ally", under: ["BT20-054"] },
            ],
            hand: [{ card: "BT20-059", as: "gankoomonX" }],
            deck: ["BT1-010", "BT1-010", "BT1-010"],
          },
          1: {
            battleArea: [{ card: "BT20-053", under: ["BT13-005", "BT20-048", "BT20-051"], as: "target" }],
            hand: [{ card: "BT5-035", as: "starmons" }],
            deck: ["BT1-010", "BT1-010", "BT1-010"],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 5;
      await s.ready();
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("gankoomonX").instanceId,
          ...(base === "BT20-057" ? { useAlternateCost: true } : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("target").stack.length === 1);
      await settle();
      expect(s.state.memory).toBe(5 - cost);
      expect(s.perm("ally").stack.map((card) => card.cardId)).toEqual(["BT20-054"]);
      for (const alias of ["base", "ally"]) {
        expect(observe(s.engine).isRestrictedByEffect(s.perm(alias), "beAffected", "Digimon")).toBe(protects);
      }
      advance(s.engine).endMainPhaseIfOpen(0);
      await advance(s.engine).waitForMainPhase(1);
      const beforeDP = s.perm("base").currentDP;
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("starmons").instanceId })).toEqual({
        ok: true,
      });
      await settle(
        () =>
          s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT5-035") &&
          s.state.pendingDecision === undefined,
      );
      expect(s.perm("base").currentDP).toBe(beforeDP - (protects ? 0 : 2000));
      advance(s.engine).endMainPhaseIfOpen(1);
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    }
  });

  it("grants Reboot and Blocker only to the resident Sistermon/Huckmon/Royal Knight population", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-059", as: "source" },
          { card: "BT20-084", as: "sistermon" },
          { card: "BT20-014", as: "huckmonName" },
          { card: "BT20-017", as: "royalKnight" },
          { card: "BT20-048", as: "nonmatch" },
        ],
        deck: ["BT1-010", "BT1-010"],
      },
      1: { deck: ["BT1-010", "BT1-010"] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("nonmatch"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("nonmatch"), "Blocker")).toBe(false);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      Object.fromEntries(
        ["source", "sistermon", "huckmonName", "royalKnight"].map((alias) => [
          alias,
          {
            reboot: observe(s.engine).hasKeyword(s.perm(alias), "Reboot"),
            blocker: observe(s.engine).hasKeyword(s.perm(alias), "Blocker"),
          },
        ]),
      ),
    ).toEqual({
      source: { reboot: true, blocker: true },
      sistermon: { reboot: true, blocker: true },
      huckmonName: { reboot: true, blocker: true },
      royalKnight: { reboot: true, blocker: true },
    });
    expect(observe(s.engine).hasKeyword(s.perm("nonmatch"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("nonmatch"), "Blocker")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("inherits the all-Digimon keyword grant only under Jesmon GX", async () => {
    for (const [host, expected] of [
      ["BT10-112", true],
      ["BT20-060", false],
      ["BT10-016", false],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [
            { card: host, under: ["BT20-059"], as: "host" },
            { card: "BT20-048", as: "nonmatch" },
          ],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { deck: ["BT1-010", "BT1-010"] },
      });
      await s.ready();
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      advance(s.engine).endMainPhaseIfOpen(0);
      await advance(s.engine).waitForMainPhase(1);
      expect(observe(s.engine).hasKeyword(s.perm("nonmatch"), "Reboot")).toBe(expected);
      expect(observe(s.engine).hasKeyword(s.perm("nonmatch"), "Blocker")).toBe(expected);
      expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    }
  });

  it("expires the opponent-turn immunity and keyword grants at the real opponent turn end", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-057", as: "base" }],
        hand: [{ card: "BT20-059", as: "gankoomonX" }],
        deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"],
      },
      1: { deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"] },
    });
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gankoomonX").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-059");
    expect(observe(s.engine).isRestrictedByEffect(s.perm("base"), "beAffected", "Digimon")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Reboot"));
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("base"), "beAffected", "Digimon")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
