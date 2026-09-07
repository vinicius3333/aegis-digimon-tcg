import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-059.js";
import "./index.js";

describe("BT20-059 Gankoomon (X Antibody)", () => {
  it("de-digivolves one opposing Digimon and conditionally protects all own Digimon", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        { kind: "DeDigivolve", amount: 2, target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
        {
          kind: "GrantStatic",
          grant: "immuneToOpponentDigimonEffects",
          duration: "untilOpponentTurnEnd",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: "all" },
          condition: { kind: "selfDigivolutionStackMatchesFilter" },
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
          condition: { kind: "selfTopHasText", filter: { nameOrTrait: [{ tokens: ["Jesmon GX"], match: "name" }] } },
        },
        { kind: "GainKeyword", keyword: { keyword: "Blocker" }, condition: { kind: "selfTopHasText" } },
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
              { card: "BT20-047", as: "ally" },
            ],
            hand: [{ card: "BT20-059", as: "gankoomonX" }],
          },
          1: {
            battleArea: [{ card: "BT20-053", under: ["BT13-005", "BT20-048", "BT20-051"], as: "target" }],
            hand: [{ card: "BT20-033", as: "loader" }],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 5;
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
      for (const alias of ["base", "ally"]) {
        expect(observe(s.engine).isRestrictedByEffect(s.perm(alias), "beAffected", "Digimon")).toBe(protects);
      }
      s.state.turnSeat = 1;
      s.state.memory = 10;
      await s.ready();
      const beforeDP = s.perm("base").currentDP;
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("loader").instanceId })).toEqual({
        ok: true,
      });
      await settle();
      expect(s.perm("base").currentDP).toBe(beforeDP - (protects ? 0 : 3000));
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
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("nonmatch"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("nonmatch"), "Blocker")).toBe(false);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
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
  });

  it("inherits the all-Digimon keyword grant only under Jesmon GX", async () => {
    for (const [host, expected] of [
      ["BT10-112", true],
      ["BT20-060", false],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [
            { card: host, under: ["BT20-059"], as: "host" },
            { card: "BT20-048", as: "nonmatch" },
          ],
        },
      });
      s.state.turnSeat = 1;
      await s.ready();
      expect(observe(s.engine).hasKeyword(s.perm("nonmatch"), "Reboot")).toBe(expected);
      expect(observe(s.engine).hasKeyword(s.perm("nonmatch"), "Blocker")).toBe(expected);
    }
  });

  it("expires the opponent-turn immunity and keyword grants at the real opponent turn end", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-057", as: "base" }],
        hand: [{ card: "BT20-059", as: "gankoomonX" }],
        deck: ["BT1-010", "BT1-010", "BT1-010"],
      },
      1: { deck: ["BT1-010", "BT1-010", "BT1-010"] },
    });
    s.state.memory = 10;
    await s.ready();
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
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Reboot"));
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("base"), "beAffected", "Digimon")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });
});
