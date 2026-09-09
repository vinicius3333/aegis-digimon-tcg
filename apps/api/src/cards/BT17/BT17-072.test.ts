import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-072.js";
import "./index.js";

const LEVEL_6_AURA = {
  kind: "youHave",
  filter: { controllerDefault: "mine", excludeSelf: true, kind: ["Digimon"], levels: [6] },
  raw: "you have another level 6 Digimon",
};

const SELF_TARGET = { filter: { isSelfRef: true }, count: 1, isSelf: true };

describe("BT17-072 Ornismon", () => {
  it("matches the catalog and the complete IR contract", () => {
    expect(getCardDefinition("BT17-072")).toMatchObject({
      cardId: "BT17-072",
      nameEn: "Ornismon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13000,
      evoCosts: [
        { color: "Purple", level: 5, memoryCost: 5 },
        { color: "Yellow", level: 5, memoryCost: 5 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Ancient Bird"],
      effectText:
        "[On Play] [When Digivolving] Delete 1 of your opponent's unsuspended Digimon.\n[All Turns] While you have another level 6 Digimon, this Digimon gets +2000 DP and gains ＜Security Attack +1＞.",
    });
    expect(getCardDefinition("BT17-072")?.inheritedEffectText).toBeUndefined();
    const deleteAction = {
      kind: "Delete",
      target: { filter: { controller: "opponent", unsuspended: true, kind: ["Digimon"] }, count: 1 },
    };
    expect(compiled.effects).toEqual([
      { trigger: "OnPlay", actions: [deleteAction] },
      { trigger: "WhenDigivolving", actions: [deleteAction] },
      {
        trigger: "AllTurns",
        actions: [
          {
            kind: "Aura",
            target: SELF_TARGET,
            effect: { kind: "modifyDP", amount: 2000 },
            while: LEVEL_6_AURA,
          },
          {
            kind: "Aura",
            target: SELF_TARGET,
            effect: {
              kind: "keyword",
              keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
            },
            while: LEVEL_6_AURA,
          },
        ],
      },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("deletes only the unsuspended target when played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-063", as: "purpleSource" }], hand: [{ card: "BT17-072", as: "ornismon" }] },
        1: {
          battleArea: [
            { card: "BT17-063", as: "ready" },
            { card: "BT17-063", suspended: true, as: "suspended" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 13;
    await s.ready();
    const readyId = s.perm("ready").permanentId;
    const suspendedId = s.perm("suspended").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ornismon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === readyId));

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([suspendedId]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT17-063"]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("deletes nothing on play when every opposing Digimon is suspended", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT17-072", as: "ornismon" }, "BT1-009"] },
        1: { battleArea: [{ card: "BT17-063", suspended: true, as: "suspended" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 13;
    await s.ready();
    const suspendedId = s.perm("suspended").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ornismon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-072"));

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([suspendedId]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(0);
  });

  it.each([
    ["Purple", "BT2-075"],
    ["Yellow", "BT1-057"],
  ])("digivolves from a level 5 %s source for 5 memory and deletes on the way in", async (_color, source) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: source, as: "source" }],
          hand: [{ card: "BT17-072", as: "ornismon" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT17-063", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const sourceInstanceId = s.perm("source").topCard.instanceId;
    const sourcePermanentId = s.perm("source").permanentId;
    const targetId = s.perm("target").permanentId;
    const ornismonId = s.inst("ornismon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: sourcePermanentId,
        instanceId: ornismonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));

    expect(s.perm("source").permanentId).toBe(sourcePermanentId);
    expect(s.perm("source").topCard.instanceId).toBe(ornismonId);
    expect(s.perm("source").stack.map(({ instanceId }) => instanceId)).toEqual([sourceInstanceId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT17-063"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses a level 5 Red source that matches neither digivolution requirement", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-024", as: "metalTyrannomon" }],
        hand: [{ card: "BT17-072", as: "ornismon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("metalTyrannomon").permanentId,
        instanceId: s.inst("ornismon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT17-072"]);
  });

  it("grants +2000 DP and Security Attack +1 while another own level 6 is present, and drops both when it leaves", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-072", as: "ornismon" },
          { card: "BT17-071", as: "otherLevel6" },
        ],
      },
    });
    await s.ready();

    expect(s.perm("ornismon").currentDP).toBe(15000);
    expect(observe(s.engine).hasKeyword(s.perm("ornismon"), "SecurityAttack")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("ornismon"), "SecurityAttack")).toBe(1);

    const otherId = s.perm("otherLevel6").permanentId;
    const player = s.state.players[0]!;
    player.battleArea.splice(
      player.battleArea.findIndex((permanent) => permanent.permanentId === otherId),
      1,
    );
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("ornismon").currentDP).toBe(13000);
    expect(observe(s.engine).hasKeyword(s.perm("ornismon"), "SecurityAttack")).toBe(false);
  });

  it("does not grant the continuous bonuses without another level-6 Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT17-072", as: "ornismon" }] } });
    await s.ready();

    expect(s.perm("ornismon").currentDP).toBe(13000);
    expect(observe(s.engine).hasKeyword(s.perm("ornismon"), "SecurityAttack")).toBe(false);
  });

  it("does not count an opposing level 6 Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-072", as: "ornismon" }] },
      1: { battleArea: [{ card: "BT17-071", as: "opposingLevel6" }] },
    });
    await s.ready();

    expect(s.perm("ornismon").currentDP).toBe(13000);
    expect(observe(s.engine).hasKeyword(s.perm("ornismon"), "SecurityAttack")).toBe(false);
  });

  it("counts only the top card's level: a level 6 in another Digimon's digivolution cards is not another level 6", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-072", as: "ornismon" },
          { card: "BT2-075", as: "nearMiss", under: ["BT17-071"] },
        ],
      },
    });
    await s.ready();

    expect(s.perm("nearMiss").topCard.cardId).toBe("BT2-075");
    expect(s.perm("nearMiss").stack.map((card) => card.cardId)).toEqual(["BT17-071"]);
    expect(s.perm("ornismon").currentDP).toBe(13000);
    expect(observe(s.engine).hasKeyword(s.perm("ornismon"), "SecurityAttack")).toBe(false);

    s.putOnBoard(0, { card: "BT17-071", as: "realLevel6" });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("ornismon").currentDP).toBe(15000);
    expect(observe(s.engine).keywordAmount(s.perm("ornismon"), "SecurityAttack")).toBe(1);
  });

  it("checks two security cards with the granted Security Attack +1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-072", as: "ornismon" },
          { card: "BT17-071", as: "otherLevel6" },
        ],
      },
      1: { security: ["BT1-009", "BT1-011", "BT1-014"] },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("ornismon"), "SecurityAttack")).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ornismon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId).sort()).toEqual([
      "BT17-071",
      "BT17-072",
    ]);
    expect(s.perm("ornismon").isSuspended).toBe(true);
  });
});
