import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT19-046.js";
import "../index.js";

const inertSecurity = ["BT1-009", "BT1-013", "BT1-012"];
const inertDeck = ["BT1-009", "BT1-013", "BT1-012", "BT1-014"];

describe("BT19-046 Chamblemon", () => {
  it("matches the catalog printing and has no inherited effect", () => {
    expect(getCardDefinition("BT19-046")).toMatchObject({
      cardId: "BT19-046",
      nameEn: "Chamblemon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 3000,
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Vegetation"],
      evoCosts: [{ color: "Green", level: 3, memoryCost: 2 }],
    });
    expect(getCardDefinition("BT19-046")?.effectText?.replace(/\u00a0/g, " ")).toBe(
      "[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon. Then, 1 of your opponent's [Data] trait Digimon can't be unsuspended until the end of their turn.",
    );
    expect(getCardDefinition("BT19-046")?.inheritedEffectText).toBeUndefined();
  });

  it("compiles the same two ordered actions on both [On Play] and [When Digivolving]", () => {
    for (const [index, trigger] of [
      [0, "OnPlay"],
      [1, "WhenDigivolving"],
    ] as const) {
      expect(compiled.effects?.[index]).toMatchObject({
        trigger,
        actions: [
          { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
          {
            kind: "Restrict",
            restriction: "unsuspend",
            duration: "untilOpponentTurnEnd",
            target: {
              count: 1,
              filter: {
                controller: "opponent",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Data"], match: "trait" }],
              },
            },
          },
        ],
      });
    }
    expect(JSON.stringify(compiled)).not.toContain("suspended");
    expect(compiled.effects).toHaveLength(2);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("on a public play pays 4, suspends 1, and restricts only the chosen [Data] Digimon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-046", as: "chamble" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "chosenData" },
            { card: "BT1-028", as: "otherData" },
            { card: "BT1-009", as: "vaccine" },
            { card: "BT1-045", as: "virus" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("chosenData").topCard!.instanceId);
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chamble").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("chosenData"), "unsuspend"));
    await settle();

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT19-046");
    expect(played?.stack.map((card) => card.cardId)).toEqual([]);
    expect(played?.isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT19-046")).toBe(false);
    expect(s.state.memory).toBe(0);

    expect(s.perm("chosenData").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("chosenData"), "unsuspend")).toBe(true);
    for (const alias of ["otherData", "vaccine", "virus"]) {
      expect(s.perm(alias).isSuspended).toBe(false);
      expect(observe(s.engine).isRestricted(s.perm(alias), "unsuspend")).toBe(false);
    }

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps the restricted Digimon suspended through the opponent's real unsuspend phase", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-046", as: "chamble" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "locked" },
            { card: "BT1-028", as: "control", suspended: true },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("locked").topCard!.instanceId);
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chamble").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("locked"), "unsuspend"));
    expect(s.perm("locked").isSuspended).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("control").isSuspended).toBe(false);
    expect(s.perm("locked").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("locked"), "unsuspend")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestricted(s.perm("locked"), "unsuspend")).toBe(false);
    expect(s.perm("locked").isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("may suspend an already-suspended Digimon, sparing the unsuspended peer (KB Q845)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-046", as: "chamble" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "already", suspended: true },
            { card: "BT1-009", as: "fresh" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("already").topCard!.instanceId);
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 4;
    expect(s.perm("already").isSuspended).toBe(true);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chamble").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("already"), "unsuspend"));
    await settle();

    expect(s.perm("already").isSuspended).toBe(true);
    expect(s.perm("fresh").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("fresh"), "unsuspend")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("resolves both halves independently when one of them has no legal target", async () => {
    const noData = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-046", as: "chamble" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { battleArea: [{ card: "BT1-009", as: "vaccine" }], deck: inertDeck, security: inertSecurity },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    noData.state.memory = 4;
    await noData.ready();
    expect(noData.engine.applyIntent(0, { type: "playCard", instanceId: noData.inst("chamble").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => noData.perm("vaccine").isSuspended);
    await settle();
    expect(noData.perm("vaccine").isSuspended).toBe(true);
    expect(observe(noData.engine).isRestricted(noData.perm("vaccine"), "unsuspend")).toBe(false);

    const noDigimon = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-046", as: "chamble" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    noDigimon.state.memory = 4;
    await noDigimon.ready();
    expect(
      noDigimon.engine.applyIntent(0, { type: "playCard", instanceId: noDigimon.inst("chamble").instanceId }),
    ).toEqual({ ok: true });
    await settle(() =>
      noDigimon.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-046"),
    );
    await settle();
    expect(noDigimon.state.memory).toBe(0);
    expect(noDigimon.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("digivolves from a green Lv.3 for 2, keeps the source, and fires When Digivolving", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-067", as: "base" }],
          hand: [
            { card: "BT19-046", as: "chamble" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "vaccine" },
            { card: "BT1-013", as: "data" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("vaccine").topCard!.instanceId);
    const baseId = s.inst("base").instanceId;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chamble").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-046");
    await settle(() => observe(s.engine).isRestricted(s.perm("data"), "unsuspend"));

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("chamble").instanceId)).toBe(false);
    expect(s.perm("vaccine").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("vaccine"), "unsuspend")).toBe(false);
    expect(s.perm("data").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("data"), "unsuspend")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("refuses an off-color Lv.3 source and leaves the board untouched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-010", as: "redBase" }],
          hand: [{ card: "BT19-046", as: "chamble" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { battleArea: [{ card: "BT1-013", as: "data" }], deck: inertDeck, security: inertSecurity },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    for (const useAlternateCost of [true, false]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("redBase").permanentId,
          instanceId: s.inst("chamble").instanceId,
          useAlternateCost,
        }),
      ).not.toEqual({ ok: true });
    }
    await settle();
    expect(s.perm("redBase").topCard?.cardId).toBe("BT1-010");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-046"]);
    expect(s.state.memory).toBe(5);
    expect(s.perm("data").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("data"), "unsuspend")).toBe(false);
  });

  it("contributes nothing as a digivolution card under a later host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-052", as: "host", under: ["BT1-067", "BT19-046"] }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "data" }],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT1-067", "BT19-046"]);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    await settle();

    expect(s.perm("data").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("data"), "unsuspend")).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(inertSecurity.length - 1);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
