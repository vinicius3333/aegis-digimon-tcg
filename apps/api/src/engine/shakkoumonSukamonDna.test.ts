import { effectiveStaticNames, getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { assertNoLoudGap, setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

const FILLER = Array.from({ length: 8 }, () => "BT1-010");
const PAIRS = [
  ["Targetmon + BT11 Sukamon", "EX5-046", "BT11-040"],
  ["EX13 Sukamon + Targetmon", "EX13-028", "EX5-046"],
  ["EX13 Sukamon + BT11 Sukamon", "EX13-028", "BT11-040"],
] as const;

describe("Discord 1557575147119054889 — exact printed Shakkoumon materials", () => {
  it.each(PAIRS)("accepts %s in either submitted order without a CS or name requirement", async (_label, a, b) => {
    for (const reverse of [false, true]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: a, as: "yellow", suspended: true, under: ["BT1-045"] },
              { card: b, as: "black", suspended: true, under: ["BT1-046"] },
            ],
            hand: [{ card: "BT23-032", as: "shakkoumon" }],
            deck: FILLER,
          },
        },
        { autoSelectCards: true, autoAcceptOptional: true },
      );
      s.state.memory = 0;
      await s.ready();
      expect(getCardDefinition(a)!.types).not.toContain("CS");
      expect(getCardDefinition(b)!.types).not.toContain("CS");
      expect(getCardDefinition(a)!.level).toBe(4);
      expect(getCardDefinition(b)!.level).toBe(4);
      for (const alias of ["yellow", "black"]) {
        const definition = getCardDefinition(s.perm(alias).topCard.cardId)!;
        expect(observe(s.engine).effectiveNames(s.perm(alias))).toContain(definition.nameEn.toLowerCase());
        expect(effectiveStaticNames(definition)).toContain("Sukamon");
        expect(observe(s.engine).hasEffectiveTrait(s.perm(alias), "CS")).toBe(false);
      }
      expect(observe(s.engine).effectiveColors(s.perm("yellow"))).toContain("Yellow");
      expect(observe(s.engine).effectiveColors(s.perm("black"))).toContain("Black");
      expect(s.inst("shakkoumon").dnaDigivolveRoutes.length).toBeGreaterThan(0);
      const ids = [s.perm("yellow").permanentId, s.perm("black").permanentId];
      const expectedSources = ["yellow", "black"].flatMap((alias) => [
        ...s.perm(alias).stack.map((c) => c.instanceId),
        s.inst(alias).instanceId,
      ]);
      expect(
        s.engine.applyIntent(0, {
          type: "dnaDigivolve",
          instanceId: s.inst("shakkoumon").instanceId,
          materialPermanentIds: reverse ? ids.reverse() : ids,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT23-032") &&
          s.state.pendingDecision === undefined,
      );
      const result = s.perm("shakkoumon");
      expect(s.state.players[0]!.battleArea).toHaveLength(1);
      expect(result.stack.map((c) => c.instanceId).sort()).toEqual(expectedSources.sort());
      expect(result.isSuspended).toBe(false);
      expect(s.state.memory).toBe(0);
      expect(s.state.players[0]!.deck).toHaveLength(7);
      expect(s.state.players[0]!.trash).toHaveLength(0);
      assertNoLoudGap(s);
    }
  });

  it.each([
    ["two yellow-only Sukamon", "EX13-028", "EX13-028", false],
    ["one physical multicolor Sukamon submitted twice", "BT11-040", "EX13-028", true],
    ["yellow level 3 instead of level 4", "BT1-045", "BT11-040", false],
  ] as const)("rejects %s without changing the board or memory", async (_label, a, b, duplicate) => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: a, as: "a" },
          { card: b, as: "b" },
        ],
        hand: [{ card: "BT23-032", as: "shakkoumon" }],
      },
    });
    await s.ready();
    const before = [...s.state.players[0]!.battleArea];
    const memory = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        instanceId: s.inst("shakkoumon").instanceId,
        materialPermanentIds: [s.perm("a").permanentId, s.perm(duplicate ? "a" : "b").permanentId],
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect([...s.state.players[0]!.battleArea]).toEqual(before);
    expect(s.state.players[0]!.hand).toContain(s.inst("shakkoumon"));
    expect(s.state.memory).toBe(memory);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("does not let Sukamon names waive the CS alternate ordinary digivolution cost", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX5-046", as: "targetmon" }], hand: [{ card: "BT23-032", as: "shakkoumon" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("targetmon").permanentId,
        instanceId: s.inst("shakkoumon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    assertNoLoudGap(s);
  });

  it.each(["BT23-027", "BT23-050"])(
    "%s On Play can DNA the two Sukamon without requiring itself as material",
    async (source) => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "EX13-028", as: "yellow" },
              { card: "BT11-040", as: "black" },
            ],
            hand: [
              { card: source, as: "source" },
              { card: "BT23-032", as: "shakkoumon" },
            ],
            deck: FILLER,
          },
        },
        { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
      );
      preferred.push(s.perm("yellow").permanentId, s.perm("black").permanentId);
      s.state.memory = 10;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
        ok: true,
      });
      await settle(
        () =>
          s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT23-032") &&
          s.state.pendingDecision === undefined,
      );
      expect(s.perm("shakkoumon").stack.map((c) => c.cardId)).toEqual(["BT11-040", "EX13-028"]);
      expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId).sort()).toEqual([source, "BT23-032"].sort());
      expect(s.state.memory).toBe(5);
      expect(s.state.players[0]!.trash).toHaveLength(0);
      assertNoLoudGap(s);
    },
  );

  it("cannot use the opponent's printed materials", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX13-028", as: "mine" }], hand: [{ card: "BT23-032", as: "shakkoumon" }] },
      1: { battleArea: [{ card: "BT11-040", as: "theirs" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        instanceId: s.inst("shakkoumon").instanceId,
        materialPermanentIds: [s.perm("mine").permanentId, s.perm("theirs").permanentId],
      }),
    ).toEqual({ ok: false, reason: "no-such-permanent" });
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it.each([Phase.Breeding, Phase.Main])("requires the material owner's Main phase (%s)", async (phase) => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-040", as: "a" },
          { card: "EX13-028", as: "b" },
        ],
        hand: [{ card: "BT23-032", as: "shakkoumon" }],
      },
    });
    await s.ready();
    s.state.phase = phase;
    if (phase === Phase.Main) s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        instanceId: s.inst("shakkoumon").instanceId,
        materialPermanentIds: [s.perm("a").permanentId, s.perm("b").permanentId],
      }),
    ).toEqual({ ok: false, reason: phase === Phase.Breeding ? "wrong-phase" : "not-your-turn" });
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    assertNoLoudGap(s);
  });
});
