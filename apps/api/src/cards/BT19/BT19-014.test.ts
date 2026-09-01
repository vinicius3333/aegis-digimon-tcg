import { describe, expect, it } from "vitest";
import { digiXrosRequirementFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const materials = ["OmniShoutmon", "ZeigGreymon", "AtlurBallistamon", "JaegerDorulumon", "RaptorSparrowmon"];

describe("BT19-014 Shoutmon EX6", () => {
  it("exposes Alliance, Reboot, and Material Save 4", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT19-014", as: "ex6" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("ex6"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ex6"), "Reboot")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("ex6"), "MaterialSave")).toBe(4);
  });

  it("DigiXroses with all five exact named materials instead of the collapsed recipe", async () => {
    expect(digiXrosRequirementFor("BT19-014")).toEqual([
      { materials: materials.map((name) => ({ names: [name] })), count: 2 },
    ]);
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT19-014", as: "ex6" },
          { card: "BT19-012", as: "omni" },
          { card: "BT19-026", as: "zeig" },
          { card: "BT19-051", as: "atlur" },
          { card: "BT19-038", as: "jaeger" },
          { card: "BT19-061", as: "raptor" },
        ],
      },
    });
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("ex6").instanceId,
        digiXros: {
          materialInstanceIds: ["omni", "zeig", "atlur", "jaeger", "raptor"].map((a) => s.inst(a).instanceId),
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-014"));
    expect(s.perm("ex6").stack).toHaveLength(5);
    expect(s.state.memory).toBe(-1);
  });

  it("naturally resolves On Play after being played from hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-014", as: "ex6" }],
          battleArea: [{ card: "BT19-079", as: "tamer", under: ["BT19-035"] }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ex6").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-035"));

    // The played ShootingStarmon independently gives the opponent's selected
    // Digimon -3000, while this card has no sources to contribute a color penalty.
    expect(s.perm("target").currentDP).toBe(2000);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-035")).toBe(true);
  });

  it("naturally triggers When Attacking against an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-014", as: "ex6" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 12000, suspended: true }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ex6").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("on play counts distinct source colors and plays ShootingStarmon only from under a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-014", as: "ex6", under: ["BT19-012", "BT19-020"] },
            { card: "BT19-079", as: "tamer", under: ["BT5-039"] },
          ],
          hand: [{ card: "BT19-035", as: "handShooting" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 12000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("ex6"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT5-039"));
    expect(s.perm("target").currentDP).toBe(8000);
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT19-035");
  });

  it("when attacking deletes one opposing Digimon at this Digimon's DP boundary", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-014", as: "ex6", dp: 12000 }] },
        1: { battleArea: [{ card: "BT1-009", as: "boundary", dp: 12000 }] },
      },
      { autoSelectCards: true },
    );
    const boundaryId = s.perm("boundary").permanentId;
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("ex6"));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === boundaryId)).toBe(false);
    const negative = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-014", as: "ex6", dp: 12000 }] },
        1: { battleArea: [{ card: "BT1-010", as: "tooLarge", dp: 13000 }] },
      },
      { autoSelectCards: true },
    );
    await advance(negative.engine).fireForPermanent(EffectTiming.OnUseAttack, negative.perm("ex6"));
    expect(negative.perm("tooLarge").currentDP).toBe(13000);
  });
});
